"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Users,
  Calendar,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Eye,
  MapPin,
  Mail,
  Phone,
  TrendingUp,
  Settings,
  Edit,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
} from "lucide-react";

import { PageLayout } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import {
  LoadingSpinner,
  LoadingPage,
  Badge,
} from "@/app/components/ui/Loading";
import { PageHeaderWithActions } from "@/app/components/ui/PageHeaderWithActions";
import { formatTime } from "@/app/lib/utils/time.utils";
import type {
  ITrainerDetail,
  ITrainerPtList,
  ITrainerPtItem,
} from "@/app/lib/services/trainer-management.service";

// 데이터 페처 함수
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

// 근무시간 타입 정의
interface WorkingHour {
  id?: string;
  dayOfWeek: string;
  openTime: number;
  closeTime: number;
}

// 요일 옵션
const weekDays = [
  { key: "MON", label: "월요일" },
  { key: "TUE", label: "화요일" },
  { key: "WED", label: "수요일" },
  { key: "THU", label: "목요일" },
  { key: "FRI", label: "금요일" },
  { key: "SAT", label: "토요일" },
  { key: "SUN", label: "일요일" },
];

// 시간 옵션 생성 (00:00 ~ 24:00, 30분 단위)
const timeOptions = Array.from({ length: 49 }, (_, i) => {
  const totalMinutes = i * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // 24:00은 특별 처리
  if (hours === 24) {
    return {
      value: 2400,
      label: "24:00",
    };
  }

  return {
    value: hours * 100 + minutes,
    label: `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`,
  };
});

// 요일 한글 변환 함수
const getWeekDayKorean = (weekDay: string) => {
  const weekDayMap: Record<string, string> = {
    MON: "월",
    TUE: "화",
    WED: "수",
    THU: "목",
    FRI: "금",
    SAT: "토",
    SUN: "일",
  };
  return weekDayMap[weekDay] || weekDay;
};

// 트레이너 근무시간 표시 함수 (휴무일 처리)
const formatTrainerWorkingTime = (openTime: number, closeTime: number) => {
  if (openTime === 0 && closeTime === 0) {
    return "휴무";
  }
  return `${formatTime(openTime)} ~ ${formatTime(closeTime)}`;
};

// 센터 기본 근무시간과 트레이너 근무시간 비교 함수
const isDifferentFromCenterDefault = (
  trainerOpenTime: number,
  trainerCloseTime: number,
  dayOfWeek: string,
  centerDefaults: WorkingHour[]
) => {
  const centerDefault = centerDefaults.find(wh => wh.dayOfWeek === dayOfWeek);
  
  if (!centerDefault) {
    // 센터에 해당 요일 기본값이 없는 경우, 트레이너가 0,0이 아니면 다름
    return !(trainerOpenTime === 0 && trainerCloseTime === 0);
  }
  
  // 센터 기본값과 트레이너 값 비교
  return (
    trainerOpenTime !== centerDefault.openTime || 
    trainerCloseTime !== centerDefault.closeTime
  );
};

// PT 상태별 스타일 함수
const getPtStatusConfig = (state: string, trainerConfirmed: boolean) => {
  if (state === "CONFIRMED" && trainerConfirmed) {
    return {
      variant: "default" as const,
      text: "진행 중",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      icon: CheckCircle,
    };
  } else if (state === "CONFIRMED" && !trainerConfirmed) {
    return {
      variant: "default" as const,
      text: "승인 대기",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      icon: AlertCircle,
    };
  } else if (state === "PENDING") {
    return {
      variant: "default" as const,
      text: "검토 중",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      icon: Clock,
    };
  } else if (state === "REJECTED") {
    return {
      variant: "default" as const,
      text: "거절됨",
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      icon: XCircle,
    };
  } else {
    return {
      variant: "default" as const,
      text: "알 수 없음",
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
      icon: AlertCircle,
    };
  }
};

