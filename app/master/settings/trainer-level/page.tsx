"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import {
  Award,
  Users,
  Package,
  Plus,
  Edit2,
  Trash2,
  User,
  ArrowLeft,
} from "lucide-react";
import type { GetAllTrainerLevelsResult } from "@/app/services/master/master-trainer.service";
import Link from "next/link";
import TrainerLevelModal from "./TrainerLevelModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TrainerLevelManagementPage = () => {
  const {
    data: levels,
    error,
    isLoading,
    mutate,
  } = useSWR<GetAllTrainerLevelsResult>("/api/master/trainers/level", fetcher);

  const [expandedLevelId, setExpandedLevelId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<{
    id: string;
    title: string;
    displayTitle: string;
    trainerIds: string[];
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !levels) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-2">
            트레이너 레벨 정보를 불러올 수 없습니다
          </p>
          <Button onClick={() => mutate()}>다시 시도</Button>
        </div>
      </div>
    );
  }

  const toggleLevelExpanded = (levelId: string) => {
    setExpandedLevelId(expandedLevelId === levelId ? null : levelId);
  };

  const handleCreateClick = () => {
    setEditingLevel(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (level: GetAllTrainerLevelsResult[0]) => {
    setEditingLevel({
      id: level.id,
      title: level.title,
      displayTitle: level.displayTitle,
      trainerIds: level.trainers.map((t) => t.id),
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingLevel(null);
  };

  const handleModalSuccess = () => {
    mutate(); // 목록 갱신
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Link
              href="/manager/trainers"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                트레이너 레벨 관리
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                트레이너 레벨 설정 및 트레이너 할당 관리
              </p>
            </div>
          </div>

          <Button
            className="flex items-center gap-2"
            onClick={handleCreateClick}
          >
            <Plus className="w-4 h-4" />새 레벨 추가
          </Button>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">전체 레벨</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {levels.length}개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">전체 트레이너</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {levels.reduce((sum, level) => sum + level.trainerCount, 0)}
                    명
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">활성 상품 연결</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {levels.reduce(
                      (sum, level) => sum + level.ptProductCount,
                      0
                    )}
                    개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 레벨 목록 */}
        <div className="space-y-4">
          {levels.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">
                  등록된 트레이너 레벨이 없습니다
                </p>
                <Button onClick={handleCreateClick}>첫 레벨 추가하기</Button>
              </CardContent>
            </Card>
          ) : (
            levels.map((level) => (
              <Card key={level.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Award className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {level.displayTitle}
                        </h3>
                        <p className="text-sm text-gray-600">
                          내부 코드: {level.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(level)}
                      >
                        <Edit2 className="w-4 h-4" />
                        수정
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* 레벨 통계 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-600">트레이너</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900 mt-1">
                        {level.trainerCount}명
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">
                          활성 상품
                        </span>
                      </div>
                      <p className="text-xl font-bold text-green-900 mt-1">
                        {level.ptProductCount}개
                      </p>
                    </div>
                  </div>

                  {/* 트레이너 목록 토글 */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleLevelExpanded(level.id)}
                      className="w-full"
                    >
                      {expandedLevelId === level.id
                        ? "트레이너 목록 접기"
                        : `트레이너 목록 보기 (${level.trainerCount}명)`}
                    </Button>

                    {expandedLevelId === level.id && (
                      <div className="mt-2 grid gap-1 grid-cols-4 md:grid-cols-6">
                        {level.trainers.length === 0 ? (
                          <div className="p-4 bg-gray-50 rounded-lg text-center">
                            <p className="text-gray-600 text-sm">
                              이 레벨에 할당된 트레이너가 없습니다
                            </p>
                          </div>
                        ) : (
                          level.trainers.map((trainer) => (
                            <div
                              key={trainer.id}
                              className="p-2 flex flex-col justify-center items-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900">
                                  {trainer.realname ?? "실명 미기재"}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 mt-1">
                                  {trainer.fitnessCenter ?? "미소속"}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* TrainerLevel Modal */}
      <TrainerLevelModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingLevel={editingLevel}
        onMutate={mutate}
      />
    </div>
  );
};

export default TrainerLevelManagementPage;
