"use client";

import React, { useEffect, useState } from "react";
import {
  getMachines,
  IMachine,
  getCenterList,
  IFitnessCenter,
  IWeights,
  getWeightsList,
  getPtRecordItems,
  IPtRecordItem,
} from "./actions";
import { formatDate, formatTime } from "@/app/lib/utils";
import { AttendanceState } from "@prisma/client";
import MachineRecord from "./MachineRecord";
import FreeRecord from "./FreeRecord";
import { useRouter } from "next/navigation";

// 먼저 각 운동 타입별 데이터 타입을 정의

export interface ExerciseRecord {
  id: string;
  type: "machine" | "free" | "stretching";
  name: string;
  details: string;
  index: number;
}
export interface MachineExerciseData {
  type: "machine";
  name: string;
  weight: string;
  sets: string;
  reps: string;
  details?: string;
}

export interface FreeExerciseData {
  type: "free";
  name: string;
  sets: string;
  reps: string;
  details?: string;
}

export interface StretchingExerciseData {
  type: "stretching";
  name: string;
  duration: string;
  details?: string;
}
type ExerciseData =
  | MachineExerciseData
  | FreeExerciseData
  | StretchingExerciseData;

interface StretchingRecordProps {
  onComplete: (data: StretchingExerciseData) => void;
}
const StretchingRecord = ({ onComplete }: StretchingRecordProps) => {
  return <div></div>;
};

/**
 * 운동을 하는 센터를 선택하고,
 * 운동 타입을 선택한뒤 기록하기
 *
 *
 *
 */
