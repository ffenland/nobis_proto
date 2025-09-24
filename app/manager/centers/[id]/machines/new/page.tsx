"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import useSWRMutation from "swr/mutation";
import { X, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

type Params = Promise<{ id: string }>;

// 머신 설정 타입
interface MachineSetting {
  id: string; // 임시 ID (생성시에만 사용)
  title: string;
  unit: string;
  values: string[];
  valueInput: string; // 값 입력용 임시 필드
}

const createMachineFetcher = async (url: string, { arg }: { arg: any }) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create machine");
  }

  return response.json();
};

export default function NewMachinePage({ params }: { params: Params }) {
  const router = useRouter();
  const [centerId, setCenterId] = useState<string>("");

  // 폼 상태
  const [title, setTitle] = useState("");
  const [settings, setSettings] = useState<MachineSetting[]>([
    {
      id: "setting-1",
      title: "",
      unit: "",
      values: [],
      valueInput: "",
    },
  ]);

  // 이미지 상태 - simplified system
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get centerId from params
  useEffect(() => {
    params.then((p) => setCenterId(p.id));
  }, [params]);

  // 머신 생성 mutation
  const { trigger: createMachine } = useSWRMutation(
    centerId ? `/api/fitness-center/${centerId}/machines` : null,
    createMachineFetcher
  );

  // 설정 추가
  const handleAddSetting = () => {
    const newSetting: MachineSetting = {
      id: `setting-${Date.now()}`,
      title: "",
      unit: "",
      values: [],
      valueInput: "",
    };
    setSettings([...settings, newSetting]);
  };

  // 설정 제거
  const handleRemoveSetting = (settingId: string) => {
    if (settings.length <= 1) {
      alert("최소 하나의 설정은 필요합니다.");
      return;
    }
    setSettings(settings.filter((s) => s.id !== settingId));
  };

  // 설정 업데이트
  const handleUpdateSetting = (
    settingId: string,
    field: keyof MachineSetting,
    value: string
  ) => {
    setSettings(
      settings.map((setting) =>
        setting.id === settingId ? { ...setting, [field]: value } : setting
      )
    );
  };

  // 설정 값 추가
  const handleAddSettingValue = (settingId: string) => {
    const setting = settings.find((s) => s.id === settingId);
    if (!setting || !setting.valueInput.trim()) return;

    const value = setting.valueInput.trim();
    if (setting.values.includes(value)) return;

    setSettings(
      settings.map((s) =>
        s.id === settingId
          ? {
              ...s,
              values: [...s.values, value],
              valueInput: "",
            }
          : s
      )
    );
  };

  // 설정 값 제거
  const handleRemoveSettingValue = (settingId: string, valueToRemove: string) => {
    setSettings(
      settings.map((s) =>
        s.id === settingId
          ? {
              ...s,
              values: s.values.filter((v) => v !== valueToRemove),
            }
          : s
      )
    );
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, settingId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAddSettingValue(settingId);
    }
  };

  // Handle adding image to selected files (preview only)
  const handleAddImage = (file: File) => {
    const currentCount = selectedFiles.length;

    if (currentCount >= 3) {
      alert("최대 3개까지만 이미지를 추가할 수 있습니다.");
      return;
    }

    // Add to selected files
    setSelectedFiles((prev: File[]) => [...prev, file]);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFilePreviews((prev: string[]) => [...prev, previewUrl]);
  };

  // Remove selected image
  const handleRemoveImage = (index: number) => {
    // Revoke preview URL to free memory
    URL.revokeObjectURL(filePreviews[index]);

    setSelectedFiles((prev: File[]) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev: string[]) => prev.filter((_, i) => i !== index));
  };


  // 폼 제출 - integrated image upload + machine creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("머신 제목을 입력해주세요.");
      return;
    }

    // 설정 검증
    const validSettings = settings.filter(
      (setting) =>
        setting.title.trim() && setting.unit.trim() && setting.values.length > 0
    );

    if (validSettings.length === 0) {
      alert("최소 하나의 완성된 설정(제목, 단위, 값)을 입력해주세요.");
      return;
    }

    if (selectedFiles.length === 0) {
      alert("머신 이미지를 선택해주세요.");
      return;
    }

    const confirmCreate = window.confirm(
      `${selectedFiles.length}개의 이미지와 함께 머신을 생성하시겠습니까?`
    );
    if (!confirmCreate) return;

    setIsUploading(true);

    try {
      // 1. 머신 생성 단계 (이미지 없이)
      setUploadProgress(20);

      const machineData = {
        title: title.trim(),
        settings: validSettings.map((setting) => ({
          title: setting.title.trim(),
          unit: setting.unit.trim(),
          values: setting.values,
        })),
      };

      const machineResult = await createMachine(machineData);
      const machineId = machineResult.id;

      setUploadProgress(40);

      // 2. 이미지 업로드 및 연결 단계

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(40 + ((i + 1) / selectedFiles.length) * 40); // 40%~80%

        // Upload URL 요청
        const uploadUrlResponse = await fetch("/api/media/images/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "MACHINE",
            entityId: machineId, // 생성된 machineId 사용
          }),
        });
        if (!uploadUrlResponse.ok) {
          throw new Error("업로드 URL 생성에 실패했습니다.");
        }
        const { uploadURL, id } = await uploadUrlResponse.json();

        // Cloudflare 직접 업로드
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch(uploadURL, {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) {
          throw new Error("이미지 업로드에 실패했습니다.");
        }

        // 업로드 확인 및 DB 저장 (machineId와 연결)
        const confirmResponse = await fetch("/api/media/images/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cloudflareId: id,
            entityType: "MACHINE",
            entityId: machineId, // 생성된 machineId 사용
          }),
        });
        if (!confirmResponse.ok) {
          throw new Error("업로드 확인에 실패했습니다.");
        }

        // 이미지가 성공적으로 연결됨 (imageId는 사용하지 않음)
      }

      setUploadProgress(100);
      alert("머신이 성공적으로 생성되었습니다!");
      router.push(`/manager/centers/${centerId}/machines`);
    } catch (error) {
      console.error("머신 생성 실패:", error);
      if (error instanceof Error) {
        alert(`머신 생성에 실패했습니다: ${error.message}`);
      } else {
        alert("머신 생성에 실패했습니다.");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      {/* Upload Progress Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">머신 생성 중</h3>
              <p className="text-gray-600 mb-4">
                {uploadProgress < 70
                  ? "이미지를 업로드하고 있습니다..."
                  : uploadProgress < 85
                  ? "머신을 생성하고 있습니다..."
                  : "마무리하고 있습니다..."
                }
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{uploadProgress}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">새 머신 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 머신 제목 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">머신 제목 *</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 스미스머신, 렉풀다운머신"
            required
          />
        </div>

        {/* 머신 설정 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">머신 설정</h2>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleAddSetting}
            >
              <Plus className="w-4 h-4" />
              설정 추가
            </button>
          </div>

          {settings.map((setting, index) => (
            <div key={setting.id} className="card bg-base-100 shadow-md">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">설정 {index + 1}</h3>
                  {settings.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() => handleRemoveSetting(setting.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* 설정 제목 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">설정 제목 *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={setting.title}
                      onChange={(e) =>
                        handleUpdateSetting(setting.id, "title", e.target.value)
                      }
                      placeholder="예: 무게, 각도, 높이"
                    />
                  </div>

                  {/* 단위 */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">단위 *</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={setting.unit}
                      onChange={(e) =>
                        handleUpdateSetting(setting.id, "unit", e.target.value)
                      }
                      placeholder="예: kg, 도, cm"
                    />
                  </div>
                </div>

                {/* 값 입력 */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      값 입력 (입력 후 Enter 또는 Space를 누르면 추가됩니다.)
                    </span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="input input-bordered flex-1"
                      value={setting.valueInput}
                      onChange={(e) =>
                        handleUpdateSetting(setting.id, "valueInput", e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(e, setting.id)}
                      placeholder="값을 입력하고 Enter 또는 Space를 누르세요"
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleAddSettingValue(setting.id)}
                    >
                      <Plus className="w-4 h-4" />
                      추가
                    </button>
                  </div>

                  {/* 값 목록 */}
                  <div className="flex flex-wrap gap-2">
                    {setting.values.map((value) => (
                      <div key={value} className="badge badge-lg gap-2">
                        <span>{value}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSettingValue(setting.id, value)}
                          className="text-error"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 이미지 선택 */}
        <div className="form-control">
          <div className="flex items-center justify-between mb-2">
            <label className="label">
              <span className="label-text">
                이미지 ({selectedFiles.length}/3)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Selected images (preview only) */}
            {selectedFiles.map((_, index) => (
              <div key={`selected-${index}`} className="relative">
                <Image
                  src={filePreviews[index]}
                  alt="Selected image"
                  width={128}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  disabled={isUploading}
                  className="absolute top-2 right-2 btn btn-circle btn-xs btn-error"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="bg-gray-500 bg-opacity-90 text-white text-xs px-2 py-1 rounded text-center">
                    선택됨
                  </div>
                </div>
              </div>
            ))}

            {/* Add new image button */}
            {selectedFiles.length < 3 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-32">
                <label className="cursor-pointer w-full h-full flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach((file) => handleAddImage(file));
                      // Reset input
                      e.target.value = "";
                    }}
                    disabled={isUploading}
                  />
                  <div className="text-center">
                    <Plus className="w-8 h-8 mx-auto text-gray-400" />
                    <span className="text-sm text-gray-500">이미지 추가</span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              "머신 생성"
            )}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.back()}
            disabled={isUploading}
          >
            취소
          </button>
        </div>
      </form>
      </div>
    </>
  );
}