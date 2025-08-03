import prisma from '@/app/lib/prisma';
import { AuditAction, Prisma } from '@prisma/client';

// 변경 전/후 데이터를 담는 타입
export interface ActionDetails {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  itemType?: 'MACHINE' | 'FREE' | 'STRETCHING';
  exerciseId?: string;
  [key: string]: unknown;
}

// 타입 정의 (서비스 파일에서 관리)
export interface CreateAuditLogInput {
  trainerId: string;
  ptRecordId: string;
  ptRecordItemId?: string;
  action: AuditAction;
  actionDetails?: Prisma.InputJsonValue | null;
  scheduledTime: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// 정상 작업 시간 검증 함수
export function isWithinAllowedTime(
  scheduledTime: Date, 
  currentTime: Date,
  action: 'record' | 'edit'
): boolean {
  const diffMinutes = (currentTime.getTime() - scheduledTime.getTime()) / (1000 * 60);
  
  // 미래 날짜 체크 (오늘 이후의 날짜는 비정상)
  const today = new Date(currentTime);
  today.setHours(23, 59, 59, 999);
  if (scheduledTime > today) {
    return false; // 미래 날짜는 항상 비정상
  }
  
  if (action === 'record') {
    // 기록은 세션 시작 30분 전부터 세션 종료 1시간 후까지
    return diffMinutes >= -30 && diffMinutes <= 60;
  } else {
    // 수정은 세션 시작 5분 전부터 세션 종료 1시간 후까지
    return diffMinutes >= -5 && diffMinutes <= 60;
  }
}

// 감사 로그 생성 (select만 사용)
export async function createAuditLog(input: CreateAuditLogInput) {
  const currentTime = new Date();
  const isOutOfTime = !isWithinAllowedTime(
    input.scheduledTime, 
    currentTime, 
    input.action.includes('CREATE') ? 'record' : 'edit'
  );

  // 구체적인 비정상 사유 판단
  let notes: string | undefined;
  if (isOutOfTime) {
    const today = new Date(currentTime);
    today.setHours(23, 59, 59, 999);
    
    if (input.scheduledTime > today) {
      const daysInFuture = Math.ceil((input.scheduledTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
      notes = `미래 날짜 기록 (${daysInFuture}일 후)`;
    } else {
      const diffMinutes = (currentTime.getTime() - input.scheduledTime.getTime()) / (1000 * 60);
      if (diffMinutes < 0) {
        notes = `세션 시작 전 작업 (${Math.abs(Math.round(diffMinutes))}분 전)`;
      } else {
        notes = `세션 종료 후 작업 (${Math.round(diffMinutes)}분 후)`;
      }
    }
  }

  return await prisma.ptRecordAuditLog.create({
    data: {
      trainerId: input.trainerId,
      ptRecordId: input.ptRecordId,
      ptRecordItemId: input.ptRecordItemId,
      action: input.action,
      actionDetails: input.actionDetails === null ? Prisma.JsonNull : input.actionDetails,
      scheduledTime: input.scheduledTime,
      isOutOfTime,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      notes,
    },
    select: {
      id: true,
      createdAt: true,
      action: true,
      isOutOfTime: true,
    }
  });
}

// 타입 추론
export type CreateAuditLogResult = Awaited<ReturnType<typeof createAuditLog>>;

// 감사 로그 조회 (매니저용)
export interface GetAuditLogsParams {
  trainerId?: string;
  startDate?: Date;
  endDate?: Date;
  onlyOutOfTime?: boolean;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(params: GetAuditLogsParams) {
  const where: Prisma.PtRecordAuditLogWhereInput = {
    // 필수 관계가 모두 존재하는 로그만 조회
    ptRecord: {
      pt: {
        member: {
          isNot: null
        }
      }
    }
  };
  
  if (params.trainerId) {
    where.trainerId = params.trainerId;
  }
  
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) {
      where.createdAt.gte = params.startDate;
    }
    if (params.endDate) {
      where.createdAt.lte = params.endDate;
    }
  }
  
  if (params.onlyOutOfTime) {
    where.isOutOfTime = true;
  }
  
  if (params.action) {
    where.action = params.action;
  }

  const [logs, total] = await Promise.all([
    prisma.ptRecordAuditLog.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        action: true,
        actionDetails: true,
        isOutOfTime: true,
        scheduledTime: true,
        notes: true,
        ipAddress: true,
        trainer: {
          select: {
            id: true,
            user: {
              select: {
                username: true,
              }
            }
          }
        },
        ptRecord: {
          select: {
            id: true,
            pt: {
              select: {
                member: {
                  select: {
                    user: {
                      select: {
                        username: true,
                      }
                    }
                  }
                }
              }
            },
            ptSchedule: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
              }
            }
          }
        },
        ptRecordItemId: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.ptRecordAuditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    limit: params.limit || 50,
    offset: params.offset || 0,
  };
}

export type GetAuditLogsResult = Awaited<ReturnType<typeof getAuditLogs>>;
export type AuditLog = GetAuditLogsResult['logs'][0];