"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { socialPosts } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { getSocialPostById } from "@/lib/social-posts";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import {
  socialPostInputSchema,
  socialPostUpdateSchema,
} from "@/lib/validation";

async function requireActionUser() {
  const user = await getCurrentDbUser();
  if (!user) throw new ActionError("You must be signed in.");
  if (user.status !== "active") throw new ActionError("Your account is not active.");
  return user;
}

function enforceRateLimit(userId: string, action: string) {
  const result = checkRateLimit(rateLimitKey(userId, action), 40, 60_000);
  if (!result.ok) {
    throw new ActionError("Too many changes. Please wait a moment and try again.");
  }
}

function revalidatePosts() {
  revalidatePath("/posts");
  revalidatePath("/admin/posts");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function createPost(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "post:create");

    const data = socialPostInputSchema.parse(input);

    const [created] = await db
      .insert(socialPosts)
      .values({
        authorId: user.id,
        title: data.title,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
      })
      .returning({ id: socialPosts.id });

    await recordAudit({
      userId: user.id,
      action: "post_created",
      entity: "social_post",
      entityId: created.id,
      details: { title: data.title },
    });

    revalidatePosts();
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    return toActionError(error) as ActionResult<{ id: string }>;
  }
}

export async function updatePost(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "post:update");

    const data = socialPostUpdateSchema.parse(input);
    const existing = await getSocialPostById(data.id);
    if (!existing) throw new ActionError("Post not found.");
    if (user.role !== "admin" && existing.authorId !== user.id) {
      throw new ActionError("You do not have access to this post.");
    }

    await db
      .update(socialPosts)
      .set({
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.linkUrl !== undefined ? { linkUrl: data.linkUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, existing.id));

    await recordAudit({
      userId: user.id,
      action: "post_updated",
      entity: "social_post",
      entityId: existing.id,
      details: { title: data.title ?? existing.title },
    });

    revalidatePosts();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "post:delete");
    const id = z.string().uuid().parse(postId);

    const existing = await getSocialPostById(id);
    if (!existing) throw new ActionError("Post not found.");
    if (user.role !== "admin" && existing.authorId !== user.id) {
      throw new ActionError("You do not have access to this post.");
    }

    await db
      .update(socialPosts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(socialPosts.id, id));

    await recordAudit({
      userId: user.id,
      action: "post_deleted",
      entity: "social_post",
      entityId: id,
      details: { title: existing.title },
    });

    revalidatePosts();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
