// app/trainer/lesson/[id]/record/ExerciseRecordDisplay.tsx
"use client";

import { Edit, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/app/components/ui/Loading";
import type { LessonDetailRecord } from "@/app/services/trainer/lesson.service";

interface ExerciseRecordDisplayProps {
  record: LessonDetailRecord;
  isLoading?: boolean;
  onEdit?: (record: LessonDetailRecord) => void;
  onDelete?: (record: LessonDetailRecord) => void;
  showActions?: boolean;
}

// 운동 타입별 아이콘과 라벨
const getExerciseTypeInfo = (type: string) => {
  switch (type) {
    case "MACHINE":
      return { icon: "💪", label: "머신" };
    case "FREE":
      return { icon: "🏋️", label: "프리" };
    case "STRETCHING":
      return { icon: "🧘", label: "스트레칭" };
    default:
      return { icon: "💪", label: "운동" };
  }
};

// 머신 세트 정보 포맷팅
const formatMachineSet = (set: any, index: number) => {
  const setNumber = index + 1;
  const reps = `${set.reps}회`;
  
  if (!set.settingValues || set.settingValues.length === 0) {
    return `${setNumber}세트: ${reps}`;
  }
  
  // 설정값들을 문자열로 변환
  const settings = set.settingValues
    .map((sv: any) => `${sv.machineSetting.title} ${sv.value}${sv.machineSetting.unit}`)
    .join(", ");
    
  return `${setNumber}세트: ${settings} × ${reps}`;
};

// 프리 세트 정보 포맷팅  
const formatFreeSet = (set: any, index: number) => {
  const setNumber = index + 1;
  const reps = `${set.reps}회`;
  
  if (!set.equipments || set.equipments.length === 0) {
    return `${setNumber}세트: ${reps}`;
  }
  
  // 장비 정보를 문자열로 변환
  const equipments = set.equipments
    .map((eq: any) => {
      const groupName = eq.group.name;
      const value = eq.primaryValue ? `${eq.primaryValue}${eq.primaryUnit || ''}` : '';
      return value ? `${groupName} ${value}` : groupName;
    })
    .join(", ");
    
  return `${setNumber}세트: ${equipments} × ${reps}`;
};

// 스트레칭 정보 포맷팅
const formatStretchingInfo = (records: any[]) => {
  if (!records || records.length === 0) return "";
  
  const record = records[0]; // 스트레칭은 보통 1개 레코드
  const equipments = record.equipments
    ?.map((eq: any) => eq.group.name)
    .join(", ");
  
  const parts = [];
  if (equipments) parts.push(`${equipments} 사용`);
  if (record.description) parts.push(record.description);
  
  return parts.join(" • ");
};

export default function ExerciseRecordDisplay({ 
  record, 
  isLoading = false,
  onEdit,
  onDelete,
  showActions = true
}: ExerciseRecordDisplayProps) {
  const typeInfo = getExerciseTypeInfo(record.type);
  
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 헤더 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{typeInfo.icon}</span>
            <span className="font-medium">
              {record.entry}. {record.title}
            </span>
            <Badge variant="outline" className="text-xs">
              {typeInfo.label}
            </Badge>
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
          </div>
          
          {/* 세트별 상세 정보 */}
          <div className="text-sm text-gray-700 space-y-1">
            {record.type === "MACHINE" && record.machineSetRecords && (
              <div className="pl-4">
                {record.machineSetRecords.map((set, index) => (
                  <div key={set.id} className="flex items-center gap-1">
                    <span className="text-gray-400">├─</span>
                    <span>{formatMachineSet(set, index)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {record.type === "FREE" && record.freeSetRecords && (
              <div className="pl-4">
                {record.freeSetRecords.map((set, index) => (
                  <div key={set.id} className="flex items-center gap-1">
                    <span className="text-gray-400">├─</span>
                    <span>{formatFreeSet(set, index)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {record.type === "STRETCHING" && (
              <div className="pl-4">
                <span>{formatStretchingInfo(record.stretchingExerciseRecords)}</span>
              </div>
            )}
            
            {/* 설명 */}
            {record.description && (
              <div className="text-gray-500 text-xs mt-2">
                {record.description}
              </div>
            )}
          </div>
        </div>
        
        {/* 액션 버튼들 */}
        {showActions && (
          <div className="flex items-center gap-1 ml-2">
            {onEdit && (
              <button
                onClick={() => onEdit(record)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                disabled={isLoading}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(record)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}