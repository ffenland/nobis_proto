"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTrainerProfile,
  updateTrainerProfile,
} from "@/app/trainer/profile/actions";
import { TrainerOffManager } from "./trainerOffManager";
import { WeekDay } from "@prisma/client";
import Image from "next/image";

interface TrainerOff {
  id: string;
  weekDay: WeekDay | null;
  date: Date | null;
  startTime: number;
  endTime: number;
}

interface TrainerData {
  id: string;
  introduce: string;
  avatar: string | null;
  trainerOff: TrainerOff[];
}

export function TrainerProfile({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [trainerData, setTrainerData] = useState<TrainerData | null>(null);
  const [introduce, setIntroduce] = useState("");
  const [avatar, setAvatar] = useState("");

  const loadTrainerData = useCallback(async () => {
    try {
      const data = await getTrainerProfile(userId);
      if (data) {
        setTrainerData(data);
        setIntroduce(data.introduce);
        setAvatar(data.avatar || "");
      }
    } catch (error) {
      alert("프로필 정보를 불러오는데 실패했습니다.");
    }
  }, [userId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await updateTrainerProfile(userId, {
        introduce,
        avatar,
      });
      await loadTrainerData();
      setIsEditing(false);
      alert("프로필이 업데이트되었습니다.");
    } catch (error) {
      alert("프로필 업데이트에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadTrainerData();
  }, [loadTrainerData]);

  if (!trainerData) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <h2 className="card-title">{trainerData.user.username}</h2>
            <button
              className="btn btn-sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "취소" : "수정"}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">자기소개</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-24"
                  placeholder="자기소개를 입력해주세요"
                  value={introduce}
                  onChange={(e) => setIntroduce(e.target.value)}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">프로필 이미지 URL</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="프로필 이미지 URL을 입력해주세요"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? "저장 중..." : "저장하기"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">자기소개</h3>
                <p className="mt-2 whitespace-pre-wrap">
                  {trainerData.introduce}
                </p>
              </div>
              {trainerData.avatar && (
                <div>
                  <h3 className="font-medium">프로필 이미지</h3>
                  <Image
                    src={trainerData.avatar}
                    alt="프로필 이미지"
                    className="mt-2 w-32 h-32 object-cover rounded-lg"
                    width={128}
                    height={128}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">휴무 관리</h2>
          <TrainerOffManager
            userId={userId}
            trainerOffs={trainerData.trainerOff}
            onOffsChange={loadTrainerData}
          />
        </div>
      </div>
    </div>
  );
}
