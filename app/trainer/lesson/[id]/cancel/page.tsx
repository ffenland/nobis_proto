"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import type { CheckLessonCancellableResult } from "@/app/services/trainer/lesson.service";

interface LessonCancelPageProps {
  params: Promise<{ id: string }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LessonCancelPage({ params }: LessonCancelPageProps) {
  const router = useRouter();
  const [lessonId, setLessonId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // params 처리
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setLessonId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  // 취소 가능 여부 데이터 가져오기
  const {
    data: cancelInfo,
    error,
    isLoading,
  } = useSWR<CheckLessonCancellableResult>(
    lessonId ? `/api/trainer/lesson/${lessonId}/cancel` : null,
    fetcher
  );

  // cancelInfo가 로드되면 기존 memo를 reason 초기값으로 설정
  useEffect(() => {
    if (cancelInfo?.lesson?.memo && !reason) {
      setReason(cancelInfo.lesson.memo);
    }
  }, [cancelInfo, reason]);

  // 취소 처리
  const handleCancel = async () => {
    if (!reason.trim()) {
      alert("취소 사유를 입력해주세요.");
      return;
    }

    if (!lessonId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trainer/lesson/${lessonId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert("레슨이 성공적으로 취소되었습니다.");
        if (cancelInfo?.ptId) {
          router.push(`/trainer/pt/${cancelInfo?.ptId}`);
        } else {
          router.push(`/trainer/pt/`);
        }
      } else {
        alert(`취소 실패: ${result.error || "알 수 없는 오류"}`);
      }
    } catch (error) {
      console.error("Cancel lesson error:", error);
      alert("레슨 취소 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩 상태
  if (isLoading || !lessonId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-gray-600">레슨 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
          <p className="text-xl mb-2">오류가 발생했습니다</p>
          <p className="mb-4">레슨 정보를 불러올 수 없습니다.</p>
          <Link href={`/trainer/lesson/${lessonId}`}>
            <Button variant="outline">레슨 상세로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 레슨을 찾을 수 없는 경우
  if (!cancelInfo?.lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <p className="text-xl mb-2">레슨을 찾을 수 없습니다</p>
          <p className="text-gray-600 mb-4">
            {cancelInfo?.reason || "레슨 정보에 접근할 수 없습니다."}
          </p>
          <Link href="/trainer">
            <Button variant="outline">대시보드로 이동</Button>
          </Link>
        </div>
      </div>
    );
  }

  const lesson = cancelInfo.lesson;

  // 이미 취소된 레슨인 경우
  if (lesson.isCanceled) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/trainer/lesson/${lessonId}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold">레슨 취소</h1>
          </div>
        </div>

        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              이미 취소된 레슨입니다
            </h2>
            <div className="text-gray-600 space-y-1">
              <p>
                <span className="font-medium">회원:</span> {lesson.memberName}
              </p>
              <p>
                <span className="font-medium">수업 시간:</span>{" "}
                {format(new Date(lesson.scheduledAt), "M월 d일 (EEEE) HH:mm", {
                  locale: ko,
                })}
              </p>
            </div>
            <div className="mt-6">
              <Link href={`/trainer/lesson/${lessonId}`}>
                <Button variant="default">레슨 상세로 이동</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 취소할 수 없는 경우
  if (!cancelInfo.canCancel) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/trainer/lesson/${lessonId}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold">레슨 취소</h1>
          </div>
        </div>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-red-800 mb-2">
                  레슨을 취소할 수 없습니다
                </h2>
                <div className="text-red-700 space-y-2 mb-4">
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">회원:</span>{" "}
                      {lesson.memberName}
                    </p>
                    <p>
                      <span className="font-medium">수업 시간:</span>{" "}
                      {format(
                        new Date(lesson.scheduledAt),
                        "M월 d일 (EEEE) HH:mm",
                        { locale: ko }
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <p className="font-medium text-red-800">
                      {cancelInfo.reason}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link href={`/trainer/lesson/${lessonId}/record`}>
                    <Button
                      variant="default"
                      className="bg-blue-600 text-white"
                    >
                      기록 페이지로 이동
                    </Button>
                  </Link>
                  <Link href={`/trainer/lesson/${lessonId}`}>
                    <Button variant="outline">레슨 상세로 이동</Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 취소 가능한 경우 - 취소 폼 표시
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href={`/trainer/lesson/${lessonId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">레슨 취소</h1>
        </div>
        <p className="text-gray-600 ml-11">
          예약된 레슨을 취소합니다. 취소된 레슨은 총 수업횟수에서 제외됩니다.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* 레슨 정보 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">레슨 정보</h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <span className="font-medium">회원:</span> {lesson.memberName}
              </p>
              <p>
                <span className="font-medium">수업 시간:</span>{" "}
                {format(new Date(lesson.scheduledAt), "M월 d일 (EEEE) HH:mm", {
                  locale: ko,
                })}
              </p>
            </div>
          </div>

          {/* 취소 사유 입력 */}
          <div className="mb-6">
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              취소 사유 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="레슨 취소 사유를 입력해주세요..."
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              취소 사유는 회원에게 전달되지 않으며, 관리 목적으로만 사용됩니다.
            </p>
          </div>

          {/* 주의사항 */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">취소 시 주의사항</p>
                <ul className="space-y-1 text-xs">
                  <li>• 취소된 레슨은 되돌릴 수 없습니다</li>
                  <li>• 총 수업횟수에서 제외되어 PT 진행에 영향을 줍니다</li>
                  <li>• 회원과의 별도 연락이 필요할 수 있습니다</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 justify-end">
            <Link href={`/trainer/lesson/${lessonId}`}>
              <Button variant="outline" disabled={isSubmitting}>
                취소
              </Button>
            </Link>
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? "처리 중..." : "레슨 취소하기"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
