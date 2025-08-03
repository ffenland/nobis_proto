"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { ChevronLeft, AlertCircle, Users, CheckCircle } from "lucide-react";
import { PageLayout } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingPage, LoadingSpinner } from "@/app/components/ui/Loading";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import type { TrainersForCenterAssignment } from "@/app/lib/services/manager/manager-trainer.service";

// 데이터 페처
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

// 트레이너 배정 업데이트 함수
async function updateTrainerAssignment(
  url: string,
  { arg }: { arg: { centerId: string; trainerIds: string[] } }
) {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "트레이너 배정 중 오류가 발생했습니다");
  }

  return response.json();
}

type Params = Promise<{ centerId: string }>;

export default function SetTrainersPage(props: { params: Params }) {
  const params = use(props.params);
  const centerId = params.centerId;
  const router = useRouter();

  // 데이터 조회
  const { data, error, isLoading } = useSWR<{
    success: boolean;
    data: TrainersForCenterAssignment;
  }>(`/api/manager/trainers/center-assignment/${centerId}`, fetcher);

  // 트레이너 배정 mutation
  const { trigger, isMutating } = useSWRMutation(
    "/api/manager/trainers/center-assignment",
    updateTrainerAssignment
  );

  // 선택된 트레이너 상태 관리
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<Set<string>>(
    new Set()
  );

  // 초기 선택 상태 설정
  useState(() => {
    if (data?.data?.trainers) {
      const currentlyAssigned = data.data.trainers
        .filter((trainer) => trainer.isCurrentlyAssigned)
        .map((trainer) => trainer.id);
      setSelectedTrainerIds(new Set(currentlyAssigned));
    }
  });

  // 트레이너 선택 토글
  const toggleTrainerSelection = (trainerId: string) => {
    setSelectedTrainerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trainerId)) {
        newSet.delete(trainerId);
      } else {
        newSet.add(trainerId);
      }
      return newSet;
    });
  };

  // 저장 핸들러
  const handleSave = async () => {
    try {
      await trigger({
        centerId,
        trainerIds: Array.from(selectedTrainerIds),
      });
      router.push(`/manager/trainers/${centerId}`);
    } catch (error) {
      console.error("트레이너 배정 오류:", error);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return <LoadingPage message="데이터를 불러오는 중..." />;
  }

  // 에러 상태
  if (error || !data?.data) {
    return (
      <PageLayout maxWidth="md">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">데이터를 불러오는데 실패했습니다</p>
          <Link href={`/manager/trainers/${centerId}`}>
            <Button variant="outline">돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const { center, trainers } = data.data;

  return (
    <PageLayout maxWidth="md">
      {/* 헤더 */}
      <div className="mb-6">
        <Link
          href={`/manager/trainers/${centerId}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{center.title}</h1>
        <p className="text-gray-600 mt-1">소속 트레이너 관리</p>
      </div>

      {/* 중복 요일 경고 */}
      {center.hasDuplicateDays && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <p className="text-red-800 font-medium">
                기본 근무시간이 중복되었습니다
              </p>
              <p className="text-red-700 text-sm mt-1">
                센터의 근무시간 정보를 먼저 수정하세요.
                <br />
                중복된 요일: {center.duplicateDays.join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 트레이너 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">트레이너 선택</h2>
            <div className="text-sm text-gray-600">
              {selectedTrainerIds.size}명 선택됨
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trainers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">등록된 트레이너가 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              {trainers.map((trainer) => {
                const isSelected = selectedTrainerIds.has(trainer.id);
                return (
                  <div
                    key={trainer.id}
                    onClick={() => toggleTrainerSelection(trainer.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50 border-blue-500"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* 체크박스 모양 */}
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-blue-500 border-blue-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>

                        {/* 프로필 이미지 */}
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          {trainer.user.avatarImage?.cloudflareId ? (
                            <Image
                              src={getOptimizedImageUrl(
                                trainer.user.avatarImage.cloudflareId,
                                "avatar"
                              )}
                              alt={trainer.user.username}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                              unoptimized={true}
                            />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

                        {/* 트레이너 정보 */}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {trainer.user.username}
                          </p>
                          <p className="text-sm text-gray-600">
                            {trainer.user.email}
                          </p>
                        </div>
                      </div>

                      {/* 현재 소속 센터 표시 */}
                      {trainer.fitnessCenter && (
                        <div className="text-sm text-gray-500">
                          {trainer.fitnessCenter.id === centerId ? (
                            <span className="text-blue-600">현재 센터</span>
                          ) : (
                            <span>{trainer.fitnessCenter.title}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="mt-6 flex justify-end space-x-3">
        <Link href={`/manager/trainers/${centerId}`}>
          <Button variant="outline">취소</Button>
        </Link>
        <Button
          onClick={handleSave}
          disabled={isMutating || center.hasDuplicateDays}
        >
          {isMutating ? (
            <>
              <LoadingSpinner className="mr-2" />
              저장 중...
            </>
          ) : (
            "저장하기"
          )}
        </Button>
      </div>
    </PageLayout>
  );
}