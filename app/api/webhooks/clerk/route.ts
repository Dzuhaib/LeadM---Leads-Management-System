import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/db";
import { users } from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";

type ClerkEmail = {
  id: string;
  email_address: string;
  verification?: { status?: string } | null;
};
type ClerkUserPayload = {
  id: string;
  email_addresses?: ClerkEmail[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};
type ClerkEvent = {
  type: string;
  data: ClerkUserPayload;
};

function resolveEmail(data: ClerkUserPayload) {
  const primary =
    data.email_addresses?.find(
      (entry) => entry.id === data.primary_email_address_id,
    ) ?? data.email_addresses?.[0];
  return {
    email: primary?.email_address ?? `${data.id}@unknown.local`,
    verified: primary?.verification?.status === "verified",
  };
}

function resolveName(data: ClerkUserPayload, email: string) {
  return (
    [data.first_name, data.last_name].filter(Boolean).join(" ") ||
    email.split("@")[0]
  );
}

function isAdminEmail(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(adminEmail && email.trim().toLowerCase() === adminEmail);
}

async function syncRoleMetadata(clerkId: string, role: "admin" | "employee") {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkId, {
      publicMetadata: { role },
    });
  } catch {
    console.error("Could not update Clerk public metadata.");
  }
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret is not configured.", { status: 500 });
  }

  const payload = await request.text();
  const headerStore = await headers();
  const svixHeaders = {
    "svix-id": headerStore.get("svix-id") ?? "",
    "svix-timestamp": headerStore.get("svix-timestamp") ?? "",
    "svix-signature": headerStore.get("svix-signature") ?? "",
  };

  try {
    new Webhook(secret).verify(payload, svixHeaders);
  } catch {
    return new Response("Invalid webhook signature.", { status: 400 });
  }

  let event: ClerkEvent;
  try {
    event = JSON.parse(payload) as ClerkEvent;
  } catch {
    return new Response("Invalid webhook payload.", { status: 400 });
  }

  const data = event.data;
  if (!data?.id) {
    return new Response("Missing user id.", { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const { email, verified } = resolveEmail(data);
    const fullName = resolveName(data, email);
    const role = verified && isAdminEmail(email) ? "admin" : "employee";
    const requireApproval =
      role === "employee"
        ? await getSettings()
            .then((row) => row.requireApproval)
            .catch(() => false)
        : false;
    const status =
      role === "admin" || !requireApproval ? "active" : "pending";

    const existing = await db
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.clerkId, data.id))
      .limit(1);

    if (existing[0]) {
      await db
        .update(users)
        .set({
          email,
          fullName,
          avatarUrl: data.image_url ?? null,
          ...(role === "admin" ? { role: "admin", status: "active" } : {}),
        })
        .where(eq(users.id, existing[0].id));

      if (existing[0].role !== role) {
        await recordAudit({
          action: "role_changed",
          entity: "user",
          entityId: existing[0].id,
          details: { from: existing[0].role, to: role, via: "webhook" },
        });
        await syncRoleMetadata(data.id, role);
      }
    } else {
      await db
        .insert(users)
        .values({
          clerkId: data.id,
          email,
          fullName,
          avatarUrl: data.image_url ?? null,
          role,
          status,
        })
        .onConflictDoNothing({ target: users.clerkId });

      await syncRoleMetadata(data.id, role);

      await recordAudit({
        action: "user_created",
        entity: "user",
        details: { clerkId: data.id, role },
      });
    }
  }

  if (event.type === "user.deleted") {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, data.id))
      .limit(1);

    if (existing[0]) {
      await db
        .update(users)
        .set({ status: "deactivated" })
        .where(eq(users.id, existing[0].id));

      await recordAudit({
        userId: existing[0].id,
        action: "user_deleted",
        entity: "user",
        entityId: existing[0].id,
        details: { via: "webhook" },
      });
    }
  }

  return new Response("ok", { status: 200 });
}
