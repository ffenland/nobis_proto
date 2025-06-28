"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import PtRecordWriter from "./PtRecordWriter";
import {
  IPtRecordDetail,
  IFitnessCenter,
} from "@/app/lib/services/pt-record.service";

type Params = Promise<{ id: string }>;

// API fetcher 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch");
    }
    return res.json();
  });

const Page = ({ params }: { params: Params }) => {
  const [ptRecordId, setPtRecordId] = useState<string>("");
  const [choosenCenter, setChoosenCenter] = useState<IFitnessCenter | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);

  // params에서 ID 추출
  useEffect(() => {
    const loadId = async () => {
      const { id } = await params;
      setPtRecordId(id);
    };
    loadId();
  }, [params]);

  // PT 기록 정보 조회
  const {
    data: ptRecord,
    error: ptRecordError,
    isLoading: ptRecordLoading,
  } = useSWR<IPtRecordDetail>(
    ptRecordId ? `/api/trainer/pt-records/${ptRecordId}` : null,
    fetcher
  );

  // 피트니스 센터 목록 조회
  const {
    data: fitnessCenters,
    error: centersError,
    isLoading: centersLoading,
  } = useSWR<IFitnessCenter[]>("/api/trainer/fitness-centers", fetcher);

  // 기본 센터 설정
  useEffect(() => {
    if (ptRecord?.pt.trainer?.fitnessCenter && !choosenCenter) {
      setChoosenCenter({
        id: ptRecord.pt.trainer.fitnessCenterId!,
        title: ptRecord.pt.trainer.fitnessCenter.title,
      });
    }
  }, [ptRecord, choosenCenter]);

  // 수업 상태 계산
  const getClassStatus = () => {
    if (!ptRecord) return { text: "알 수 없음", style: "text-gray-500" };

    const now = new Date();
    const classDate = new Date(ptRecord.ptSchedule.date);
    const classStartTime = ptRecord.ptSchedule.startTime;
    const classEndTime = ptRecord.ptSchedule.endTime;

    const startHour = Math.floor(classStartTime / 100);
    const startMinute = classStartTime % 100;
    const endHour = Math.floor(classEndTime / 100);
    const endMinute = classEndTime % 100;

    const classStart = new Date(classDate);
    classStart.setHours(startHour, startMinute, 0, 0);

    const classEnd = new Date(classDate);
    classEnd.setHours(endHour, endMinute, 0, 0);

    const oneHourAfterEnd = new Date(classEnd);
    oneHourAfterEnd.setHours(oneHourAfterEnd.getHours() + 1);

    if (now < classStart) {
      return { text: "수업대기", style: "text-amber-600 bg-amber-50" };
    } else if (now >= classStart && now <= oneHourAfterEnd) {
      return { text: "수업중", style: "text-emerald-600 bg-emerald-50" };
    } else {
      return { text: "수업종료", style: "text-gray-600 bg-gray-50" };
    }
  };

  // 날짜와 시간 포맷팅
  const formatDateTime = () => {
    if (!ptRecord) return "";

    const date = new Date(ptRecord.ptSchedule.date);
    const startTime = ptRecord.ptSchedule.startTime;
    const endTime = ptRecord.ptSchedule.endTime;

    const formatTime = (time: number) => {
      const hour = Math.floor(time / 100);
      const minute = time % 100;
      return `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
    };

    return `${date.toLocaleDateString("ko-KR")} ${formatTime(
      startTime
    )} - ${formatTime(endTime)}`;
  };

  const handleCenterChange = (center: IFitnessCenter) => {
    setChoosenCenter(center);
    setShowCenterModal(false);
  };

  const handleStartClass = () => {
    setIsProcessing(true);
  };

  // 로딩 상태
  if (ptRecordLoading || centersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (ptRecordError || centersError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md mx-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 text-red-500">⚠️</div>
            <p className="text-gray-800">
              데이터를 불러오는 중 오류가 발생했습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 데이터 검증
  if (
    !ptRecord ||
    ptRecord.pt.member === null ||
    ptRecord.pt.trainer === null ||
    ptRecord.pt.trainer.fitnessCenterId === null
  ) {
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

  // PT 기록 작성 모드
  if (isProcessing && choosenCenter) {
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
        </div>

        {/* 센터 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                센터 정보
              </h3>
              <p className="text-gray-600">
                {choosenCenter ? choosenCenter.title : "센터를 선택해주세요"}
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
              ? "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          수업 시작하기
        </button>

        {/* 센터 선택 모달 */}
        {showCenterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full max-h-96 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  센터 선택
                </h3>
              </div>

              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {fitnessCenters?.map((center) => (
                  <button
                    key={center.id}
                    onClick={() => handleCenterChange(center)}
                    className={`w-full p-4 text-left rounded-lg transition-colors ${
                      choosenCenter?.id === center.id
                        ? "bg-gray-900 text-white"
                        : "bg-gray-50 text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {center.title}
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCenterModal(false)}
                  className="w-full py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

export default Page;
