// 미디어 업로드 헬퍼 함수

export async function uploadMediaFiles(
  ptRecordId: string,
  ptRecordItemId: string,
  imageFiles: File[],
  videoFiles: File[]
) {
  const uploadResults = {
    images: [] as string[],
    videos: [] as string[],
    errors: [] as string[],
  };

  // 이미지 업로드
  for (const imageFile of imageFiles) {
    try {
      // 1. 업로드 URL 가져오기
      const uploadUrlResponse = await fetch(
        `/api/trainer/pt-records/${ptRecordId}/items/${ptRecordItemId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaType: "image" }),
        }
      );

      if (!uploadUrlResponse.ok) {
        throw new Error("이미지 업로드 URL 생성 실패");
      }

      const uploadData = await uploadUrlResponse.json();
      console.log("이미지 업로드 URL 응답:", uploadData);
      
      const { uploadURL, customId } = uploadData;
      
      if (!uploadURL || !customId) {
        throw new Error(`업로드 URL 응답이 올바르지 않습니다. uploadURL: ${uploadURL}, customId: ${customId}`);
      }

      // 2. Cloudflare에 이미지 업로드
      const formData = new FormData();
      formData.append("file", imageFile);

      const uploadResponse = await fetch(uploadURL, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`이미지 업로드 실패: ${uploadResponse.status} - ${errorText}`);
      }

      // 3. DB에 저장
      const saveBody = {
        mediaType: "image",
        cloudflareId: customId,
        originalName: imageFile.name,
        mimeType: imageFile.type,
        size: imageFile.size,
      };
      
      console.log("이미지 DB 저장 요청 body:", saveBody);
      
      const saveResponse = await fetch(
        `/api/trainer/pt-records/${ptRecordId}/items/${ptRecordItemId}/media`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saveBody),
        }
      );

      if (!saveResponse.ok) {
        const errorData = await saveResponse.text();
        console.error("이미지 DB 저장 실패:", errorData);
        throw new Error(`이미지 정보 저장 실패: ${saveResponse.status} - ${errorData}`);
      }

      const { id } = await saveResponse.json();
      uploadResults.images.push(id);
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "업로드 실패";
      const sizeInMB = (imageFile.size / 1024 / 1024).toFixed(1);
      uploadResults.errors.push(`${imageFile.name} (${sizeInMB}MB): ${errorMessage}`);
    }
  }

  // 비디오 업로드
  for (const videoFile of videoFiles) {
    try {
      // 1. 업로드 URL 가져오기
      const uploadUrlResponse = await fetch(
        `/api/trainer/pt-records/${ptRecordId}/items/${ptRecordItemId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaType: "video" }),
        }
      );

      if (!uploadUrlResponse.ok) {
        throw new Error("비디오 업로드 URL 생성 실패");
      }

      const uploadData = await uploadUrlResponse.json();
      console.log("비디오 업로드 URL 응답:", uploadData);
      
      const { uploadURL, uid } = uploadData;
      
      if (!uploadURL || !uid) {
        throw new Error(`업로드 URL 응답이 올바르지 않습니다. uploadURL: ${uploadURL}, uid: ${uid}`);
      }

      // 2. Cloudflare에 비디오 업로드
      const formData = new FormData();
      formData.append("file", videoFile);

      const uploadResponse = await fetch(uploadURL, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`비디오 업로드 실패: ${uploadResponse.status} - ${errorText}`);
      }

      // 3. DB에 저장
      const saveBody = {
        mediaType: "video",
        streamId: uid,
        originalName: videoFile.name,
        mimeType: videoFile.type,
        size: videoFile.size,
        duration: 0, // 실제 duration은 서버에서 처리
      };
      
      console.log("비디오 DB 저장 요청 body:", saveBody);
      
      const saveResponse = await fetch(
        `/api/trainer/pt-records/${ptRecordId}/items/${ptRecordItemId}/media`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saveBody),
        }
      );

      if (!saveResponse.ok) {
        throw new Error("비디오 정보 저장 실패");
      }

      const { id } = await saveResponse.json();
      uploadResults.videos.push(id);
    } catch (error) {
      console.error("비디오 업로드 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "업로드 실패";
      const sizeInMB = (videoFile.size / 1024 / 1024).toFixed(1);
      uploadResults.errors.push(`${videoFile.name} (${sizeInMB}MB): ${errorMessage}`);
    }
  }

  return uploadResults;
}