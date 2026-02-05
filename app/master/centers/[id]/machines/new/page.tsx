"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { X, Plus, Trash2 } from "lucide-react";
import {
  RequestImageUploadResult,
  RequestVideoUploadResult,
} from "@/app/services/media/media.service";
import {
  CreateMachineResult,
  GetAllMachineBrandsResult,
} from "@/app/services/fitness-center/machine.service";
import { getVideoMetadata } from "@/app/lib/utils/media.utils";
import {
  MediaSelector,
  ISelectedMedia,
} from "@/app/components/media/InlineMediaSelect";

type Params = Promise<{ id: string }>;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  const [brand, setBrand] = useState("");
  const [isNewBrand, setIsNewBrand] = useState(false); // 새 브랜드 입력 여부
  const [newBrandName, setNewBrandName] = useState(""); // 새 브랜드 이름
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [spec, setSpec] = useState("");
  const [musclesUsed, setMusclesUsed] = useState("");
  const [settings, setSettings] = useState<MachineSetting[]>([
    {
      id: "setting-1",
      title: "",
      unit: "",
      values: [],
      valueInput: "",
    },
  ]);

  // 머신 브랜드 목록 조회
  const { data: brands } = useSWR<GetAllMachineBrandsResult>(
    "/api/machine-brands",
    fetcher
  );

  // 통합 미디어 state
  const [selectedMedia, setSelectedMedia] = useState<ISelectedMedia>({
    images: [],
    videos: [],
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get centerId from params
  useEffect(() => {
    params.then((p) => setCenterId(p.id));
  }, [params]);

  // 머신 생성 mutation
  const { trigger: createMachine } = useSWRMutation(
    centerId ? `/api/master/centers/${centerId}/machines` : null,
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
  const handleRemoveSettingValue = (
    settingId: string,
    valueToRemove: string
  ) => {
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
  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    settingId: string
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAddSettingValue(settingId);
    }
  };

  // 폼 제출 - integrated image upload + machine creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("머신 제목을 입력해주세요.");
      return;
    }

    // 브랜드 검증
    const finalBrand = isNewBrand ? newBrandName.trim() : brand;
    if (!finalBrand) {
      alert("머신 브랜드를 선택하거나 입력해주세요.");
      return;
    }

    if (!description.trim()) {
      alert("머신 설명을 입력해주세요.");
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

    if (
      selectedMedia.images.length === 0 &&
      selectedMedia.videos.length === 0
    ) {
      alert("머신 이미지 또는 비디오를 선택해주세요.");
      return;
    }

    const confirmCreate = window.confirm(
      `${selectedMedia.images.length}개의 이미지와 ${selectedMedia.videos.length}개의 비디오를 함께 머신을 생성하시겠습니까?`
    );
    if (!confirmCreate) return;

    setIsUploading(true);

    try {
      // 1. 머신 생성 단계 (이미지 없이)
      setUploadProgress(20);

      const finalBrand = isNewBrand ? newBrandName.trim() : brand;
      const machineData = {
        title: title.trim(),
        brand: finalBrand,
        model: model.trim() || null,
        description: description.trim(),
        spec: spec.trim() || null,
        musclesUsed: musclesUsed.trim() || null,
        settings: validSettings.map((setting) => ({
          title: setting.title.trim(),
          unit: setting.unit.trim(),
          values: setting.values,
        })),
      };

      const machineResult: CreateMachineResult = await createMachine(
        machineData
      );
      const machineId = machineResult.id;

      setUploadProgress(40);

      // 2. 이미지 업로드 및 연결 단계
      const totalMediaCount =
        selectedMedia.images.length + selectedMedia.videos.length;
      let uploadedCount = 0;

      for (let i = 0; i < selectedMedia.images.length; i++) {
        const imageFile = selectedMedia.images[i];
        uploadedCount++;
        setUploadProgress(40 + (uploadedCount / totalMediaCount) * 50); // 40%~90%

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
          throw new Error("이미지 업로드 URL 생성에 실패했습니다.");
        }
        const { uploadURL, id }: RequestImageUploadResult =
          await uploadUrlResponse.json();

        // Cloudflare 직접 업로드
        const formData = new FormData();
        formData.append("file", imageFile.file);
        const uploadResponse = await fetch(uploadURL, {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) {
          throw new Error("이미지 업로드에 실패했습니다.");
        }

        // 업로드 확인 및 DB 저장 (machineId와 연결, isPrimary 포함)
        const confirmResponse = await fetch("/api/media/images/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cloudflareId: id,
            entityType: "MACHINE",
            entityId: machineId, // 생성된 machineId 사용
            isPrimary: imageFile.isPrimary ? true : undefined, // 대표 이미지인 경우만 전달
          }),
        });
        if (!confirmResponse.ok) {
          throw new Error("이미지 업로드 확인에 실패했습니다.");
        }
      }

      // 3. 비디오 업로드 및 연결 단계
      for (let i = 0; i < selectedMedia.videos.length; i++) {
        const file = selectedMedia.videos[i].file;
        uploadedCount++;
        setUploadProgress(40 + (uploadedCount / totalMediaCount) * 50); // 40%~90%

        // 비디오 메타데이터 추출
        const { duration } = await getVideoMetadata(file);

        // Upload URL 요청
        const uploadUrlResponse = await fetch("/api/media/videos/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "MACHINE",
            entityId: machineId, // 생성된 machineId 사용
            metadata: {
              type: "machine-demo",
              duration: duration.toString(),
            },
          }),
        });
        if (!uploadUrlResponse.ok) {
          throw new Error("비디오 업로드 URL 생성에 실패했습니다.");
        }
        const { uploadURL, uid }: RequestVideoUploadResult =
          await uploadUrlResponse.json();

        // Cloudflare Stream에 직접 업로드 (TUS 프로토콜)
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch(uploadURL, {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) {
          throw new Error("비디오 업로드에 실패했습니다.");
        }

        // 업로드 확인 및 DB 저장 (machineId와 연결)
        const confirmResponse = await fetch("/api/media/videos/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            streamId: uid,
            entityType: "MACHINE",
            entityId: machineId, // 생성된 machineId 사용
          }),
        });
        if (!confirmResponse.ok) {
          throw new Error("비디오 업로드 확인에 실패했습니다.");
        }
      }

      setUploadProgress(100);
      alert("머신이 성공적으로 생성되었습니다!");
      router.push(`/master/centers/${centerId}/machines`);
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
    <div className="h-full overflow-auto p-2">
      {/* Upload Progress Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">머신 생성 중</h3>
              <p className="text-gray-600 mb-4">
                {uploadProgress < 40
                  ? "머신을 생성하고 있습니다..."
                  : uploadProgress < 90
                  ? "미디어를 업로드하고 있습니다..."
                  : "마무리하고 있습니다..."}
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

      <div className="">
        <h1 className="text-2xl font-bold mb-6">새 머신 등록</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">기본 정보</h2>

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
                placeholder="예: 스미스머신, Seated Leg Press"
                required
              />
            </div>

            {/* 브랜드 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">브랜드 *</span>
              </label>

              {/* 브랜드 선택 / 새로 입력 토글 */}
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  className={`btn btn-sm ${
                    !isNewBrand ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => setIsNewBrand(false)}
                >
                  기존 브랜드 선택
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    isNewBrand ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => setIsNewBrand(true)}
                >
                  새 브랜드 입력
                </button>
              </div>

              {!isNewBrand ? (
                // 기존 브랜드 선택
                <select
                  className="select select-bordered w-full"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                >
                  <option value="">브랜드를 선택하세요</option>
                  {brands?.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} ({b._count.machines}개 머신)
                    </option>
                  ))}
                </select>
              ) : (
                // 새 브랜드 입력
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="예: HammerStrength, NewTech"
                  required
                />
              )}
            </div>

            {/* 모델 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">모델명</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="예: MX-100"
              />
            </div>

            {/* 설명 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">설명 *</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="머신에 대한 설명을 입력하세요"
                required
              />
            </div>

            {/* 사용 근육 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">사용 근육</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={musclesUsed}
                onChange={(e) => setMusclesUsed(e.target.value)}
                placeholder="예: 전완근, 대퇴사두근"
              />
            </div>

            {/* 제원 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">제원 (스펙)</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-24"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="예: 가로 120cm, 세로 80cm, 높이 200cm"
              />
            </div>
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
                          handleUpdateSetting(
                            setting.id,
                            "title",
                            e.target.value
                          )
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
                          handleUpdateSetting(
                            setting.id,
                            "unit",
                            e.target.value
                          )
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
                          handleUpdateSetting(
                            setting.id,
                            "valueInput",
                            e.target.value
                          )
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
                            onClick={() =>
                              handleRemoveSettingValue(setting.id, value)
                            }
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

          {/* 미디어 선택 */}
          <MediaSelector
            isUploading={isUploading}
            selectedMedia={selectedMedia}
            setSelectedMedia={setSelectedMedia}
            maxImageCount={3}
            maxVideoCount={3}
          />

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
    </div>
  );
}
