// app/trainer/pt-record/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  IPtRecordDetail,
  IFitnessCenter,
  getFitnessCentersService,
  checkTimeLimit,
} from "@/app/lib/services/pt-record.service";
import PtRecordWriter from "./PtRecordWriter";

type Params = Promise<{ id: string }>;

interface PtRecordPageProps {
  params: Params;
}

// API fetcher 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch");
    }
    return res.json();
  });

const PtRecordPage = ({ params }: PtRecordPageProps) => {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [choosenCenter, setChoosenCenter] = useState<IFitnessCenter | null>(
    null
  );
  const [showCenterModal, setShowCenterModal] = useState(false);

  // params 해결
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // PT 기록 상세 정보 조회
  const {
    data: ptRecord,
    error,
    isLoading,
  } = useSWR<IPtRecordDetail>(
    resolvedParams ? `/api/trainer/pt-records/${resolvedParams.id}` : null,
    fetcher
  );

  // 피트니스 센터 목록 조회
  const {
    data: fitnessCenter,
    error: centerError,
    isLoading: centerLoading,
  } = useSWR<IFitnessCenter[]>("/api/trainer/fitness-centers", fetcher);

  // 초기 센터 설정
  useEffect(() => {
    if (ptRecord?.pt.trainer?.fitnessCenter && !choosenCenter) {
      setChoosenCenter(ptRecord.pt.trainer.fitnessCenter);
    }
  }, [ptRecord, choosenCenter]);

  // 90분 제한 체크
  const isTimeExpired = ptRecord
    ? checkTimeLimit(ptRecord.ptSchedule.date, ptRecord.ptSchedule.startTime)
    : false;

  // 기록이 이미 존재하는지 체크
  const hasExistingRecords = ptRecord && ptRecord.items.length > 0;

  // 수업 시작 핸들러
  const handleStartClass = () => {
    if (choosenCenter) {
      setIsProcessing(true);
    }
  };

  // 센터 선택 핸들러
  const handleCenterSelect = (center: IFitnessCenter) => {
    setChoosenCenter(center);
    setShowCenterModal(false);
  };

  // 날짜/시간 포맷팅
  const formatDateTime = () => {
    if (!ptRecord) return "";

    const date = new Date(ptRecord.ptSchedule.date);
    const startTime = ptRecord.ptSchedule.startTime;
    const endTime = ptRecord.ptSchedule.endTime;

    const startHour = Math.floor(startTime / 100);
    const startMinute = startTime % 100;
    const endHour = Math.floor(endTime / 100);
    const endMinute = endTime % 100;

    return `${date.toLocaleDateString("ko-KR")} ${String(startHour).padStart(
      2,
      "0"
    )}:${String(startMinute).padStart(2, "0")} - ${String(endHour).padStart(
      2,
      "0"
    )}:${String(endMinute).padStart(2, "0")}`;
  };

  // 수업 상태 계산
  const getClassStatus = () => {
    if (!ptRecord)
      return { text: "로딩중", style: "bg-gray-100 text-gray-700" };

    if (hasExistingRecords) {
      return { text: "기록 완료", style: "bg-green-100 text-green-700" };
    } else if (isTimeExpired) {
      return { text: "시간 만료", style: "bg-red-100 text-red-700" };
    } else {
      return { text: "진행 예정", style: "bg-blue-100 text-blue-700" };
    }
  };

  // 운동 타입별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "MACHINE":
        return "🏋️";
      case "FREE":
        return "💪";
      case "STRETCHING":
        return "🧘";
      default:
        return "🏃";
    }
  };

  // 운동 이름 추출
  const getExerciseName = (item: IPtRecordDetail["items"][number]) => {
    switch (item.type) {
      case "MACHINE":
        const machineRecord = item.machineSetRecords[0];
        return (
          machineRecord?.settingValues[0]?.machineSetting?.machine?.title ||
          item.title ||
          "머신 운동"
        );
      case "FREE":
        return item.title || "프리웨이트";
      case "STRETCHING":
        const stretchingRecord = item.stretchingExerciseRecords[0];
        return (
          stretchingRecord?.stretchingExercise?.title ||
          item.title ||
          "스트레칭"
        );
      default:
        return item.title || "운동";
    }
  };

  // 세트 정보 포맷팅
  const formatSetInfo = (item: IPtRecordDetail["items"][number]) => {
    switch (item.type) {
      case "MACHINE":
        return item.machineSetRecords.map((record, idx) => (
          <div key={record.id} className="text-sm text-gray-600">
            {record.set}세트: {record.reps}회 -{" "}
            {record.settingValues
              .map(
                (sv) =>
                  `${sv.machineSetting.title} ${sv.value}${sv.machineSetting.unit}`
              )
              .join(", ")}
          </div>
        ));
      case "FREE":
        return item.freeSetRecords.map((record, idx) => (
          <div key={record.id} className="text-sm text-gray-600">
            {record.set}세트: {record.reps}회 -{" "}
            {record.weights
              .map((w) => `${w.title} ${w.weight}${w.unit}`)
              .join(", ")}
          </div>
        ));
      case "STRETCHING":
        return item.stretchingExerciseRecords.map((record, idx) => (
          <div key={record.id} className="text-sm text-gray-600">
            {record.stretchingExercise.title}
            {record.description && ` - ${record.description}`}
          </div>
        ));
      default:
        return <div className="text-sm text-gray-600">{item.description}</div>;
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">PT 기록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !ptRecord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md mx-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 text-red-500">⚠️</div>
            <p className="text-gray-800">PT 기록을 찾을 수 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  // 데이터 검증
  if (
    ptRecord.pt.member === null ||
    ptRecord.pt.trainer === null ||
    ptRecord.pt.trainer.fitnessCenterId === null
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md mx-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 text-red-500">⚠️</div>
            <p className="text-gray-800">유효하지 않은 PT 기록입니다.</p>
          </div>
        </div>
      </div>
    );
  }

  // PT 기록 작성 모드
  if (isProcessing && choosenCenter && !isTimeExpired && !hasExistingRecords) {
    return <PtRecordWriter ptRecordId={ptRecord.id} center={choosenCenter} />;
  }

  const classStatus = getClassStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {ptRecord.pt.member.user.username} 회원님
          </h1>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{formatDateTime()}</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${classStatus.style}`}
            >
              {classStatus.text}
            </span>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            {ptRecord.pt.ptProduct.title} ({ptRecord.pt.ptProduct.totalCount}회)
          </div>
        </div>

        {/* 시간 만료 또는 기록 완료 시 상세 내용 표시 */}
        {(isTimeExpired || hasExistingRecords) && (
          <>
            {/* 센터 정보 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                센터 정보
              </h3>
              <p className="text-gray-600">{ptRecord.fitnessCeneter.title}</p>
            </div>

            {/* 운동 기록 상세 */}
            {hasExistingRecords && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  운동 기록
                </h3>
                <div className="space-y-6">
                  {ptRecord.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="border-b border-gray-100 pb-4 last:border-b-0"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {getTypeIcon(item.type)}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {index + 1}. {getExerciseName(item)}
                            </h4>
                            {item.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
                          {item.type === "MACHINE" && "머신"}
                          {item.type === "FREE" && "프리웨이트"}
                          {item.type === "STRETCHING" && "스트레칭"}
                        </span>
                      </div>

                      {/* 세트 정보 */}
                      <div className="space-y-1 ml-7">
                        {formatSetInfo(item)}
                      </div>

                      {/* 사진 자리 (추후 구현 대비) */}
                      {item.photos.length > 0 && (
                        <div className="mt-3 ml-7">
                          <div className="grid grid-cols-3 gap-2">
                            {item.photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                              >
                                <img
                                  src={photo.thumbnailUrl || photo.publicUrl}
                                  alt="운동 사진"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 메모 */}
            {ptRecord.memo && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  트레이너 메모
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {ptRecord.memo}
                </p>
              </div>
            )}

            {/* 기록이 없고 시간이 만료된 경우 */}
            {!hasExistingRecords && isTimeExpired && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">😞</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    기록 시간이 만료되었습니다
                  </h3>
                  <p className="text-gray-600">
                    수업 시작 시간으로부터 90분이 지나 더 이상 기록을 작성할 수
                    없습니다.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* 시간이 만료되지 않고 기록이 없는 경우만 센터 선택 및 기록 시작 버튼 표시 */}
        {!isTimeExpired && !hasExistingRecords && (
          <>
            {/* 센터 정보 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    센터 정보
                  </h3>
                  <p className="text-gray-600">
                    {choosenCenter
                      ? choosenCenter.title
                      : "센터를 선택해주세요"}
                  </p>
                </div>
                <button
                  onClick={() => setShowCenterModal(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  변경
                </button>
              </div>
            </div>

            {/* 수업 시작 버튼 */}
            <button
              onClick={handleStartClass}
              disabled={!choosenCenter}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                choosenCenter
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {choosenCenter ? "기록 시작하기" : "센터를 먼저 선택해주세요"}
            </button>
          </>
        )}

        {/* 센터 선택 모달 */}
        {showCenterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                센터 선택
              </h3>

              {centerLoading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : centerError ? (
                <div className="text-center py-4 text-red-600">
                  센터 목록을 불러올 수 없습니다
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {fitnessCenter?.map((center) => (
                    <button
                      key={center.id}
                      onClick={() => handleCenterSelect(center)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        choosenCenter?.id === center.id
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {center.title}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setShowCenterModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PtRecordPage;
