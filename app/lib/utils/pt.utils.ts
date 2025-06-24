// app/lib/utils/pt.utils.ts

// 출석 상태 타입 정의
export type AttendanceStatus = "RESERVED" | "ATTENDED" | "ABSENT";

// PtRecord와 연관 데이터 타입 (최소 필요 정보만)
export interface IPtRecordForAttendance {
  ptSchedule: {
    date: string | Date;
    startTime: number;
  };
  items: Array<{ id: string }>; // 운동 기록 아이템들
}

/**
 * PtRecord의 출석 상태를 자동으로 계산합니다.
 *
 * 계산 로직:
 * 1. 수업 시작 시간이 현재 시간보다 미래 → RESERVED
 * 2. 수업 시작 시간이 지났고 운동 기록(items)이 있음 → ATTENDED
 * 3. 수업 시작 시간이 지났고 운동 기록이 없음 → ABSENT
 */
export function calculateAttendanceStatus(
  record: IPtRecordForAttendance,
  currentTime: Date = new Date()
): AttendanceStatus {
  // 수업 날짜와 시간 조합
  const scheduleDate = new Date(record.ptSchedule.date);
  const scheduleDateTime = new Date(scheduleDate);

  // startTime을 시:분으로 변환 (예: 1430 → 14:30)
  const hours = Math.floor(record.ptSchedule.startTime / 100);
  const minutes = record.ptSchedule.startTime % 100;

  scheduleDateTime.setHours(hours, minutes, 0, 0);

  // 현재 시간과 비교
  const isSchedulePassed = currentTime >= scheduleDateTime;
  const hasExerciseItems = record.items.length > 0;

  if (!isSchedulePassed) {
    return "RESERVED"; // 아직 수업 시간이 되지 않음
  } else if (hasExerciseItems) {
    return "ATTENDED"; // 수업 완료 + 운동 기록 존재
  } else {
    return "ABSENT"; // 수업 시간 지남 + 운동 기록 없음
  }
}

/**
 * 출석 상태에 따른 UI 표시 정보를 반환합니다.
 */
export function getAttendanceDisplayInfo(status: AttendanceStatus) {
  switch (status) {
    case "ATTENDED":
      return { text: "완료", variant: "success" as const };
    case "ABSENT":
      return { text: "결석", variant: "error" as const };
    case "RESERVED":
      return { text: "예정", variant: "default" as const };
    default:
      return { text: "미정", variant: "default" as const };
  }
}

/**
 * 여러 PtRecord의 출석 상태를 일괄 계산합니다.
 */
export function calculateBulkAttendanceStatus(
  records: IPtRecordForAttendance[],
  currentTime: Date = new Date()
): Array<{ recordIndex: number; status: AttendanceStatus }> {
  return records.map((record, index) => ({
    recordIndex: index,
    status: calculateAttendanceStatus(record, currentTime),
  }));
}

/**
 * 특정 기간 내 출석 통계를 계산합니다.
 */
export function calculateAttendanceStats(
  records: IPtRecordForAttendance[],
  currentTime: Date = new Date()
) {
  const statuses = records.map((record) =>
    calculateAttendanceStatus(record, currentTime)
  );

  const attended = statuses.filter((s) => s === "ATTENDED").length;
  const absent = statuses.filter((s) => s === "ABSENT").length;
  const reserved = statuses.filter((s) => s === "RESERVED").length;

  const total = attended + absent; // 예정인 것 제외한 실제 수업 수
  const attendanceRate = total > 0 ? (attended / total) * 100 : 0;

  return {
    attended,
    absent,
    reserved,
    total: records.length,
    completedSessions: total,
    attendanceRate: Math.round(attendanceRate * 10) / 10, // 소수점 1자리
  };
}

/**
 * PT 기록 배열에서 완료된(ATTENDED) 세션 수를 계산합니다.
 */
export function calculateCompletedSessions(
  records: IPtRecordForAttendance[],
  currentTime: Date = new Date()
): number {
  return records.filter(
    (record) => calculateAttendanceStatus(record, currentTime) === "ATTENDED"
  ).length;
}

/**
 * 다음 예정된(RESERVED) 세션을 찾습니다.
 */
export function findUpcomingSession<T extends IPtRecordForAttendance>(
  records: T[],
  currentTime: Date = new Date()
): T | null {
  return (
    records.find((record) => {
      const status = calculateAttendanceStatus(record, currentTime);
      return (
        status === "RESERVED" && new Date(record.ptSchedule.date) >= currentTime
      );
    }) || null
  );
}

/**
 * PT 목록에서 각 PT의 상태를 판별합니다.
 */
export function calculatePtStatus(
  pt: {
    state: string;
    trainerConfirmed: boolean;
    ptRecord: IPtRecordForAttendance[];
    ptProduct: { totalCount: number };
  },
  currentTime: Date = new Date()
) {
  // 트레이너 승인과 state가 모두 CONFIRMED일 때만 승인됨으로 처리
  if (pt.trainerConfirmed && pt.state === "CONFIRMED") {
    const completedSessions = calculateCompletedSessions(
      pt.ptRecord,
      currentTime
    );

    if (completedSessions >= pt.ptProduct.totalCount) {
      return { text: "완료", variant: "default" as const, isCompleted: true };
    }
    return { text: "진행중", variant: "success" as const, isActive: true };
  } else if (pt.state === "REJECTED") {
    return { text: "거절됨", variant: "error" as const, isRejected: true };
  } else if (pt.state === "PENDING") {
    return { text: "승인대기", variant: "warning" as const, isPending: true };
  } else {
    return { text: "알 수 없음", variant: "default" as const };
  }
}
