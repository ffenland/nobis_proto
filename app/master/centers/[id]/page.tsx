"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Edit, Save, X, Trash2, Clock, MapPin, Phone, FileText, Users, Calendar } from "lucide-react";
import { usePostcode } from "@/app/lib/hooks/usePostcode";
import { formatTime } from "@/app/lib/utils/time.utils";
import type { GetMasterFitnessCenterInfoResult } from "@/app/services/master/master-center.service";
import { MediaSelector, type ISelectedMedia } from "@/app/components/media/InlineMediaSelect";

// 요일 정보
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

  if (hours === 24) {
    return { value: 2400, label: "24:00" };
  }

  return {
    value: hours * 100 + minutes,
    label: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
  };
});

type Params = Promise<{ id: string }>;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 미디어 삭제 요청
const deleteMediaRequest = async (mediaId: string) => {
  const response = await fetch(`/api/media/images/${mediaId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete media");
  }
  return response.json();
};

export default function CenterDetailPage({ params }: { params: Params }) {
  const [centerId, setCenterId] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    address: "",
    addressDetail: "",
    postCode: "",
    phone: "",
    description: "",
  });

  // OpeningHours state
  const [openingHours, setOpeningHours] = useState<Array<{
    dayOfWeek: string;
    openTime: number;
    closeTime: number;
    isClosed: boolean;
  }>>([]);
  const [closedDays, setClosedDays] = useState<Set<string>>(new Set());

  // 새로 추가할 이미지
  const [selectedMedia, setSelectedMedia] = useState<ISelectedMedia>({
    images: [],
    videos: [],
  });
  const [isUploading, setIsUploading] = useState(false);

  // Params 가져오기
  useEffect(() => {
    params.then((p) => {
      setCenterId(p.id);
    });
  }, [params]);

  // 센터 데이터 페칭
  const { data: center, error, mutate } = useSWR<GetMasterFitnessCenterInfoResult>(
    centerId ? `/api/master/centers/${centerId}` : null,
    fetcher
  );

  // 우편번호 API
  const {
    isReady: isPostcodeReady,
    addressData,
    openPostcode,
    PostcodeScript,
  } = usePostcode({
    width: 500,
    height: 600,
    includeExtraAddress: false,
  });

  // 초기 데이터 설정
  useEffect(() => {
    if (center) {
      setFormData({
        address: center.address,
        addressDetail: center.addressDetail,
        postCode: center.postCode,
        phone: center.phone,
        description: center.description,
      });

      // OpeningHours 초기화
      if (center.openingHours && center.openingHours.length > 0) {
        setOpeningHours(center.openingHours);
        const closed = new Set<string>();
        center.openingHours.forEach((hour) => {
          if (hour.isClosed) {
            closed.add(hour.dayOfWeek);
          }
        });
        setClosedDays(closed);
      } else {
        // 기본 영업시간 설정
        const defaultHours = weekDays.map((day) => ({
          dayOfWeek: day.key,
          openTime: 600, // 06:00
          closeTime: 2200, // 22:00
          isClosed: false,
        }));
        setOpeningHours(defaultHours);
      }
    }
  }, [center]);

  // 주소 검색 결과 반영
  useEffect(() => {
    if (addressData) {
      setFormData((prev) => ({
        ...prev,
        address: addressData.address,
        postCode: addressData.postCode,
      }));
    }
  }, [addressData]);

  // 휴무일 토글
  const handleDayClosedToggle = (dayKey: string) => {
    const newClosedDays = new Set(closedDays);
    if (newClosedDays.has(dayKey)) {
      newClosedDays.delete(dayKey);
    } else {
      newClosedDays.add(dayKey);
    }
    setClosedDays(newClosedDays);

    // OpeningHours 업데이트
    setOpeningHours((prev) =>
      prev.map((hour) =>
        hour.dayOfWeek === dayKey
          ? { ...hour, isClosed: newClosedDays.has(dayKey) }
          : hour
      )
    );
  };

  // 영업시간 변경
  const handleTimeChange = (dayKey: string, field: "openTime" | "closeTime", value: number) => {
    setOpeningHours((prev) =>
      prev.map((hour) =>
        hour.dayOfWeek === dayKey ? { ...hour, [field]: value } : hour
      )
    );
  };

  // 수정 모드 취소
  const handleCancel = () => {
    setIsEditMode(false);
    setSelectedMedia({ images: [], videos: [] });
    // 원래 값으로 되돌리기
    if (center) {
      setFormData({
        address: center.address,
        addressDetail: center.addressDetail,
        postCode: center.postCode,
        phone: center.phone,
        description: center.description,
      });
      if (center.openingHours && center.openingHours.length > 0) {
        setOpeningHours(center.openingHours);
        const closed = new Set<string>();
        center.openingHours.forEach((hour) => {
          if (hour.isClosed) closed.add(hour.dayOfWeek);
        });
        setClosedDays(closed);
      }
    }
  };

  // 이미지 삭제
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("이 이미지를 삭제하시겠습니까?")) return;

    try {
      await deleteMediaRequest(imageId);
      mutate();
      alert("이미지가 성공적으로 삭제되었습니다.");
    } catch (error) {
      console.error("이미지 삭제 실패:", error);
      alert("이미지 삭제 중 오류가 발생했습니다.");
    }
  };

  // 대표 이미지 설정
  const handleSetPrimaryImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/media/images/${imageId}/set-primary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "FITNESS_CENTER", entityId: centerId }),
      });

      if (!response.ok) {
        throw new Error("대표 이미지 설정 실패");
      }

      mutate();
      alert("대표 이미지가 설정되었습니다.");
    } catch (error) {
      console.error("대표 이미지 설정 실패:", error);
      alert("대표 이미지 설정 중 오류가 발생했습니다.");
    }
  };

  // 저장
  const handleSave = async () => {
    setIsSaving(true);

    try {
      // 1. 새 이미지 업로드
      for (const imgData of selectedMedia.images) {
        // Upload URL 획득
        const uploadUrlResponse = await fetch("/api/media/images/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "FITNESS_CENTER",
            entityId: centerId,
          }),
        });
        const { uploadURL, customId } = await uploadUrlResponse.json();

        // Cloudflare 업로드
        const formData = new FormData();
        formData.append("file", imgData.file);
        await fetch(uploadURL, { method: "POST", body: formData });

        // DB 저장
        await fetch("/api/media/images/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cloudflareId: customId,
            entityType: "FITNESS_CENTER",
            entityId: centerId,
            isPrimary: imgData.isPrimary,
          }),
        });
      }

      // 2. 센터 정보 업데이트
      const response = await fetch(`/api/master/centers/${centerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: formData.address,
          addressDetail: formData.addressDetail,
          postCode: formData.postCode,
          phone: formData.phone,
          description: formData.description,
          openingHours: openingHours,
        }),
      });

      if (!response.ok) {
        throw new Error("센터 정보 수정 실패");
      }

      // 성공
      alert("센터 정보가 성공적으로 수정되었습니다.");
      setIsEditMode(false);
      setSelectedMedia({ images: [], videos: [] });
      mutate();
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="alert alert-error">
          <span>센터 정보를 불러오는데 실패했습니다.</span>
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <>
      <PostcodeScript />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/master/centers">
              <button className="btn btn-ghost btn-sm">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{center.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {center.inOperation ? "운영중" : "미운영"}
              </p>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            {!isEditMode ? (
              <>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="btn btn-primary"
                >
                  <Edit className="w-4 h-4" />
                  수정하기
                </button>
                <Link href={`/master/centers/${centerId}/machines`} className="btn btn-outline">
                  머신 관리
                </Link>
                <Link href={`/master/centers/${centerId}/equipments`} className="btn btn-outline">
                  운동기구 관리
                </Link>
              </>
            ) : (
              <>
                <button onClick={handleCancel} className="btn btn-ghost" disabled={isSaving}>
                  <X className="w-4 h-4" />
                  취소
                </button>
                <button onClick={handleSave} className="btn btn-success" disabled={isSaving}>
                  {isSaving ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  저장
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* 기본 정보 섹션 */}
          <div className="card bg-white shadow-md">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">기본 정보</h2>

              {/* 주소 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    주소
                  </span>
                </label>
                {isEditMode ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.address}
                        readOnly
                        className="input input-bordered flex-1"
                        placeholder="주소"
                      />
                      <button
                        type="button"
                        onClick={openPostcode}
                        className="btn btn-primary"
                        disabled={!isPostcodeReady}
                      >
                        주소 검색
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.postCode}
                      readOnly
                      className="input input-bordered w-40"
                      placeholder="우편번호"
                    />
                    <input
                      type="text"
                      value={formData.addressDetail}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, addressDetail: e.target.value }))
                      }
                      className="input input-bordered w-full"
                      placeholder="상세주소"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    <div>{center.address}</div>
                    <div className="text-gray-500">{center.addressDetail}</div>
                    <div className="text-gray-400 text-xs mt-1">우편번호: {center.postCode}</div>
                  </div>
                )}
              </div>

              {/* 전화번호 */}
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    전화번호
                  </span>
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="input input-bordered"
                    placeholder="전화번호"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{center.phone}</div>
                )}
              </div>

              {/* 설명 */}
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    센터 설명
                  </span>
                </label>
                {isEditMode ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="textarea textarea-bordered h-24"
                    placeholder="센터 설명"
                  />
                ) : (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {center.description}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 이미지 섹션 */}
          <div className="card bg-white shadow-md">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">센터 이미지</h2>

              {/* 기존 이미지 */}
              {center.images && center.images.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">현재 이미지</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {center.images.map((img) => (
                      <div key={img.id} className="relative group">
                        <Image
                          src={`https://imagedelivery.net/0lhjeB6p33CQhWWHLAXXVA/${img.cloudflareId}/public`}
                          alt="센터 이미지"
                          width={200}
                          height={200}
                          className="rounded-lg object-cover w-full h-40"
                        />
                        {img.isPrimary && (
                          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            대표
                          </div>
                        )}
                        {isEditMode && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!img.isPrimary && (
                              <button
                                onClick={() => handleSetPrimaryImage(img.id)}
                                className="btn btn-xs btn-primary"
                              >
                                대표 설정
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteImage(img.id)}
                              className="btn btn-xs btn-error"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 새 이미지 추가 */}
              {isEditMode && (
                <div>
                  <h3 className="text-sm font-medium mb-2">새 이미지 추가</h3>
                  <MediaSelector
                    isUploading={isUploading}
                    selectedMedia={selectedMedia}
                    setSelectedMedia={setSelectedMedia}
                    maxImageCount={10}
                    maxVideoCount={0}
                    enableImages={true}
                    enableVideos={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 영업시간 섹션 */}
          <div className="card bg-white shadow-md">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                영업시간
              </h2>

              <div className="space-y-3">
                {weekDays.map((day) => {
                  const hourData = openingHours.find((h) => h.dayOfWeek === day.key);
                  const isClosed = closedDays.has(day.key);

                  return (
                    <div key={day.key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-16 font-medium text-sm">{day.label}</div>

                      {isEditMode ? (
                        <>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isClosed}
                              onChange={() => handleDayClosedToggle(day.key)}
                              className="checkbox checkbox-sm"
                            />
                            <span className="text-sm">휴무</span>
                          </label>

                          {!isClosed && hourData && (
                            <div className="flex items-center gap-2">
                              <select
                                value={hourData.openTime}
                                onChange={(e) =>
                                  handleTimeChange(day.key, "openTime", Number(e.target.value))
                                }
                                className="select select-sm select-bordered"
                              >
                                {timeOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-sm">~</span>
                              <select
                                value={hourData.closeTime}
                                onChange={(e) =>
                                  handleTimeChange(day.key, "closeTime", Number(e.target.value))
                                }
                                className="select select-sm select-bordered"
                              >
                                {timeOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-700">
                          {isClosed || !hourData
                            ? "휴무"
                            : `${formatTime(hourData.openTime)} - ${formatTime(hourData.closeTime)}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 트레이너 목록 - 읽기 전용 */}
          <div className="card bg-white shadow-md">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                소속 트레이너 ({center.trainers.length}명)
              </h2>
              {center.trainers.length === 0 ? (
                <p className="text-gray-500 text-sm">소속 트레이너가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {center.trainers.map((trainer) => (
                    <div
                      key={trainer.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-sm">{trainer.user.realname}</div>
                        <div className="text-xs text-gray-500">@{trainer.user.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 매니저 목록 - 읽기 전용 */}
          <div className="card bg-white shadow-md">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                소속 매니저 ({center.managers.length}명)
              </h2>
              {center.managers.length === 0 ? (
                <p className="text-gray-500 text-sm">소속 매니저가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {center.managers.map((manager) => (
                    <div
                      key={manager.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-sm">{manager.user.realname}</div>
                        <div className="text-xs text-gray-500">@{manager.user.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 휴무일 목록 - 읽기 전용 */}
          <div className="card bg-white shadow-md">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                센터 휴무일 ({center.offDays.length}일)
              </h2>
              {center.offDays.length === 0 ? (
                <p className="text-gray-500 text-sm">등록된 휴무일이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {center.offDays.map((day) => (
                    <div
                      key={day.id}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg text-center"
                    >
                      <div className="text-sm font-medium text-red-700">
                        {new Date(day.date).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
