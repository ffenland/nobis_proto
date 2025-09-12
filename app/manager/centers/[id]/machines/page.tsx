"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Settings, Plus } from "lucide-react";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import Image from "next/image";
import { IMachinesByFitnessCenter } from "@/app/services/fitness-center/machine.service";

type Params = Promise<{ id: string }>;

// Fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CenterMachinesPage({ params }: { params: Params }) {
  const router = useRouter();
  const [centerId, setCenterId] = useState<string>("");

  // Get params
  useEffect(() => {
    params.then((p) => {
      setCenterId(p.id);
    });
  }, [params]);

  // Fetch machines data
  const {
    data: machines,
    error,
    isLoading,
  } = useSWR<IMachinesByFitnessCenter[]>(
    centerId ? `/api/fitness-center/${centerId}/machines` : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 text-lg mb-2">
              데이터를 불러올 수 없습니다
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">센터 머신 목록</h1>
            <p className="text-gray-600 mt-1">
              총 {machines?.length || 0}개의 머신이 등록되어 있습니다
            </p>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            router.push(`/manager/centers/${centerId}/machines/new`);
          }}
        >
          <Plus className="w-5 h-5" />
          머신 추가
        </button>
      </div>

      {/* Machines Grid */}
      {machines && machines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {machines.map((machine) => (
            <div key={machine.id} className="card bg-base-100 shadow-xl">
              <figure className="px-6 pt-6">
                {machine.imageUrl ? (
                  <div className="relative h-52 w-full">
                    <Image
                      src={getOptimizedImageUrl(machine.imageUrl, "avatar")}
                      alt={machine.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="rounded-xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-40 w-full bg-gray-200 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Settings className="w-12 h-12 mx-auto mb-2" />
                      <span className="text-sm">이미지 없음</span>
                    </div>
                  </div>
                )}
              </figure>
              <div className="card-body">
                <h2 className="card-title text-lg">{machine.name}</h2>

                {/* Machine Settings Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">설정 항목:</span>
                    <span className="font-medium">
                      {machine.settings.length}개
                    </span>
                  </div>

                  {machine.settings.length > 0 && (
                    <div className="text-sm">
                      <p className="text-gray-600 mb-1">설정 목록:</p>
                      <div className="flex flex-wrap gap-1">
                        {machine.settings.slice(0, 3).map((setting) => (
                          <span
                            key={setting.id}
                            className="badge badge-outline badge-sm"
                          >
                            {setting.name}
                          </span>
                        ))}
                        {machine.settings.length > 3 && (
                          <span className="badge badge-outline badge-sm">
                            +{machine.settings.length - 3}개
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      router.push(
                        `/manager/centers/${centerId}/machines/${machine.id}`
                      );
                    }}
                  >
                    상세보기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty State
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              등록된 머신이 없습니다
            </h2>
            <p className="text-gray-500 mb-4">
              이 센터에는 아직 머신이 등록되지 않았습니다.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                router.push(`/manager/centers/${centerId}/machines/new`);
              }}
            >
              머신 추가하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
