"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import FreeRecord from "../components/FreeRecord";
import MachineRecord from "../components/MachineRecord";
import StretchingRecord from "../components/StretchingRecord";
import { Button } from "@/app/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { TPtRecordItem } from "./actions";
import type { IMachine, IEquipment } from "@/app/lib/services/pt-record.service";
import type { 
  FreeRecordSubmitData, 
  MachineRecordSubmitData, 
  StretchingRecordSubmitData 
} from "../components/types";
import { uploadMediaFiles } from "../components/uploadMedia";

interface EditItemFormProps {
  item: TPtRecordItem;
  ptId: string;
  ptRecordId: string;
  centerId: string;
}

// API fetcher 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch");
    }
    return res.json();
  });

export default function EditItemForm({ item, ptId, ptRecordId, centerId }: EditItemFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [deletedVideoIds, setDeletedVideoIds] = useState<string[]>([]);

  // 머신 목록 조회
  const { data: machineList } = useSWR<IMachine[]>(
    item.type === "MACHINE" ? `/api/trainer/machines?centerId=${centerId}` : null,
    fetcher
  );

  // 기구 목록 조회
  const { data: equipmentList } = useSWR<IEquipment[]>(
    item.type === "FREE" || item.type === "STRETCHING" 
      ? `/api/trainer/equipment?centerId=${centerId}` 
      : null,
    fetcher
  );

  // 미디어 삭제 핸들러
  const handleDeleteImage = async (imageId: string) => {
    if (confirm("이미지를 삭제하시겠습니까?")) {
      try {
        const response = await fetch(
          `/api/trainer/pt-records/${ptRecordId}/items/${item.id}/media/${imageId}?type=image`,
          { method: "DELETE" }
        );
        
        if (!response.ok) {
          throw new Error("이미지 삭제 실패");
        }
        
        setDeletedImageIds(prev => [...prev, imageId]);
      } catch (error) {
        console.error("이미지 삭제 중 오류:", error);
        alert("이미지 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (confirm("동영상을 삭제하시겠습니까?")) {
      try {
        const response = await fetch(
          `/api/trainer/pt-records/${ptRecordId}/items/${item.id}/media/${videoId}?type=video`,
          { method: "DELETE" }
        );
        
        if (!response.ok) {
          throw new Error("동영상 삭제 실패");
        }
        
        setDeletedVideoIds(prev => [...prev, videoId]);
      } catch (error) {
        console.error("동영상 삭제 중 오류:", error);
        alert("동영상 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  // 제출 핸들러
  const handleSubmit = async (data: FreeRecordSubmitData | MachineRecordSubmitData | StretchingRecordSubmitData) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      if (item.type === "FREE" && "sets" in data) {
        const freeData = data as FreeRecordSubmitData;
        formData.append("title", freeData.title);
        formData.append("description", freeData.description || "");
        formData.append("freeExerciseId", freeData.freeExerciseId);
        formData.append("setCount", freeData.sets.length.toString());
        
        freeData.sets.forEach((set, index) => {
          formData.append(`sets[${index}].id`, item.freeSetRecords[index]?.id || "");
          formData.append(`sets[${index}].set`, set.set.toString());
          formData.append(`sets[${index}].reps`, set.reps.toString());
          
          set.equipmentIds.forEach((equipmentId: string, eqIndex: number) => {
            formData.append(`sets[${index}].equipments[${eqIndex}]`, equipmentId);
          });
        });
        
        // Add deleted media IDs
        deletedImageIds.forEach((id, index) => {
          formData.append(`deletedImages[${index}]`, id);
        });
        deletedVideoIds.forEach((id, index) => {
          formData.append(`deletedVideos[${index}]`, id);
        });
        
        // Handle media uploads if any
        if (freeData.imageFiles?.length || freeData.videoFiles?.length) {
          const uploadResults = await uploadMediaFiles(
            ptRecordId,
            item.id,
            freeData.imageFiles || [],
            freeData.videoFiles || []
          );
          
          if (uploadResults.errors.length > 0) {
            console.error("일부 미디어 업로드 실패:", uploadResults.errors);
            alert(`일부 파일 업로드 실패:\n${uploadResults.errors.join('\n')}`);
          }
        }
        
        const response = await fetch(`/api/trainer/pt-records/${ptRecordId}/items/${item.id}?type=free`, {
          method: "PUT",
          body: formData,
        });
        
        if (!response.ok) throw new Error("수정 실패");
        
      } else if (item.type === "MACHINE" && "machineSetRecords" in data) {
        const machineData = data as MachineRecordSubmitData;
        formData.append("title", machineData.machineName || "");
        formData.append("description", machineData.details || "");
        formData.append("setCount", machineData.machineSetRecords.length.toString());
        
        machineData.machineSetRecords.forEach((set, index) => {
          formData.append(`sets[${index}].id`, item.machineSetRecords[index]?.id || "");
          formData.append(`sets[${index}].set`, set.set.toString());
          formData.append(`sets[${index}].reps`, set.reps.toString());
          
          set.settingValueIds.forEach((valueId: string, svIndex: number) => {
            const settingValue = item.machineSetRecords[index]?.settingValues[svIndex];
            if (settingValue) {
              formData.append(`sets[${index}].settings[${svIndex}].settingValueId`, settingValue.id);
              formData.append(`sets[${index}].settings[${svIndex}].value`, valueId);
            }
          });
        });
        
        // Add deleted media IDs
        deletedImageIds.forEach((id, index) => {
          formData.append(`deletedImages[${index}]`, id);
        });
        deletedVideoIds.forEach((id, index) => {
          formData.append(`deletedVideos[${index}]`, id);
        });
        
        // Handle media uploads if any
        if (machineData.imageFiles?.length || machineData.videoFiles?.length) {
          const uploadResults = await uploadMediaFiles(
            ptRecordId,
            item.id,
            machineData.imageFiles || [],
            machineData.videoFiles || []
          );
          
          if (uploadResults.errors.length > 0) {
            console.error("일부 미디어 업로드 실패:", uploadResults.errors);
            alert(`일부 파일 업로드 실패:\n${uploadResults.errors.join('\n')}`);
          }
        }
        
        const response = await fetch(`/api/trainer/pt-records/${ptRecordId}/items/${item.id}?type=machine`, {
          method: "PUT",
          body: formData,
        });
        
        if (!response.ok) throw new Error("수정 실패");
        
      } else if (item.type === "STRETCHING" && "stretchingExerciseId" in data) {
        const stretchingData = data as StretchingRecordSubmitData;
        formData.append("exerciseId", stretchingData.stretchingExerciseId);
        formData.append("description", stretchingData.description || "");
        
        stretchingData.equipmentIds.forEach((equipmentId, index) => {
          formData.append(`equipments[${index}]`, equipmentId);
        });
        
        // Add deleted media IDs
        deletedImageIds.forEach((id, index) => {
          formData.append(`deletedImages[${index}]`, id);
        });
        deletedVideoIds.forEach((id, index) => {
          formData.append(`deletedVideos[${index}]`, id);
        });
        
        // Handle media uploads if any
        if (stretchingData.imageFiles?.length || stretchingData.videoFiles?.length) {
          const uploadResults = await uploadMediaFiles(
            ptRecordId,
            item.id,
            stretchingData.imageFiles || [],
            stretchingData.videoFiles || []
          );
          
          if (uploadResults.errors.length > 0) {
            console.error("일부 미디어 업로드 실패:", uploadResults.errors);
            alert(`일부 파일 업로듍 실패:\n${uploadResults.errors.join('\n')}`);
          }
        }
        
        const response = await fetch(`/api/trainer/pt-records/${ptRecordId}/items/${item.id}?type=stretching`, {
          method: "PUT",
          body: formData,
        });
        
        if (!response.ok) throw new Error("수정 실패");
      }
      
      router.push(`/trainer/pt/${ptId}/${ptRecordId}/edit`);
      router.refresh();
    } catch (error) {
      console.error("수정 실패:", error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    router.push(`/trainer/pt/${ptId}/${ptRecordId}/edit`);
  };

  // 로딩 중
  if ((item.type === "MACHINE" && !machineList) || 
      ((item.type === "FREE" || item.type === "STRETCHING") && !equipmentList)) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 프리웨이트 */}
      {item.type === "FREE" && equipmentList && (
        <FreeRecord
          ptRecordId={ptRecordId}
          onComplete={handleComplete}
          equipmentList={equipmentList}
          mode="edit"
          ptRecordItemId={item.id}
          initialData={{
            title: item.title || "",
            description: item.description || "",
            freeExerciseId: item.freeSetRecords[0]?.freeExercise?.id,
            sets: item.freeSetRecords.map((record) => ({
              id: record.id,
              set: record.set,
              reps: record.reps,
              equipments: record.equipments,
            })),
          }}
          onSubmit={handleSubmit}
          existingImages={item.images.filter(img => !deletedImageIds.includes(img.id))}
          existingVideos={item.videos.filter(vid => !deletedVideoIds.includes(vid.id))}
          onRemoveExistingImage={handleDeleteImage}
          onRemoveExistingVideo={handleDeleteVideo}
        />
      )}

      {/* 머신 운동 */}
      {item.type === "MACHINE" && machineList && (
        <MachineRecord
          ptRecordId={ptRecordId}
          onComplete={handleComplete}
          machineList={machineList}
          mode="edit"
          ptRecordItemId={item.id}
          initialData={{
            title: item.title || undefined,
            description: item.description || "",
            machineId: item.machineSetRecords[0]?.settingValues[0]?.machineSetting?.machineId,
            sets: item.machineSetRecords.map((record) => ({
              id: record.id,
              set: record.set,
              reps: record.reps,
              settingValues: record.settingValues.map((sv) => ({
                settingId: sv.machineSetting.id,
                value: parseInt(sv.value),
              })),
            })),
          }}
          onSubmit={handleSubmit}
          existingImages={item.images.filter(img => !deletedImageIds.includes(img.id))}
          existingVideos={item.videos.filter(vid => !deletedVideoIds.includes(vid.id))}
          onRemoveExistingImage={handleDeleteImage}
          onRemoveExistingVideo={handleDeleteVideo}
        />
      )}

      {/* 스트레칭 */}
      {item.type === "STRETCHING" && equipmentList && (
        <StretchingRecord
          ptRecordId={ptRecordId}
          onComplete={handleComplete}
          equipmentList={equipmentList}
          mode="edit"
          ptRecordItemId={item.id}
          initialData={{
            stretchingExerciseId: item.stretchingExerciseRecords[0]?.stretchingExercise?.id,
            description: item.description || item.stretchingExerciseRecords[0]?.description || "",
            equipments: item.stretchingExerciseRecords[0]?.equipments || [],
          }}
          onSubmit={handleSubmit}
          existingImages={item.images.filter(img => !deletedImageIds.includes(img.id))}
          existingVideos={item.videos.filter(vid => !deletedVideoIds.includes(vid.id))}
          onRemoveExistingImage={handleDeleteImage}
          onRemoveExistingVideo={handleDeleteVideo}
        />
      )}

      {/* 뒤로가기 버튼 */}
      <div className="flex">
        <Link href={`/trainer/pt/${ptId}/${ptRecordId}/edit`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            편집 페이지로 돌아가기
          </Button>
        </Link>
      </div>
    </div>
  );
}