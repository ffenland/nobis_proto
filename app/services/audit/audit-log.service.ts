import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

export interface AuditLogCreateInput {
  tableName: string;
  recordId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "SOFT_DELETE";
  previousData?: any;
  newData?: any;
  changedBy: string;
  changedByRole: "MANAGER" | "TRAINER" | "MEMBER" | "SYSTEM";
  changedByName?: string;
  reason?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export async function createAuditLog(input: AuditLogCreateInput) {
  const changedFields = getChangedFields(input.previousData, input.newData);

  return await prisma.auditLog.create({
    data: {
      tableName: input.tableName,
      recordId: input.recordId,
      action: input.action,
      previousData: input.previousData || Prisma.JsonNull,
      newData: input.newData || Prisma.JsonNull,
      changedFields: changedFields,
      changedBy: input.changedBy,
      changedByRole: input.changedByRole,
      changedByName: input.changedByName,
      reason: input.reason,
      metadata: input.metadata || Prisma.JsonNull,
      tags: input.tags || [],
    },
  });
}

export async function logPaymentUpdate(params: {
  ptPaymentId: string;
  previousData: any;
  newData: any;
  changedBy: string;
  changedByRole: "MANAGER" | "TRAINER";
  changedByName?: string;
  reason: string;
}) {
  return await createAuditLog({
    tableName: "PtPayment",
    recordId: params.ptPaymentId,
    action: "UPDATE",
    previousData: params.previousData,
    newData: params.newData,
    changedBy: params.changedBy,
    changedByRole: params.changedByRole,
    changedByName: params.changedByName,
    reason: params.reason,
    tags: ["payment", "pt", "manual-update"],
  });
}

export async function getAuditLogs(params: {
  tableName?: string;
  recordId?: string;
  changedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const where: Prisma.AuditLogWhereInput = {};

  if (params.tableName) where.tableName = params.tableName;
  if (params.recordId) where.recordId = params.recordId;
  if (params.changedBy) where.changedBy = params.changedBy;

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = params.startDate;
    if (params.endDate) where.createdAt.lte = params.endDate;
  }

  return await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: params.limit || 50,
  });
}

export async function getPaymentHistory(ptPaymentId: string) {
  return await getAuditLogs({
    tableName: "PtPayment",
    recordId: ptPaymentId,
  });
}

function getChangedFields(
  previousData: any,
  newData: any
): string[] {
  if (!previousData || !newData) return [];

  const changedFields: string[] = [];
  const allKeys = new Set([
    ...Object.keys(previousData || {}),
    ...Object.keys(newData || {}),
  ]);

  for (const key of allKeys) {
    if (previousData[key] !== newData[key]) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

export type AuditLogResult = Awaited<ReturnType<typeof createAuditLog>>;
export type AuditLogListResult = Awaited<ReturnType<typeof getAuditLogs>>;