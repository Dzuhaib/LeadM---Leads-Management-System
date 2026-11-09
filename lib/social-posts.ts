import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { socialPosts, users } from "@/db/schema";
import type { SocialPostListParams } from "./validation";

export type SocialPostRow = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
  authorAvatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SocialPostListResult = {
  rows: SocialPostRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listSocialPosts(
  params: SocialPostListParams,
  options: { authorId?: string } = {},
): Promise<SocialPostListResult> {
  const filters: SQL[] = [isNull(socialPosts.deletedAt)];

  if (options.authorId) filters.push(eq(socialPosts.authorId, options.authorId));
  if (params.author) filters.push(eq(socialPosts.authorId, params.author));

  if (params.q) {
    const query = `%${params.q}%`;
    filters.push(
      or(
        ilike(socialPosts.title, query),
        ilike(users.fullName, query),
        ilike(users.email, query),
      )!,
    );
  }

  const where = and(...filters);
  const sortColumn =
    params.sort === "title" ? socialPosts.title : socialPosts.createdAt;
  const order = params.dir === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (params.page - 1) * params.pageSize;

  const base = db
    .select({
      id: socialPosts.id,
      title: socialPosts.title,
      imageUrl: socialPosts.imageUrl,
      linkUrl: socialPosts.linkUrl,
      authorId: socialPosts.authorId,
      authorName: users.fullName,
      authorEmail: users.email,
      authorAvatarUrl: users.avatarUrl,
      createdAt: socialPosts.createdAt,
      updatedAt: socialPosts.updatedAt,
    })
    .from(socialPosts)
    .innerJoin(users, eq(socialPosts.authorId, users.id));

  const [rows, totalRows] = await Promise.all([
    base.where(where).orderBy(order).limit(params.pageSize).offset(offset),
    db
      .select({ value: count() })
      .from(socialPosts)
      .innerJoin(users, eq(socialPosts.authorId, users.id))
      .where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    rows,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getSocialPostById(id: string) {
  const rows = await db
    .select()
    .from(socialPosts)
    .where(and(eq(socialPosts.id, id), isNull(socialPosts.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSocialPostAuthors() {
  return db
    .selectDistinct({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
    })
    .from(socialPosts)
    .innerJoin(users, eq(socialPosts.authorId, users.id))
    .where(isNull(socialPosts.deletedAt))
    .orderBy(asc(users.fullName));
}
