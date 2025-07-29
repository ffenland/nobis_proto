// 운동 기록 컴포넌트들의 공통 타입 정의

// 프리웨이트 제출 데이터
export interface FreeRecordSubmitData {
  title: string;
  description?: string;
  freeExerciseId: string;
  sets: Array<{
    set: number;
    reps: number;
    equipmentIds: string[];
  }>;
}

// 머신 운동 제출 데이터
export interface MachineRecordSubmitData {
  machineId: string;
  machineName: string;
  details?: string;
  machineSetRecords: Array<{
    set: number;
    reps: number;
    settingValueIds: string[];
  }>;
}

// 스트레칭 제출 데이터
export interface StretchingRecordSubmitData {
  stretchingExerciseId: string;
  description?: string;
  equipmentIds: string[];
}