import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads, users } from "@/db/schema";
import { normalizeProfileUrl } from "./url";

export { ensureHttpUrl, normalizeProfileUrl } from "./url";

export function normalizeBusinessName(name?: string | null) {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export type DuplicateMatch = {
  id: string;
  businessName: string;
  contactName: string;
  profileUrl: string | null;
  profileKey: string | null;
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
  if (normalizedUrl) matches.push(eq(leads.profileKey, normalizedUrl));
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
      profileKey: leads.profileKey,
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
      normalizedUrl && row.profileKey === normalizedUrl
        ? ("profile_url" as const)
        : ("business_name" as const),
  }));
}
