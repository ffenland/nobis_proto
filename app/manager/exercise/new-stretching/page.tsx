"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RequestImageUploadResult,
  RequestVideoUploadResult,
} from "@/app/services/media/media.service";
import { GetStretchingExercisesResult } from "@/app/services/exercise/exercise.service";
import useSWR from "swr";
import {
  MediaSelector,
  ISelectedMedia,
} from "@/app/components/media/InlineMediaSelect";
import { getVideoMetadata } from "@/app/lib/utils/media.utils";

export default function NewStretchingExercisePage() {
  const router = useRouter();

  // 폼 상태
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // 통합 미디어 state
  const [selectedMedia, setSelectedMedia] = useState<ISelectedMedia>({
    images: [],
    videos: [],
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isExist, setIsExist] = useState(false);

  const {
    data: preloadedStretchingExercises,
    mutate: mutateStretchingExercises,
  } = useSWR<GetStretchingExercisesResult>("/api/exercises/stretching");

  // 공백 제거 함수
  const removeAllSpaces = (str: string) => str.replace(/\s+/g, "");

  // 운동 이름 중복 검증
  const validateExerciseName = () => {
    if (!title.trim() || !preloadedStretchingExercises) {
      setIsExist(false);
      return;
    }

    const normalizedInput = removeAllSpaces(title.trim());
    const exists = preloadedStretchingExercises.some((exercise) => {
      const normalizedExisting = removeAllSpaces(exercise.title);
      return normalizedInput === normalizedExisting;
    });

    setIsExist(exists);
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("운동 제목을 입력해주세요.");
      return;
    }

    if (isExist) {
      alert("이미 존재하는 운동 이름입니다.");
      return;
    }

    if (!description.trim()) {
      alert("스트레칭 운동은 설명이 필수입니다.");
      return;
    }

    const confirmCreate = window.confirm(
      `스트레칭 운동을 생성하시겠습니까?\n이미지: ${selectedMedia.images.length}개\n비디오: ${selectedMedia.videos.length}개`
    );
    if (!confirmCreate) return;

    setIsUploading(true);

    try {
      // 1. Exercise 생성
      setUploadProgress(10);
      const exerciseResponse = await fetch("/api/exercises/stretching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (!exerciseResponse.ok) {
        throw new Error("운동 생성에 실패했습니다.");
      }

      const { id: exerciseId } = await exerciseResponse.json();
      setUploadProgress(20);

      // 2. 이미지 업로드
      const totalMedia = selectedMedia.images.length + selectedMedia.videos.length;
      let uploadedCount = 0;

      for (const imageItem of selectedMedia.images) {
        const file = imageItem.file;
        // Upload URL 요청
        const uploadUrlResponse = await fetch("/api/media/images/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "STRETCHING",
            entityId: exerciseId,
          }),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error("이미지 업로드 URL 생성에 실패했습니다.");
        }

        const { uploadURL, id }: RequestImageUploadResult =
          await uploadUrlResponse.json();

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

        // 업로드 확인
        const confirmResponse = await fetch("/api/media/images/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cloudflareId: id,
            entityType: "STRETCHING",
            entityId: exerciseId,
          }),
        });

        if (!confirmResponse.ok) {
          throw new Error("이미지 업로드 확인에 실패했습니다.");
        }

        uploadedCount++;
        setUploadProgress(20 + (uploadedCount / totalMedia) * 60);
      }

      // 3. 비디오 업로드
      for (const videoItem of selectedMedia.videos) {
        const file = videoItem.file;

        // 비디오 메타데이터 추출
        const { duration } = await getVideoMetadata(file);
        // Upload URL 요청
        const uploadUrlResponse = await fetch("/api/media/videos/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "STRETCHING",
            entityId: exerciseId,
            metadata: {
              type: "stretching",
              duration: duration.toString(),
            },
          }),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error("비디오 업로드 URL 생성에 실패했습니다.");
        }

        const { uploadURL, uid }: RequestVideoUploadResult =
          await uploadUrlResponse.json();

        // Cloudflare Stream 직접 업로드
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch(uploadURL, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("비디오 업로드에 실패했습니다.");
        }

        // 업로드 확인
        const confirmResponse = await fetch("/api/media/videos/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            streamId: uid,
            entityType: "STRETCHING",
            entityId: exerciseId,
          }),
        });

        if (!confirmResponse.ok) {
          throw new Error("비디오 업로드 확인에 실패했습니다.");
        }

        uploadedCount++;
        setUploadProgress(20 + (uploadedCount / totalMedia) * 60);
      }

      setUploadProgress(100);
      alert("스트레칭 운동이 성공적으로 생성되었습니다!");
      router.push("/manager/exercise");
    } catch (error) {
      console.error("운동 생성 실패:", error);
      if (error instanceof Error) {
        alert(`운동 생성에 실패했습니다: ${error.message}`);
      } else {
        alert("운동 생성에 실패했습니다.");
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
              <h3 className="text-lg font-semibold mb-2">운동 생성 중</h3>
              <p className="text-gray-600 mb-4">
                {uploadProgress < 20
                  ? "운동을 생성하고 있습니다..."
                  : uploadProgress < 80
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

      <div className="h-full container mx-auto px-4 py-8 max-w-4xl overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">새 스트레칭 운동 등록</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 운동 제목 */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">운동 제목 *</span>
            </label>
            <input
              type="text"
              className={`input input-bordered w-full ${isExist ? "input-error" : ""}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={validateExerciseName}
              placeholder="예: 햄스트링 스트레칭, 어깨 스트레칭"
              required
            />
            {isExist && (
              <label className="label">
                <span className="label-text-alt text-error">
                  이미 존재하는 운동 이름입니다. 다른 이름을 사용해주세요.
                </span>
              </label>
            )}
          </div>

          {/* 설명 (필수) */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">설명 *</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="스트레칭 운동에 대한 설명을 입력하세요 (필수)"
              rows={3}
              required
            />
          </div>

          {/* 미디어 선택 */}
          <MediaSelector
            isUploading={isUploading}
            selectedMedia={selectedMedia}
            setSelectedMedia={setSelectedMedia}
            maxImageCount={5}
            maxVideoCount={3}
          />

          {/* 제출 버튼 */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isUploading || isExist}
            >
              {isUploading ? (
                <span className="loading loading-spinner"></span>
              ) : (
                "운동 생성"
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
