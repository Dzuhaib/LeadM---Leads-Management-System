import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { getSettings } from "./settings";

function isAdminEmail(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !email) return false;
  return email.trim().toLowerCase() === adminEmail;
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

export async function getCurrentDbUser(): Promise<User | null> {
  let clerkId: string | null = null;
  try {
    const session = await auth();
    clerkId = session.userId;
  } catch {
    return null;
  }
  if (!clerkId) return null;

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (rows[0]) {
    let user = rows[0];
    if (isAdminEmail(user.email) && (user.role !== "admin" || user.status !== "active")) {
      const [updated] = await db
        .update(users)
        .set({ role: "admin", status: "active" })
        .where(eq(users.id, user.id))
        .returning();
      if (updated) {
        user = updated;
        await syncRoleMetadata(user.clerkId, "admin");
      }
    }
    return user;
  }

  let clerkUser;
  try {
    clerkUser = await currentUser();
  } catch {
    return null;
  }
  if (!clerkUser) return null;

  const primaryEmail =
    clerkUser.emailAddresses.find(
      (entry) => entry.id === clerkUser.primaryEmailAddressId,
    ) ?? clerkUser.emailAddresses[0];
  const email = primaryEmail?.emailAddress ?? `${clerkId}@unknown.local`;
  const verified = primaryEmail?.verification?.status === "verified";
  const fullName =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email;
  const role: "admin" | "employee" =
    verified && isAdminEmail(email) ? "admin" : "employee";

  let requireApproval = false;
  try {
    const appSettings = await getSettings();
    requireApproval = appSettings.requireApproval;
  } catch {
    requireApproval = false;
  }

  const status =
    role === "admin" ? "active" : requireApproval ? "pending" : "active";

  const [created] = await db
    .insert(users)
    .values({
      clerkId,
      email,
      fullName,
      avatarUrl: clerkUser.imageUrl ?? null,
      role,
      status,
      lastSeenAt: new Date(),
    })
    .onConflictDoNothing({ target: users.clerkId })
    .returning();

  await syncRoleMetadata(clerkId, role);

  if (created) return created;

  const fallback = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return fallback[0] ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireActiveUser(): Promise<User> {
  const user = await requireUser();
  if (user.status === "pending") redirect("/pending");
  if (user.status === "deactivated") redirect("/pending?state=deactivated");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireActiveUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export function homePathFor(user: Pick<User, "role">) {
  return user.role === "admin" ? "/admin" : "/dashboard";
}
