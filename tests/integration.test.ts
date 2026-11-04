import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import ExcelJS from "exceljs";

const clerkState = vi.hoisted(() => ({
  clerkId: null as string | null,
  currentUser: null as null | {
    id: string;
    emailAddresses: {
      id: string;
      emailAddress: string;
      verification: { status: string } | null;
    }[];
    primaryEmailAddressId: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    imageUrl: string | null;
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: clerkState.clerkId }),
  currentUser: async () => clerkState.currentUser,
  clerkClient: async () => ({
    users: { updateUserMetadata: async () => undefined },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
  revalidateTag: () => undefined,
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

import { db } from "@/db";
import { activities, leads, settings, users } from "@/db/schema";
import {
  bulkUpdateLeadStatus,
  createLead,
  deleteLead,
  getLeadDetail,
  updateLead,
} from "@/actions/leads";
import { updateEmployeeStatus } from "@/actions/admin";
import {
  logFirstMessage,
  logFollowUp,
  logReply,
} from "@/actions/activities";
import {
  getCurrentDbUser,
  requireActiveUser,
  requireAdmin,
} from "@/lib/auth";
import {
  getAdminDashboard,
  listAdminNoReplies,
  listAdminReplies,
} from "@/lib/admin";
import { getEmployeeDashboard } from "@/lib/dashboard";
import { findDuplicateLeads } from "@/lib/duplicates";
import { getNoReplyLeads } from "@/lib/leads";
import { importLeadsFromFile } from "@/lib/import-server";
import { buildEmployeeWorkbook } from "@/lib/excel-export";
import { getSettings } from "@/lib/settings";

const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;
const DAY = 86_400_000;

async function resetDatabase() {
  await db.execute(
    sql`truncate table audit_log, activities, leads, message_templates, settings, users restart identity cascade`,
  );
  await db.insert(settings).values({
    timezone: "UTC",
    followUpDays: [3, 7, 14],
    noReplyAfterDays: 14,
    requireApproval: false,
  });
}

async function createUser(overrides: {
  email: string;
  fullName: string;
  role?: "admin" | "employee";
  status?: "active" | "pending" | "deactivated";
}) {
  const [user] = await db
    .insert(users)
    .values({
      clerkId: `user_${randomUUID()}`,
      email: overrides.email,
      fullName: overrides.fullName,
      role: overrides.role ?? "employee",
      status: overrides.status ?? "active",
    })
    .returning();
  return user;
}

async function insertLead(ownerId: string, overrides: Record<string, unknown> = {}) {
  const [lead] = await db
    .insert(leads)
    .values({
      ownerId,
      businessName: overrides.businessName as string,
      contactName: (overrides.contactName as string) ?? "",
      profileUrl: (overrides.profileUrl as string) ?? null,
      status: (overrides.status as "new") ?? "new",
      ...overrides,
    })
    .returning();
  return lead;
}

function csvForm(csv: string) {
  const form = new FormData();
  form.append("file", new File([csv], "leads.csv", { type: "text/csv" }));
  form.append(
    "mapping",
    JSON.stringify({
      businessName: 0,
      contactName: 1,
      profileUrl: 2,
      channel: 3,
      status: 4,
      servicePitched: 5,
    }),
  );
  return form;
}

describeDb("database-backed acceptance rules", () => {
  beforeEach(async () => {
    await resetDatabase();
    process.env.ADMIN_EMAIL = "admin@example.com";
    clerkState.currentUser = null;
    clerkState.clerkId = null;
  });

  afterAll(async () => {
    const client = (db as unknown as { $client: { end: () => Promise<void> } })
      .$client;
    await client.end();
  });

  it("assigns roles, honours approval, and blocks deactivated users", async () => {
    clerkState.clerkId = "user_employee_new";
    clerkState.currentUser = {
      id: "user_employee_new",
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "employee@example.com",
          verification: { status: "verified" },
        },
      ],
      primaryEmailAddressId: "email_1",
      firstName: "New",
      lastName: "Employee",
      fullName: "New Employee",
      imageUrl: null,
    };

    const employee = await getCurrentDbUser();
    expect(employee?.role).toBe("employee");
    expect(employee?.status).toBe("active");

    await db.update(settings).set({ requireApproval: true });
    clerkState.clerkId = "user_employee_pending";
    clerkState.currentUser = {
      ...clerkState.currentUser,
      id: "user_employee_pending",
      emailAddresses: [
        {
          id: "email_2",
          emailAddress: "pending@example.com",
          verification: { status: "verified" },
        },
      ],
      primaryEmailAddressId: "email_2",
    };

    const pending = await getCurrentDbUser();
    expect(pending?.status).toBe("pending");
    clerkState.clerkId = pending?.clerkId ?? null;
    await expect(requireActiveUser()).rejects.toThrow("redirect:/pending");

    clerkState.clerkId = "user_admin_new";
    clerkState.currentUser = {
      ...clerkState.currentUser,
      id: "user_admin_new",
      emailAddresses: [
        {
          id: "email_3",
          emailAddress: "admin@example.com",
          verification: { status: "verified" },
        },
      ],
      primaryEmailAddressId: "email_3",
    };

    const admin = await getCurrentDbUser();
    expect(admin?.role).toBe("admin");
    expect(admin?.status).toBe("active");

    const deactivated = await createUser({
      email: "deactivated@example.com",
      fullName: "Deactivated",
      status: "deactivated",
    });
    clerkState.clerkId = deactivated.clerkId;
    await expect(requireActiveUser()).rejects.toThrow(
      "redirect:/pending?state=deactivated",
    );
  });

  it("finds duplicates across the team, including normalized URLs", async () => {
    const employeeA = await createUser({
      email: "a@example.com",
      fullName: "Employee A",
    });
    const employeeB = await createUser({
      email: "b@example.com",
      fullName: "Employee B",
    });
    const owned = await insertLead(employeeA.id, {
      businessName: "Acme Corp",
      profileUrl: "linkedin.com/in/jane-doe",
    });
    await insertLead(employeeB.id, {
      businessName: "Deleted Co",
      profileUrl: "linkedin.com/in/deleted",
      deletedAt: new Date(),
    });

    const byUrl = await findDuplicateLeads({
      profileUrl: "https://www.LinkedIn.com/in/Jane-Doe/?trk=abc",
    });
    expect(byUrl).toHaveLength(1);
    expect(byUrl[0]?.id).toBe(owned.id);
    expect(byUrl[0]?.ownerEmail).toBe("a@example.com");
    expect(byUrl[0]?.matchedOn).toBe("profile_url");

    const byName = await findDuplicateLeads({ businessName: "  acme   corp " });
    expect(byName[0]?.id).toBe(owned.id);

    const deleted = await findDuplicateLeads({
      profileUrl: "linkedin.com/in/deleted",
    });
    expect(deleted).toHaveLength(0);

    clerkState.clerkId = employeeB.clerkId;
    const blocked = await createLead({
      businessName: "Acme Corp",
      contactName: "Copycat",
      channel: "linkedin",
      servicePitched: "AI Systems",
      profileUrl: "https://www.linkedin.com/in/jane-doe/",
    });
    expect(blocked.ok).toBe(false);

    const admin = await createUser({
      email: "admin@example.com",
      fullName: "Admin",
      role: "admin",
    });
    clerkState.clerkId = admin.clerkId;
    const allowed = await createLead({
      businessName: "Acme Corp",
      contactName: "Allowed duplicate",
      channel: "linkedin",
      servicePitched: "AI Systems",
      profileUrl: "https://www.linkedin.com/in/jane-doe/",
      allowDuplicate: true,
    });
    expect(allowed.ok).toBe(true);
  });

  it("scopes employee dashboards while admin sees per-employee aggregates", async () => {
    const employeeA = await createUser({
      email: "a@example.com",
      fullName: "Employee A",
    });
    const employeeB = await createUser({
      email: "b@example.com",
      fullName: "Employee B",
    });
    const leadA = await insertLead(employeeA.id, {
      businessName: "A Lead",
      status: "replied",
    });
    const leadB = await insertLead(employeeB.id, {
      businessName: "B Lead",
      status: "contacted",
    });
    const now = new Date();

    await db.insert(activities).values([
      {
        leadId: leadA.id,
        userId: employeeA.id,
        type: "dm_sent",
        channel: "linkedin",
        occurredAt: now,
      },
      {
        leadId: leadA.id,
        userId: employeeA.id,
        type: "follow_up_3",
        channel: "linkedin",
        occurredAt: new Date(now.getTime() - DAY),
      },
      {
        leadId: leadA.id,
        userId: employeeA.id,
        type: "reply_received",
        channel: "linkedin",
        occurredAt: now,
        replyText: "Interested",
        replyTag: "interested",
      },
      {
        leadId: leadB.id,
        userId: employeeB.id,
        type: "dm_sent",
        channel: "whatsapp",
        occurredAt: now,
      },
    ]);

    const range = {
      from: new Date(now.getTime() - 7 * DAY),
      to: new Date(now.getTime() + DAY),
    };
    const employee = await getEmployeeDashboard(employeeA.id, range, "UTC");
    expect(employee.totals.messages).toBe(2);
    expect(employee.totals.replies).toBe(1);
    expect(employee.totals.replyRate).toBe(50);
    expect(employee.totals.newLeads).toBe(1);
    expect(
      employee.channels.some((row) => row.channel === "whatsapp"),
    ).toBe(false);

    const base = await getAdminDashboard({ range, timeZone: "UTC" });
    expect(base.totals.messages).toBe(3);
    expect(base.totals.replies).toBe(1);
    expect(base.performance.find((row) => row.id === employeeA.id)?.messages).toBe(
      2,
    );
    expect(base.performance.find((row) => row.id === employeeB.id)?.messages).toBe(
      1,
    );
    const todayKey = now.toISOString().slice(0, 10);
    const yesterdayKey = new Date(now.getTime() - DAY)
      .toISOString()
      .slice(0, 10);
    const todayRow = base.dailyByEmployee.find(
      (row) => row.day === todayKey,
    );
    const yesterdayRow = base.dailyByEmployee.find(
      (row) => row.day === yesterdayKey,
    );
    expect(todayRow?.[employeeA.id]).toBe(1);
    expect(yesterdayRow?.[employeeA.id]).toBe(1);
    expect(todayRow?.[employeeB.id]).toBe(1);

    const scoped = await getAdminDashboard({
      range,
      timeZone: "UTC",
      employeeId: employeeB.id,
    });
    expect(scoped.totals.messages).toBe(1);
    expect(scoped.totals.replies).toBe(0);
    expect(scoped.members.map((member) => member.id)).toEqual([employeeB.id]);
  });

  it("advances follow-ups and stops the sequence on reply", async () => {
    const employee = await createUser({
      email: "a@example.com",
      fullName: "Employee A",
    });
    const lead = await insertLead(employee.id, { businessName: "Sequence Co" });
    clerkState.clerkId = employee.clerkId;

    expect((await logFirstMessage({ leadId: lead.id })).ok).toBe(true);
    let [row] = await db.select().from(leads).where(sql`id = ${lead.id}`);
    expect(row?.status).toBe("contacted");
    expect(row?.followUpStage).toBe(0);
    expect(row?.nextFollowUpAt).not.toBeNull();

    expect((await logFollowUp({ leadId: lead.id })).ok).toBe(true);
    [row] = await db.select().from(leads).where(sql`id = ${lead.id}`);
    expect(row?.followUpStage).toBe(1);

    expect((await logFollowUp({ leadId: lead.id })).ok).toBe(true);
    [row] = await db.select().from(leads).where(sql`id = ${lead.id}`);
    expect(row?.followUpStage).toBe(2);

    expect((await logFollowUp({ leadId: lead.id })).ok).toBe(true);
    [row] = await db.select().from(leads).where(sql`id = ${lead.id}`);
    expect(row?.followUpStage).toBe(3);
    expect(row?.nextFollowUpAt).toBeNull();

    const closed = await logFollowUp({ leadId: lead.id });
    expect(closed.ok).toBe(false);

    const reply = await logReply({
      leadId: lead.id,
      replyText: "Interested, send details.",
      replyTag: "interested",
    });
    expect(reply.ok).toBe(true);
    [row] = await db.select().from(leads).where(sql`id = ${lead.id}`);
    expect(row?.status).toBe("replied");
    expect(row?.nextFollowUpAt).toBeNull();

    const feed = await listAdminReplies(
      { tab: "replies", sort: "newest" },
      "UTC",
    );
    expect(feed).toHaveLength(1);
    expect(feed[0]?.replyText).toBe("Interested, send details.");
    expect(feed[0]?.employeeEmail).toBe("a@example.com");
  });

  it("rejects cross-employee lead reads and writes", async () => {
    const employeeA = await createUser({
      email: "a@example.com",
      fullName: "Employee A",
    });
    const employeeB = await createUser({
      email: "b@example.com",
      fullName: "Employee B",
    });
    const admin = await createUser({
      email: "admin@example.com",
      fullName: "Admin",
      role: "admin",
    });
    const leadB = await insertLead(employeeB.id, {
      businessName: "B Lead",
      status: "contacted",
    });

    clerkState.clerkId = employeeA.clerkId;

    const update = await updateLead({
      id: leadB.id,
      businessName: "Hijacked",
    });
    expect(update.ok).toBe(false);
    expect(await db.select().from(leads).where(sql`id = ${leadB.id}`)).toMatchObject([
      { businessName: "B Lead" },
    ]);

    const detail = await getLeadDetail(leadB.id);
    expect(detail.ok).toBe(false);

    const removed = await deleteLead(leadB.id);
    expect(removed.ok).toBe(false);

    const bulk = await bulkUpdateLeadStatus({
      leadIds: [leadB.id],
      status: "won",
    });
    expect(bulk.ok).toBe(false);
    const [stillThere] = await db
      .select()
      .from(leads)
      .where(sql`id = ${leadB.id}`);
    expect(stillThere?.status).toBe("contacted");
    expect(stillThere?.deletedAt).toBeNull();

    const adminAction = await updateEmployeeStatus({
      userId: employeeB.id,
      status: "deactivated",
    });
    expect(adminAction.ok).toBe(false);
    await expect(requireAdmin()).rejects.toThrow("redirect:/dashboard");

    clerkState.clerkId = admin.clerkId;
    const allowed = await updateLead({
      id: leadB.id,
      businessName: "Admin Edit",
    });
    expect(allowed.ok).toBe(true);
    const [edited] = await db
      .select()
      .from(leads)
      .where(sql`id = ${leadB.id}`);
    expect(edited?.businessName).toBe("Admin Edit");
  });

  it("imports valid rows, skips duplicates, and reports failed rows", async () => {
    const employee = await createUser({
      email: "a@example.com",
      fullName: "Employee A",
    });
    await insertLead(employee.id, { businessName: "Acme", status: "contacted" });

    const csv = [
      "Business Name,Contact Name,Profile URL,Channel,Status,Service Pitched",
      "Success Co,Jane,https://linkedin.com/in/success,linkedin,contacted,AI Systems",
      "Acme,Existing,https://linkedin.com/in/acme,linkedin,new,AI Systems",
      "Bad Channel Co,Bob,https://linkedin.com/in/bad,myspace,new,AI Systems",
      "Success Co,Jane Again,https://linkedin.com/in/success-2,linkedin,new,AI Systems",
      " ,No Business,,linkedin,new,AI Systems",
    ].join("\n");

    const result = await importLeadsFromFile(csvForm(csv), employee.id);
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(2);
    expect(result.failed).toBe(2);
    expect(result.failedRows.filter((row) => row.kind === "skipped")).toHaveLength(
      2,
    );
    expect(result.failedRows.filter((row) => row.kind === "failed")).toHaveLength(
      2,
    );

    const imported = await db
      .select()
      .from(leads)
      .where(sql`${leads.businessName} = 'Success Co'`);
    expect(imported).toHaveLength(1);
    expect(imported[0]?.ownerId).toBe(employee.id);

    const buffer = await buildEmployeeWorkbook({
      leads: imported.map((lead) => ({
        businessName: lead.businessName,
        contactName: lead.contactName,
        jobTitle: lead.jobTitle,
        industry: lead.industry,
        country: lead.country,
        channel: lead.channel,
        source: lead.source,
        profileUrl: lead.profileUrl,
        email: lead.email,
        phone: lead.phone,
        servicePitched: lead.servicePitched,
        status: lead.status,
        nextFollowUpAt: lead.nextFollowUpAt,
        followUpStage: lead.followUpStage,
        notes: lead.notes,
        createdAt: lead.createdAt,
        ownerName: "Employee A",
        ownerEmail: "a@example.com",
      })),
      activities: [],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(workbook.getWorksheet("Leads")?.getCell("A2").value).toBe(
      "Success Co",
    );

    const rerun = await importLeadsFromFile(csvForm(csv), employee.id);
    expect(rerun.created).toBe(0);
    expect(rerun.skipped).toBe(3);
  });

  it("protects the cron route and marks stale leads as no_reply", async () => {
    const employee = await createUser({
      email: "a@example.com",
      fullName: "Employee A",
    });
    const stale = await insertLead(employee.id, {
      businessName: "Stale Lead",
      status: "contacted",
    });
    await db.insert(activities).values({
      leadId: stale.id,
      userId: employee.id,
      type: "dm_sent",
      channel: "linkedin",
      occurredAt: new Date(Date.now() - 30 * DAY),
    });

    process.env.CRON_SECRET = "test-cron-secret";
    const { GET } = await import("@/app/api/cron/daily/route");

    const unauthorized = await GET(
      new Request("http://localhost/api/cron/daily", {
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(unauthorized.status).toBe(401);

    const response = await GET(
      new Request("http://localhost/api/cron/daily", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, updated: 1 });

    const [updated] = await db
      .select()
      .from(leads)
      .where(sql`id = ${stale.id}`);
    expect(updated?.status).toBe("no_reply");
    expect(updated?.nextFollowUpAt).toBeNull();

    const settingsRow = await getSettings();
    expect(settingsRow.timezone).toBe("UTC");

    const employeeNoReply = await getNoReplyLeads(employee.id);
    expect(employeeNoReply.map((row) => row.id)).toContain(stale.id);
    const adminNoReply = await listAdminNoReplies(
      { tab: "no_reply", sort: "oldest" },
      "UTC",
    );
    expect(adminNoReply.map((row) => row.id)).toContain(stale.id);
  });
});

