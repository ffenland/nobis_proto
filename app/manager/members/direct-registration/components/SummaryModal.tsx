"use client";

import { CheckCircle } from "lucide-react";
import type { 
  CreateDirectRegistrationResult,
  SearchMembersResult,
  GetTrainersResult
} from "@/app/lib/services/manager/direct-registration.service";

interface SummaryModalProps {
  result: CreateDirectRegistrationResult;
  member: SearchMembersResult[0];
  trainer: GetTrainersResult[0];
  onClose: () => void;
}

export default function SummaryModal({ result, member, trainer, onClose }: SummaryModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          
          <h2 className="text-xl font-semibold text-center mb-2">
            기존 수업 등록 완료
          </h2>
          
          <p className="text-gray-600 text-center mb-6">
            {member.user.username}님의 기존 수업이 성공적으로 등록되었습니다.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">회원</span>
              <span className="font-medium">{member.user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">담당 트레이너</span>
              <span className="font-medium">{trainer.user.username}</span>
            </div>
            {trainer.fitnessCenter && (
              <div className="flex justify-between">
                <span className="text-gray-600">센터</span>
                <span className="font-medium">{trainer.fitnessCenter.title}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">총 수업 횟수</span>
              <span className="font-medium">{result.totalCount}회</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">등록된 일정</span>
              <span className="font-medium">{result.schedulesCount}개</span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}