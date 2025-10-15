"use client";

import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  IManagerFreeExerciseList,
  IManagerStretchingExerciseList,
} from "@/app/services/manager/manager-exercise.service";

type SortOption = "title" | "count";

const ExercisePage = () => {
  const { data, isLoading, error } = useSWR<{
    freeExercises: IManagerFreeExerciseList;
    stretchingExercises: IManagerStretchingExerciseList;
  }>("/api/manager/exercises");

  const [freeSortBy, setFreeSortBy] = useState<SortOption>("title");
  const [stretchingSortBy, setStretchingSortBy] = useState<SortOption>("title");

  if (isLoading) return null;
  if (error) return <div className="p-4 text-error">데이터 로딩 실패</div>;
  if (!data) return null;

  const sortExercises = <T extends { title: string; _count: any }>(
    exercises: T[],
    sortBy: SortOption,
    countKey: string
  ) => {
    return [...exercises].sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title, "ko");
      } else {
        return b._count[countKey] - a._count[countKey];
      }
    });
  };

  const sortedFreeExercises = sortExercises(
    data.freeExercises,
    freeSortBy,
    "freeSetRecords"
  );
  const sortedStretchingExercises = sortExercises(
    data.stretchingExercises,
    stretchingSortBy,
    "stretchingExerciseRecord"
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <h1 className="text-2xl font-bold mb-6">운동 목록</h1>

      {/* 모바일: 전체 스크롤, 데스크톱: 각 그룹별 스크롤 */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-y-auto md:overflow-y-hidden min-h-0">
        {/* Free Exercise Group */}
        <div className="flex-shrink-0 md:flex-1 flex flex-col border rounded-lg p-4 md:min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">프리 운동</h2>
            <div className="flex items-center gap-2">
              <select
                className="select select-sm select-bordered"
                value={freeSortBy}
                onChange={(e) => setFreeSortBy(e.target.value as SortOption)}
              >
                <option value="title">가나다순</option>
                <option value="count">레슨횟수</option>
              </select>
              <Link
                href="/manager/exercise/new-free"
                className="btn btn-sm btn-primary"
              >
                <Plus className="w-4 h-4" />
                새로운 운동 추가
              </Link>
            </div>
          </div>

          <div className="md:overflow-y-auto md:flex-1">
            <div className="space-y-2">
              {sortedFreeExercises.map((exercise, index) => (
                <Link
                  key={index}
                  href={`/manager/exercise/free/${exercise.id}`}
                  className="p-3 border-2 border-blue-300 rounded-lg flex justify-between items-center hover:border-blue-400 transition-colors cursor-pointer"
                >
                  <span className="font-medium text-blue-700">{exercise.title}</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {exercise._count.freeSetRecords}회
                  </span>
                </Link>
              ))}
              {sortedFreeExercises.length === 0 && (
                <div className="text-center text-base-content/50 py-8">
                  등록된 운동이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stretching Exercise Group */}
        <div className="flex-shrink-0 md:flex-1 flex flex-col border rounded-lg p-4 md:min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">스트레칭</h2>
            <div className="flex items-center gap-2">
              <select
                className="select select-sm select-bordered"
                value={stretchingSortBy}
                onChange={(e) =>
                  setStretchingSortBy(e.target.value as SortOption)
                }
              >
                <option value="title">가나다순</option>
                <option value="count">레슨횟수</option>
              </select>
              <Link
                href="/manager/exercise/new-stretching"
                className="btn btn-sm btn-primary"
              >
                <Plus className="w-4 h-4" />
                새로운 운동 추가
              </Link>
            </div>
          </div>

          <div className="md:overflow-y-auto md:flex-1">
            <div className="space-y-2">
              {sortedStretchingExercises.map((exercise, index) => (
                <Link
                  key={index}
                  href={`/manager/exercise/stretching/${exercise.id}`}
                  className="p-3 border-2 border-orange-300 rounded-lg flex justify-between items-center hover:border-orange-400 transition-colors cursor-pointer"
                >
                  <span className="font-medium text-orange-700">{exercise.title}</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {exercise._count.stretchingExerciseRecord}회
                  </span>
                </Link>
              ))}
              {sortedStretchingExercises.length === 0 && (
                <div className="text-center text-base-content/50 py-8">
                  등록된 운동이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExercisePage;
