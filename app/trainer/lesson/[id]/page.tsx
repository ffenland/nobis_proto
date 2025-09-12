// app/trainer/lesson/[id]/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatTime } from "@/app/lib/utils/time.utils";
import { getEquipmentTitle } from "@/app/lib/utils/equipment.utils";
import {
  Clock,
  Calendar,
  User,
  Plus,
  Edit,
  Camera,
  FileText,
  ArrowLeft,
} from "lucide-react";
import type {
  GetLessonDetailResult,
  LessonDetailRecord,
} from "@/app/services/trainer/lesson.service";

import EditRecordModal from "./EditRecordModal";
import UnauthorizedAccess from "./UnauthorizedAccess";

interface PageProps {
  params: Promise<{ id: string }>;
}

const TrainerLessonDetailPage = ({ params }: PageProps) => {
  const { id } = use(params);
  const [editingRecord, setEditingRecord] = useState<LessonDetailRecord | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // SWR로 데이터 페칭 - 레슨 기본 정보와 레코드 분리
  const {
    data: lesson,
    error: lessonError,
    isLoading: lessonLoading,
    mutate: mutateLessson,
  } = useSWR<GetLessonDetailResult>(`/api/trainer/lesson/${id}`);

  const {
    data: records,
    error: recordsError,
    isLoading: recordsLoading,
    mutate: mutateRecords,
  } = useSWR<LessonDetailRecord[]>(
    lesson ? `/api/trainer/lesson/${id}/records` : null
  );

  // 수정 모달 열기
  const handleEditClick = (record: LessonDetailRecord) => {
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  // 수정 성공 후 데이터 새로고침
  const handleEditSuccess = () => {
    mutateRecords();
  };

  // 운동 타입별 아이콘과 색상
  const getExerciseTypeInfo = (type: string) => {
    switch (type) {
      case "MACHINE":
        return { icon: "🏋️", color: "blue", label: "머신" };
      case "FREE":
        return { icon: "💪", color: "green", label: "프리웨이트" };
      case "STRETCHING":
        return { icon: "🧘", color: "purple", label: "스트레칭" };
      default:
        return { icon: "🏃", color: "gray", label: "기타" };
    }
  };

  // 수업 상태별 배지 - records를 기반으로 판단
  const getStatusBadge = () => {
    if (!records) return null;
    const hasRecords = records.length > 0;
    if (hasRecords) {
      return <Badge variant="success">완료</Badge>;
    } else {
      return <Badge variant="info">예정</Badge>;
    }
  };

  // 현재 시간 기준으로 기록 가능 여부 판단
  const canRecord = () => {
    if (!lesson || !records) return false;
    // 기록이 없으면 기록 가능
    return records.length === 0;
  };

  // 날짜 포맷팅
  const formatDateString = (date: Date): string => {
    return date.toLocaleDateString("ko-KR");
  };

  // 둘 중 하나라도 로딩 중이면 로딩 표시
  if (lessonLoading || recordsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (lessonError || !lesson) {
    // 권한이 없거나 레슨이 존재하지 않는 경우
    return <UnauthorizedAccess />;
  }

  // records는 없을 수 있으므로 빈 배열로 초기화
  const lessonRecords = records || [];

  // 통계 계산 - records 기반으로 변경
  const stats = {
    totalExercises: lessonRecords.length,
    totalSets: lessonRecords.reduce((sum, item) => {
      if (item.type === "MACHINE") return sum + item.machineSetRecords.length;
      if (item.type === "FREE") return sum + item.freeSetRecords.length;
      if (item.type === "STRETCHING")
        return sum + item.stretchingExerciseRecords.length;
      return sum;
    }, 0),
    totalReps: lessonRecords.reduce((sum, item) => {
      if (item.type === "MACHINE") {
        return sum + item.machineSetRecords.reduce((s, set) => s + set.reps, 0);
      }
      if (item.type === "FREE") {
        return sum + item.freeSetRecords.reduce((s, set) => s + set.reps, 0);
      }
      return sum;
    }, 0),
    totalWeight: lessonRecords.reduce((sum, item) => {
      if (item.type === "MACHINE") {
        return (
          sum +
          item.machineSetRecords.reduce((s, set) => {
            const weight = set.settingValues.find(
              (v) => v.machineSetting.title === "무게"
            );
            return s + (weight ? parseInt(weight.value) * set.reps : 0);
          }, 0)
        );
      }
      if (item.type === "FREE") {
        return (
          sum +
          item.freeSetRecords.reduce((s, set) => {
            const weight = parseFloat(set.equipments[0]?.primaryValue || '0') || 0;
            return s + weight * set.reps;
          }, 0)
        );
      }
      return sum;
    }, 0),
    exerciseTypes: {
      machine: lessonRecords.filter((i) => i.type === "MACHINE").length,
      free: lessonRecords.filter((i) => i.type === "FREE").length,
      stretching: lessonRecords.filter((i) => i.type === "STRETCHING").length,
    },
    mediaCount: {
      images: lesson?.images?.length || 0,
      videos: lesson?.videos?.length || 0,
    },
  };

  return (
    <>
      {/* 반응형 컨테이너 */}
      <div className="lg:flex lg:gap-6">
        {/* 메인 콘텐츠 영역 */}
        <div className="lg:flex-1 lg:max-w-4xl">
          <div className="space-y-6">
            {/* 수업 정보 카드 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/trainer/pt/${lesson.ptId}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="p-2"
                        title="뒤로가기"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </Link>
                    <h3 className="text-lg font-semibold">
                      PT 수업 #{lesson.lessonNumber}
                    </h3>
                  </div>
                  {getStatusBadge()}
                </div>
                <p className="text-gray-600 text-sm">
                  {lesson.memberName}님의{" "}
                  {formatDateString(new Date(lesson.scheduleDate))} 수업
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">회원</span>
                      <span className="font-medium">{lesson.memberName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">날짜</span>
                      <span className="font-medium">
                        {formatDateString(new Date(lesson.scheduleDate))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">시간</span>
                      <span className="font-medium">
                        {formatTime(lesson.startTime)} -{" "}
                        {formatTime(lesson.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">프로그램</p>
                      <p className="font-medium text-gray-900">
                        {lesson.ptTitle}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {lesson.lessonNumber}/{lesson.ptTotalCount}회차
                      </p>
                    </div>
                  </div>
                </div>

                {/* 메모가 있는 경우 */}
                {lesson.memo && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      메모
                    </p>
                    <p className="text-sm text-gray-600">{lesson.memo}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 운동 기록이 있는 경우 */}
            {lessonRecords.length > 0 ? (
              <>
                {/* 운동 기록 상세 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">운동 기록</h3>
                      <Link href={`/trainer/lesson/${lesson.id}/record`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          기록 수정
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {lessonRecords.map((record) => {
                        const typeInfo = getExerciseTypeInfo(record.type);
                        return (
                          <div
                            key={record.id}
                            className="flex flex-col border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{typeInfo.icon}</span>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900">
                                    {record.entry}. {record.title}
                                  </h4>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {typeInfo.label}
                                </Badge>
                                <button
                                  onClick={() => handleEditClick(record)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="수정"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {record.description && (
                              <p className="text-xs text-gray-600">
                                {record.description}
                              </p>
                            )}

                            {/* 운동 타입별 상세 정보 */}
                            {record.type === "MACHINE" &&
                              record.machineSetRecords && (
                                <div className="space-y-2">
                                  {record.machineSetRecords.map((set) => (
                                    <div
                                      key={set.id}
                                      className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded"
                                    >
                                      <span className="font-medium text-gray-700">
                                        Set {set.set}
                                      </span>
                                      <span className="text-gray-600">•</span>
                                      <span className="text-gray-700">
                                        {set.reps}회
                                      </span>
                                      {set.settingValues.map((setting, idx) => (
                                        <span key={idx}>
                                          <span className="text-gray-600">
                                            •
                                          </span>
                                          <span className="text-gray-700">
                                            {setting.machineSetting.title}:{" "}
                                            {setting.value}
                                            {setting.machineSetting.unit}
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              )}

                            {record.type === "FREE" &&
                              record.freeSetRecords && (
                                <div className="space-y-2">
                                  {record.freeSetRecords.map((set) => (
                                    <div
                                      key={set.id}
                                      className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded"
                                    >
                                      <span className="font-medium text-gray-700">
                                        Set {set.set}
                                      </span>
                                      <span className="text-gray-600">•</span>
                                      <span className="text-gray-700">
                                        {set.reps}회
                                      </span>
                                      <span className="text-gray-600">•</span>
                                      <span className="text-gray-700">
                                        {set.equipments
                                          .map(
                                            (eq) =>
                                              getEquipmentTitle(eq)
                                          )
                                          .join(", ")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                            {record.type === "STRETCHING" &&
                              record.stretchingExerciseRecords && (
                                <div className="space-y-2">
                                  {record.stretchingExerciseRecords.map(
                                    (stretch) => (
                                      <div
                                        key={stretch.id}
                                        className="bg-gray-50 p-2 rounded text-sm"
                                      >
                                        <p className="text-gray-700">
                                          <span className="font-medium">
                                            {stretch.stretchingExercise.title}
                                          </span>
                                        </p>
                                        {stretch.description && (
                                          <p className="text-gray-600 text-xs mt-1">
                                            {stretch.description}
                                          </p>
                                        )}
                                        {stretch.equipments.length > 0 && (
                                          <p className="text-gray-600 text-xs mt-1">
                                            기구:{" "}
                                            {stretch.equipments
                                              .map((eq) => getEquipmentTitle(eq))
                                              .join(", ")}
                                          </p>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* 운동 기록이 없는 경우 */
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      아직 기록이 없습니다
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      {canRecord()
                        ? "수업 기록을 작성해주세요."
                        : "수업 시간이 되면 기록을 작성할 수 있습니다."}
                    </p>
                    {canRecord() && (
                      <Link href={`/trainer/lesson/${lesson.id}/record`}>
                        <Button variant="primary" size="lg">
                          <Plus className="w-5 h-5 mr-2" />
                          기록하기
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 사이드바 영역 - 태블릿 이상에서만 표시 */}
        <div className="hidden lg:block lg:w-80">
          <div className="sticky top-4 space-y-4">
            {/* 빠른 액션 */}
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">
                  빠른 작업
                </h3>
                <div className="space-y-2">
                  {lessonRecords.length > 0 ? (
                    <>
                      <Link
                        href={`/trainer/lesson/${lesson.id}/edit`}
                        className="block"
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          기록 수정하기
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        사진 추가하기
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        리포트 생성
                      </Button>
                    </>
                  ) : (
                    <>
                      {canRecord() && (
                        <Link
                          href={`/trainer/lesson/${lesson.id}/record`}
                          className="block"
                        >
                          <Button
                            variant="primary"
                            className="w-full justify-start"
                          >
                            <Plus className="w-4 h-4 mr-2" />새 기록 작성
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        일정 변경 요청
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 회원 정보 요약 */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  회원 정보
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-purple-700">이름</p>
                    <p className="font-medium text-purple-900">
                      {lesson.memberName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">연락처</p>
                    <p className="font-medium text-purple-900">
                      {lesson.memberMobile}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">진행 상황</p>
                    <div className="mt-1">
                      <div className="w-full bg-purple-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{
                            width: `${
                              (lesson.lessonNumber / lesson.ptTotalCount) * 100
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-purple-700 mt-1">
                        {lesson.lessonNumber}/{lesson.ptTotalCount}회
                      </p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  회원 프로필 보기
                </Button>
              </CardContent>
            </Card>

            {/* 센터 정보 */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-green-900 mb-4">
                  센터 정보
                </h3>
                <div className="space-y-2">
                  <p className="font-medium text-green-900">
                    {lesson.centerName}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 수정 모달 */}
      <EditRecordModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        record={editingRecord}
        lessonId={id}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};

export default TrainerLessonDetailPage;
