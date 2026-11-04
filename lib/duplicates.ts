import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads, users } from "@/db/schema";

export function normalizeProfileUrl(url?: string | null) {
  if (!url) return null;
  const normalized = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
  return normalized || null;
}

export function normalizeBusinessName(name?: string | null) {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export type DuplicateMatch = {
  id: string;
  businessName: string;
  contactName: string;
  profileUrl: string | null;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  matchedOn: "profile_url" | "business_name";
};

export async function findDuplicateLeads(input: {
  profileUrl?: string | null;
  businessName?: string | null;
  excludeLeadId?: string;
  limit?: number;
}): Promise<DuplicateMatch[]> {
  const normalizedUrl = normalizeProfileUrl(input.profileUrl);
  const businessName = normalizeBusinessName(input.businessName);

  const matches = [];
  if (normalizedUrl) matches.push(eq(leads.profileUrl, normalizedUrl));
  if (businessName) {
    matches.push(sql`lower(${leads.businessName}) = ${businessName}`);
  }
  if (matches.length === 0) return [];

  const filters = [or(...matches), isNull(leads.deletedAt)];
  if (input.excludeLeadId) {
    filters.push(ne(leads.id, input.excludeLeadId));
  }

  const rows = await db
    .select({
      id: leads.id,
      businessName: leads.businessName,
      contactName: leads.contactName,
      profileUrl: leads.profileUrl,
      ownerId: leads.ownerId,
      ownerName: users.fullName,
      ownerEmail: users.email,
    })
    .from(leads)
    .innerJoin(users, eq(leads.ownerId, users.id))
    .where(and(...filters))
    .limit(input.limit ?? 5);

  return rows.map((row) => ({
    ...row,
    matchedOn:
      normalizedUrl && row.profileUrl === normalizedUrl
        ? ("profile_url" as const)
        : ("business_name" as const),
  }));
}
