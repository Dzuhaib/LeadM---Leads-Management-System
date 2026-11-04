import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, users } from "@/db/schema";

type AuditInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
};

export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
  actorName: string | null;
  actorEmail: string | null;
};

export async function listAuditEntries({
  page = 1,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
} = {}) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(pageSize, 10), 100);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        details: auditLog.details,
        createdAt: auditLog.createdAt,
        actorName: users.fullName,
        actorEmail: users.email,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    db.select({ value: count() }).from(auditLog),
  ]);

  const total = totalRow[0]?.value ?? 0;
  return {
    rows: rows as AuditEntry[],
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

export async function recordAudit(input: AuditInput) {
  try {
    await db.insert(auditLog).values({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      details: input.details,
    });
  } catch {
    console.error("Failed to write audit log entry.");
  }
}