const PtRecordWriter = ({ ptRecordId }: { ptRecordId: string }) => {
  const router = useRouter();
  const [centerList, setCenterList] = useState<IFitnessCenter[]>([]);
  const [recordItems, setRecordItems] = useState<IPtRecordItem[]>([]);
  const [choosenCenter, setChoosenCenter] = useState<IFitnessCenter>();
  // 센터 선택 모달
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 선택한 센터의 머신 목록
  const [machineList, setMachineList] = useState<IMachine[]>([]);
  // 선택한 센터의 도구 목록
  const [weightsList, setWeightsList] = useState<IWeights[]>([]);
  // 운동 기록 중인지 여부
  const [isRecording, setIsRecording] = useState(false);
  const [recordList, setRecordList] = useState<ExerciseRecord[]>([]);
  const [selectedType, setSelectedType] = useState<
    "machine" | "free" | "stretching" | null
  >(null);

  const member = ptRecord.pt.member?.user.username
    ? ptRecord.pt.member.user.username
    : "회원 정보 없음";

  const handleStartExercise = () => {
    setIsRecording(true);
  };

  const handleTypeSelect = (type: "machine" | "free" | "stretching") => {
    setSelectedType(type);
  };

  // onComplete 함수 구현

  // 머신운동 세트 완료

  const onComplete = (data: ExerciseData) => {
    let details = "";

    // 운동 타입별로 details 문자열 생성
    switch (data.type) {
      case "machine":
        details = `${data.weight}kg ${data.sets}세트 ${data.reps}회${
          data.details ? `\n${data.details}` : ""
        }`;
        break;
      case "free":
        details = `${data.sets}세트 ${data.reps}회${
          data.details ? `\n${data.details}` : ""
        }`;
        break;
      case "stretching":
        details = `${data.duration}초${
          data.details ? `\n${data.details}` : ""
        }`;
        break;
    }

    const newRecord: ExerciseRecord = {
      id: Date.now().toString(),
      type: data.type,
      name: data.name,
      details,
      index: recordList.length,
    };

    setRecordList((prev) => [...prev, newRecord]);
    setSelectedType(null);
  };

  // 머신목록, FreeTool 받아오기
  useEffect(() => {
    let isMounted = true;
    const initMachineAndWeightsList = async () => {
      try {
        const machinesOfCenter = await getMachines(choosenCenter.id);
        const weightsOfCenter = await getWeightsList(choosenCenter.id);

        if (isMounted) {
          setMachineList(machinesOfCenter);
          setWeightsList(weightsOfCenter);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    initMachineAndWeightsList();

    return () => {
      isMounted = false;
    };
  }, [choosenCenter.id]);

  useEffect(() => {
    const getInitialData = async () => {
      const ptRecordItems = await getPtRecordItems(ptRecordId);
      const centerList = await getCenterList();
      setCenterList(centerList);
    };
    getInitialData();
  }, []);

  // 불참 화면
  if (ptRecord.attended === AttendanceState.ABSENT) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-gray-600">
          불참한 수업입니다. 운동 내용을 기록할 수 없습니다
        </p>
      </div>
    );
  }

  // 수정 화면
  if (ptRecord.attended === AttendanceState.ATTENDED) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-gray-600">
          이미 기록이 완료되었습니다. 수정하시겠습니까?
        </p>
      </div>
    );
  }
  if (ptRecord.attended === AttendanceState.RESERVED && !isRecording) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex  items-center justify-center">
          <span>센터</span>
          <span>{choosenCenter.title}</span>
        </div>
        <div className="flex items-center justify-center">
          <button
            className="btn btn-primary"
            onClick={() => {
              setIsModalOpen(true);
            }}
          >
            센터 변경하기
          </button>
        </div>
        <button
          onClick={handleStartExercise}
          className="px-8 py-4 text-xl font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-600"
        >
          오늘 운동 시작
        </button>
        {/* 센터 선택 Modal */}
        <dialog
          id="center_modal"
          className={`modal ${isModalOpen ? "modal-open" : ""}`}
        >
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">센터 선택</h3>
            <div className="space-y-2">
              {centerList.map((center) => (
                <button
                  key={center.id}
                  onClick={() => {
                    setChoosenCenter(center);
                    setIsModalOpen(false);
                  }}
                  className={`btn btn-block ${
                    choosenCenter.id === center.id ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold">{center.title}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                }}
                className="btn"
              >
                닫기
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              onClick={() => {
                setIsModalOpen(false);
              }}
            >
              닫기
            </button>
          </form>
        </dialog>
      </div>
    );
  } else {
    return (
      <div className="w-full flex flex-col">
        <div className="mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">{member}의 운동 기록</h1>
            <p>날짜: {formatDate(ptRecord.ptSchedule.date)}</p>
            <p>
              시간: {formatTime(ptRecord.ptSchedule.startTime)} -{" "}
              {formatTime(ptRecord.ptSchedule.endTime)}
            </p>
          </div>
          <div>
            <button
              onClick={() => {
                if (selectedType === null) {
                  router.push(`/trainer/pt/${ptRecord.pt.id}`);
                } else {
                  setSelectedType(null);
                }
              }}
              className="btn btn-outline btn-sm border-blue-500 text-blue-500"
            >
              {selectedType === null ? "목록으로" : "다시 선택하기"}
            </button>
          </div>
        </div>
        <div>
          {recordList.length === 0 ? (
            !selectedType ? (
              <div className="grid grid-cols-1 gap-4 w-full max-w-md">
                <button
                  onClick={() => handleTypeSelect("machine")}
                  className="btn btn-primary btn-lg"
                >
                  머신운동
                </button>
                <button
                  onClick={() => handleTypeSelect("free")}
                  className="btn btn-secondary btn-lg"
                >
                  프리/기타
                </button>
                <button
                  onClick={() => handleTypeSelect("stretching")}
                  className="btn btn-accent btn-lg"
                >
                  스트레칭
                </button>
              </div>
            ) : (
              <div className="p-8 flex flex-col w-full">
                {selectedType === "machine" ? (
                  <MachineRecord
                    ptRecordId={ptRecord.id}
                    onComplete={onComplete}
                    machineList={machineList}
                  />
                ) : selectedType === "stretching" ? (
                  <StretchingRecord onComplete={onComplete} />
                ) : (
                  <FreeRecord
                    onComplete={onComplete}
                    weightsList={weightsList}
                  />
                )}
              </div>
            )
          ) : (
            <>
              <button
                onClick={() => setSelectedType(null)}
                className="btn btn-primary mt-4"
              >
                운동 추가하기
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
};

export default PtRecordWriter;
