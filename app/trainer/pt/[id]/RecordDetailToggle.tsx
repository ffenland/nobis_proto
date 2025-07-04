// app/trainer/pt/[id]/RecordDetailToggle.tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TPtRecord, TPtRecordItem } from "./actions";

interface RecordDetailToggleProps {
  record: TPtRecord;
  children: React.ReactNode;
  attendanceStatus: "ATTENDED" | "ABSENT" | "RESERVED";
}

const RecordDetailToggle = ({
  record,
  children,
  attendanceStatus,
}: RecordDetailToggleProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        {children}
        {attendanceStatus === "ATTENDED" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                접기 <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                펼치기 <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        ) : null}
      </div>

      {/* 상세 운동 기록 */}
      {isExpanded && record.items.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            {record.items.map((item, index) => (
              <div key={item.id} className="bg-white p-3 rounded-lg border">
                <div className="font-medium mb-2">
                  {index + 1}. {item.title || item.description || "운동"}
                </div>

                {/* 머신 기록 */}
                {item.machineSetRecords.length > 0 && (
                  <div className="text-sm text-gray-600 space-y-1">
                    {item.machineSetRecords.map((record, idx) => (
                      <div key={record.id}>
                        {idx + 1}세트:{" "}
                        {record.settingValues
                          .map(
                            (sv) =>
                              `${sv.machineSetting.title} ${sv.value}${sv.machineSetting.unit}`
                          )
                          .join(", ")}
                      </div>
                    ))}
                  </div>
                )}

                {/* 프리웨이트 기록 */}
                {item.freeSetRecords.length > 0 && (
                  <div className="text-sm text-gray-600 space-y-1">
                    {item.freeSetRecords.map((record, idx) => (
                      <div key={record.id}>
                        {idx + 1}세트:{" "}
                        {record.equipments
                          .map((eq) => `${eq.primaryValue}${eq.primaryUnit}`)
                          .join(" + ")}{" "}
                        × {record.reps}회
                      </div>
                    ))}
                  </div>
                )}

                {/* 스트레칭 기록 */}
                {item.stretchingExerciseRecords.length > 0 && (
                  <div className="text-sm text-gray-600 space-y-1">
                    {item.stretchingExerciseRecords.map((record) => (
                      <div key={record.id}>
                        {record.stretchingExercise.title}
                        {record.description && ` - ${record.description}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordDetailToggle;