// 날짜 포맷팅 함수
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type Params = Promise<{ centerId: string; trainerId: string }>;

export default function CenterTrainerDetailPage(props: { params: Params }) {
  const params = use(props.params);
  const { centerId, trainerId } = params;

  const [stateFilter, setStateFilter] = useState<
    "ALL" | "PENDING" | "CONFIRMED" | "REJECTED"
  >("ALL");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [centerDefaultWorkingHours, setCenterDefaultWorkingHours] = useState<WorkingHour[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // API 쿼리 생성
  const ptQueryParams = new URLSearchParams();
  if (stateFilter !== "ALL") ptQueryParams.set("state", stateFilter);

  // 데이터 페칭
  const {
    data: trainerData,
    error: trainerError,
    isLoading: trainerLoading,
  } = useSWR<{
    trainer: ITrainerDetail;
    timestamp?: string;
  }>(`/api/manager/trainers/${trainerId}`, fetcher);

  const {
    data: ptData,
    error: ptError,
    isLoading: ptLoading,
  } = useSWR<{
    ptList: ITrainerPtList;
    timestamp?: string;
  }>(
    `/api/manager/trainers/${trainerId}/pt?${ptQueryParams.toString()}`,
    fetcher
  );

  // 페이지 로딩 시 센터 기본 근무시간 불러오기
  useEffect(() => {
    const loadCenterDefaultWorkingHours = async () => {
      try {
        const response = await fetch(
          `/api/manager/trainers/${trainerId}/center-default-hours`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.defaultWorkingHours) {
            const centerDefaults = data.data.defaultWorkingHours.map((wh: {
              id: string;
              dayOfWeek: string;
              openTime: number;
              closeTime: number;
            }) => ({
              id: wh.id,
              dayOfWeek: wh.dayOfWeek,
              openTime: wh.openTime,
              closeTime: wh.closeTime,
            }));
            setCenterDefaultWorkingHours(centerDefaults);
          }
        }
      } catch (error) {
        console.error("센터 기본 근무시간 불러오기 오류:", error);
      }
    };

    if (trainerId) {
      loadCenterDefaultWorkingHours();
    }
  }, [trainerId]);

  // 로딩 상태
  if (trainerLoading) {
    return <LoadingPage message="트레이너 정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (trainerError) {
    return (
      <PageLayout maxWidth="md">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">
            트레이너 정보를 불러오는데 실패했습니다
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </PageLayout>
    );
  }

  const trainer = trainerData?.trainer;
  const ptList = ptData?.ptList || [];

  if (!trainer) {
    return (
      <PageLayout maxWidth="md">
        <div className="text-center py-12">
          <p className="text-gray-500">트레이너를 찾을 수 없습니다</p>
          <Link href={`/manager/trainers/${centerId}`}>
            <Button variant="outline" className="mt-4">
              센터로 돌아가기
            </Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  // PT 통계 계산
  const ptStats = {
    total: ptList.length,
    confirmed: ptList.filter(
      (pt) => pt.state === "CONFIRMED" && pt.trainerConfirmed
    ).length,
    pending: ptList.filter(
      (pt) =>
        pt.state === "PENDING" ||
        (pt.state === "CONFIRMED" && !pt.trainerConfirmed)
    ).length,
    rejected: ptList.filter((pt) => pt.state === "REJECTED").length,
    totalSessions: ptList.reduce((sum, pt) => sum + pt.stats.totalSessions, 0),
    completedSessions: ptList.reduce(
      (sum, pt) => sum + pt.stats.completedSessions,
      0
    ),
  };

  const overallCompletionRate =
    ptStats.totalSessions > 0
      ? Math.round(
          (ptStats.completedSessions / ptStats.totalSessions) * 100 * 10
        ) / 10
      : 0;

  // 근무시간 모달 핸들러 함수들
  const handleOpenWorkingHoursModal = async () => {
    try {
      // 센터 기본 근무시간 불러오기
      const response = await fetch(
        `/api/manager/trainers/${trainerId}/center-default-hours`
      );
      
      let centerDefaults: WorkingHour[] = [];
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.defaultWorkingHours) {
          centerDefaults = data.data.defaultWorkingHours.map((wh: {
            id: string;
            dayOfWeek: string;
            openTime: number;
            closeTime: number;
          }) => ({
            id: wh.id,
            dayOfWeek: wh.dayOfWeek,
            openTime: wh.openTime,
            closeTime: wh.closeTime,
          }));
        }
      }
      setCenterDefaultWorkingHours(centerDefaults);

      // 현재 트레이너의 근무시간을 state에 설정
      if (trainer.workingHours) {
        const formattedWorkingHours = trainer.workingHours.map((wh) => ({
          id: wh.id,
          dayOfWeek: wh.dayOfWeek,
          openTime: wh.openTime,
          closeTime: wh.closeTime,
        }));
        setWorkingHours(formattedWorkingHours);
      } else {
        setWorkingHours([]);
      }
      
      setHasChanges(false);
      setShowWorkingHoursModal(true);
    } catch (error) {
      console.error("센터 기본 근무시간 불러오기 오류:", error);
      // 센터 기본값 로드 실패해도 모달은 열기
      setCenterDefaultWorkingHours([]);
      
      if (trainer.workingHours) {
        const formattedWorkingHours = trainer.workingHours.map((wh) => ({
          id: wh.id,
          dayOfWeek: wh.dayOfWeek,
          openTime: wh.openTime,
          closeTime: wh.closeTime,
        }));
        setWorkingHours(formattedWorkingHours);
      } else {
        setWorkingHours([]);
      }
      
      setHasChanges(false);
      setShowWorkingHoursModal(true);
    }
  };

  const handleTimeChange = (
    dayOfWeek: string,
    field: "openTime" | "closeTime",
    value: number
  ) => {
    setWorkingHours((prev) => {
      const existing = prev.find((wh) => wh.dayOfWeek === dayOfWeek);
      if (existing) {
        return prev.map((wh) =>
          wh.dayOfWeek === dayOfWeek ? { ...wh, [field]: value } : wh
        );
      } else {
        const newHour: WorkingHour = {
          dayOfWeek,
          openTime: field === "openTime" ? value : 900,
          closeTime: field === "closeTime" ? value : 1800,
        };
        return [...prev, newHour];
      }
    });
    setHasChanges(true);
  };

  const handleAddWorkingHour = (dayOfWeek: string) => {
    // 센터 기본값 찾기
    const centerWorkingHour = centerDefaultWorkingHours.find(
      (wh) => wh.dayOfWeek === dayOfWeek
    );
    
    // 센터 기본값이 있으면 그 값 사용, 없으면 0,0 (휴무)
    const openTime = centerWorkingHour?.openTime || 0;
    const closeTime = centerWorkingHour?.closeTime || 0;
    
    setWorkingHours((prev) => {
      const existing = prev.find((wh) => wh.dayOfWeek === dayOfWeek);
      if (existing) {
        return prev.map((wh) =>
          wh.dayOfWeek === dayOfWeek 
            ? { ...wh, openTime, closeTime }
            : wh
        );
      } else {
        return [
          ...prev,
          {
            dayOfWeek,
            openTime,
            closeTime,
          },
        ];
      }
    });
    setHasChanges(true);
  };

  const handleRemoveWorkingHour = (dayOfWeek: string) => {
    // 삭제하지 않고 0,0으로 설정 (휴무)
    setWorkingHours((prev) => {
      const existing = prev.find((wh) => wh.dayOfWeek === dayOfWeek);
      if (existing) {
        return prev.map((wh) =>
          wh.dayOfWeek === dayOfWeek 
            ? { ...wh, openTime: 0, closeTime: 0 }
            : wh
        );
      } else {
        return [
          ...prev,
          {
            dayOfWeek,
            openTime: 0,
            closeTime: 0,
          },
        ];
      }
    });
    setHasChanges(true);
  };

  const handleSetCenterDefaultHours = async () => {
    // 이미 로드된 센터 기본 근무시간을 사용
    const allDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const newWorkingHours = allDays.map((dayOfWeek) => {
      const centerWorkingHour = centerDefaultWorkingHours.find(
        (wh) => wh.dayOfWeek === dayOfWeek
      );
      
      return {
        dayOfWeek,
        openTime: centerWorkingHour?.openTime || 0,
        closeTime: centerWorkingHour?.closeTime || 0,
      };
    });
    
    setWorkingHours(newWorkingHours);
    setHasChanges(true);
  };

  const handleSaveWorkingHours = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      // 모든 요일이 포함되도록 보장
      const allDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
      const completeWorkingHours = allDays.map((dayOfWeek) => {
        const existing = workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
        return {
          dayOfWeek,
          openTime: existing?.openTime || 0,
          closeTime: existing?.closeTime || 0,
        };
      });

      const response = await fetch(
        `/api/manager/trainers/${trainerId}/working-hours`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workingHours: completeWorkingHours,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("근무시간 저장에 실패했습니다");
      }

      setHasChanges(false);
      setShowWorkingHoursModal(false);
      // 트레이너 데이터 새로고침
      window.location.reload();
    } catch (error) {
      console.error("근무시간 저장 오류:", error);
      alert("근무시간 저장 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout maxWidth="md">
      <PageHeaderWithActions
        title={`${trainer.user.username} 트레이너`}
        subtitle="트레이너 상세 정보 및 PT 관리"
        backHref={`/manager/trainers/${centerId}`}
        backLabel="센터로 돌아가기"
        actionButton={{
          label: "설정",
          onClick: () => {}, // TODO: 설정 페이지로 이동 로직
          icon: <Settings className="w-4 h-4" />,
        }}
      />

      <div className="space-y-6">
        {/* 트레이너 기본 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">기본 정보</h2>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                편집
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 기본 정보 */}
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {trainer.user.avatarMedia?.thumbnailUrl ? (
                      <img
                        src={trainer.user.avatarMedia.thumbnailUrl}
                        alt={trainer.user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {trainer.user.username}
                    </h3>
                    <Badge variant={trainer.working ? "default" : "default"}>
                      {trainer.working ? "활성" : "비활성"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{trainer.user.email}</span>
                  </div>
                  {trainer.user.mobile && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-500" />
                      <span>{trainer.user.mobile}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{trainer.fitnessCenter?.title || "센터 미배정"}</span>
                  </div>
                </div>
              </div>

              {/* 근무시간 정보 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">근무시간</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleOpenWorkingHoursModal}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    편집
                  </Button>
                </div>

                {trainer.workingHours && trainer.workingHours.length > 0 ? (
                  <div className="space-y-2">
                    {trainer.workingHours.map((workingHour) => {
                      const isDifferent = isDifferentFromCenterDefault(
                        workingHour.openTime,
                        workingHour.closeTime,
                        workingHour.dayOfWeek,
                        centerDefaultWorkingHours
                      );
                      
                      return (
                        <div
                          key={workingHour.id}
                          className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {getWeekDayKorean(workingHour.dayOfWeek)}요일
                            </span>
                            {isDifferent && (
                              <div 
                                className="flex items-center justify-center w-5 h-5 bg-orange-100 rounded-full cursor-help"
                                title="센터 기본 근무시간과 다름"
                              >
                                <AlertTriangle className="w-3 h-3 text-orange-600" />
                              </div>
                            )}
                          </div>
                          <span className="text-gray-600">
                            {formatTrainerWorkingTime(workingHour.openTime, workingHour.closeTime)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    근무시간이 설정되지 않았습니다
                  </p>
                )}
                
                {/* 아이콘 설명 */}
                <div className="mt-3 flex items-center space-x-1 text-xs text-gray-500">
                  <AlertTriangle className="w-3 h-3 text-orange-600" />
                  <span>센터 기본 근무시간과 다름</span>
                </div>
              </div>
            </div>

            {/* 트레이너 소개 */}
            {trainer.introduce && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">
                  트레이너 소개
                </h3>
                <p className="text-gray-700">{trainer.introduce}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PT 통계 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">총 PT</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {ptStats.total}개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">진행 중</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {ptStats.confirmed}개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">대기 중</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {ptStats.pending}개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">총 수업</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {ptStats.totalSessions}회
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">완료율</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {overallCompletionRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PT 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">PT 목록</h2>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                size="sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                필터
              </Button>
            </div>
          </CardHeader>

          {showFilters && (
            <CardContent className="border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant={stateFilter === "ALL" ? "primary" : "outline"}
                  onClick={() => setStateFilter("ALL")}
                  size="sm"
                >
                  전체 ({ptStats.total})
                </Button>
                <Button
                  variant={stateFilter === "CONFIRMED" ? "primary" : "outline"}
                  onClick={() => setStateFilter("CONFIRMED")}
                  size="sm"
                >
                  진행 중 ({ptStats.confirmed})
                </Button>
                <Button
                  variant={stateFilter === "PENDING" ? "primary" : "outline"}
                  onClick={() => setStateFilter("PENDING")}
                  size="sm"
                >
                  대기 중 ({ptStats.pending})
                </Button>
                <Button
                  variant={stateFilter === "REJECTED" ? "primary" : "outline"}
                  onClick={() => setStateFilter("REJECTED")}
                  size="sm"
                >
                  거절됨 ({ptStats.rejected})
                </Button>
              </div>
            </CardContent>
          )}

          <CardContent>
            {ptLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : ptError ? (
              <div className="text-center py-8 text-red-600">
                PT 목록을 불러오는데 실패했습니다
              </div>
            ) : ptList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                해당 조건의 PT가 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {ptList.map((pt) => {
                  const statusConfig = getPtStatusConfig(
                    pt.state,
                    pt.trainerConfirmed
                  );
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Link
                      key={pt.id}
                      href={`/manager/trainers/${centerId}/${trainerId}/pt/${pt.id}`}
                      className="block"
                    >
                      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {pt.ptProduct.title}
                              </h3>
                              <Badge variant={statusConfig.variant}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.text}
                              </Badge>
                              {pt.isRegular && (
                                <Badge variant="default">정기</Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                              <div>
                                <label className="text-sm font-medium text-gray-600">
                                  회원
                                </label>
                                <p className="text-gray-900 flex items-center">
                                  <Users className="w-4 h-4 mr-1" />
                                  {pt.member?.user.username || "알 수 없음"}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">
                                  시작일
                                </label>
                                <p className="text-gray-900">
                                  {formatDate(pt.startDate)}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">
                                  가격
                                </label>
                                <p className="text-gray-900">
                                  {pt.ptProduct.price.toLocaleString()}원
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">
                                  총 횟수
                                </label>
                                <p className="text-gray-900">
                                  {pt.ptProduct.totalCount}회
                                </p>
                              </div>
                            </div>

                            {/* PT 진행 상황 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-blue-600 font-medium">
                                  총 수업
                                </p>
                                <p className="text-lg font-semibold text-blue-700">
                                  {pt.stats.totalSessions}회
                                </p>
                              </div>
                              <div className="bg-green-50 p-3 rounded-lg">
                                <p className="text-sm text-green-600 font-medium">
                                  완료 수업
                                </p>
                                <p className="text-lg font-semibold text-green-700">
                                  {pt.stats.completedSessions}회
                                </p>
                              </div>
                              <div className="bg-purple-50 p-3 rounded-lg">
                                <p className="text-sm text-purple-600 font-medium">
                                  완료율
                                </p>
                                <p className="text-lg font-semibold text-purple-700">
                                  {pt.stats.completionRate}%
                                </p>
                              </div>
                            </div>

                            {/* 다음 예정 수업 */}
                            {pt.stats.nextSession && (
                              <div className="bg-yellow-50 p-3 rounded-lg">
                                <label className="text-sm font-medium text-yellow-600">
                                  다음 수업
                                </label>
                                <p className="text-yellow-700">
                                  {formatDateTime(
                                    pt.stats.nextSession.ptSchedule.date
                                  )}
                                  (
                                  {Math.floor(
                                    pt.stats.nextSession.ptSchedule.startTime /
                                      100
                                  )}
                                  :
                                  {String(
                                    pt.stats.nextSession.ptSchedule.startTime %
                                      100
                                  ).padStart(2, "0")}
                                  )
                                </p>
                              </div>
                            )}

                            {/* 설명 */}
                            {pt.description && (
                              <div className="mt-3">
                                <label className="text-sm font-medium text-gray-600">
                                  설명
                                </label>
                                <p className="text-gray-700 text-sm">
                                  {pt.description}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="ml-4">
                            <Eye className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 새로고침 시간 표시 */}
      {ptData?.timestamp && (
        <div className="text-center text-sm text-gray-500 mt-6">
          마지막 업데이트: {new Date(ptData.timestamp).toLocaleString("ko-KR")}
        </div>
      )}

      {/* 근무시간 편집 모달 */}
      {showWorkingHoursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">근무시간 편집</h2>
              <button
                onClick={() => setShowWorkingHoursModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 센터 기본 근무시간으로 설정 버튼 */}
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={handleSetCenterDefaultHours}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                센터 기본 근무시간으로 설정
              </Button>
            </div>

            {/* 요일별 근무시간 설정 */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 mr-2" />
                <h3 className="text-lg font-medium">요일별 근무시간</h3>
              </div>

              {weekDays.map((day) => {
                const existingHour = workingHours.find(
                  (wh) => wh.dayOfWeek === day.key
                );
                const centerWorkingHour = centerDefaultWorkingHours.find(
                  (wh) => wh.dayOfWeek === day.key
                );
                const defaultOpenTime = existingHour ? existingHour.openTime : (centerWorkingHour?.openTime || 0);
                const defaultCloseTime = existingHour ? existingHour.closeTime : (centerWorkingHour?.closeTime || 0);
                const isWorkingDay = existingHour && !(existingHour.openTime === 0 && existingHour.closeTime === 0);

                return (
                  <div key={day.key} className="flex items-center space-x-4">
                    <div className="w-20 text-sm font-medium text-gray-700">
                      {day.label}
                    </div>

                    <div className="flex items-center space-x-4">
                      {isWorkingDay ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={defaultOpenTime}
                            onChange={(e) =>
                              handleTimeChange(
                                day.key,
                                "openTime",
                                parseInt(e.target.value)
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {timeOptions.map((time) => (
                              <option key={time.value} value={time.value}>
                                {time.label}
                              </option>
                            ))}
                          </select>

                          <span className="text-gray-500">~</span>

                          <select
                            value={defaultCloseTime}
                            onChange={(e) =>
                              handleTimeChange(
                                day.key,
                                "closeTime",
                                parseInt(e.target.value)
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {timeOptions.map((time) => (
                              <option key={time.value} value={time.value}>
                                {time.label}
                              </option>
                            ))}
                          </select>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveWorkingHour(day.key)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 text-sm">
                            근무시간 미설정
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddWorkingHour(day.key)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 변경사항 알림 */}
            {hasChanges && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  변경사항이 있습니다. 저장하지 않으면 변경사항이 손실됩니다.
                </p>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowWorkingHoursModal(false)}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSaveWorkingHours}
                disabled={!hasChanges || isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    저장
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
