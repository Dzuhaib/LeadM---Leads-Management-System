"use server";

import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth";

export async function syncProfileFromClerk() {
  const [user, clerkUser] = await Promise.all([
    getCurrentDbUser(),
    currentUser(),
  ]);

  if (!user || !clerkUser) {
    return { synced: false };
  }

  const fullName =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    user.fullName;
  const avatarUrl = clerkUser.imageUrl || null;

  if (fullName === user.fullName && avatarUrl === user.avatarUrl) {
    return { synced: false };
  }

  await db
    .update(users)
    .set({ fullName, avatarUrl })
    .where(eq(users.id, user.id));

  revalidatePath("/", "layout");

  return { synced: true };
}
