// app/trainer/pt/pending/[id]/RejectionForm.tsx
import { Button } from "@/app/components/ui/Button";
import { rejectPtAction, type TPendingPtDetail } from "./actions";
import { XCircle, MessageSquare } from "lucide-react";

interface RejectionFormProps {
  ptId: string;
  ptDetail: TPendingPtDetail;
}

const RejectionForm = ({ ptId, ptDetail }: RejectionFormProps) => {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <XCircle className="w-5 h-5 text-red-600" />
        <h4 className="font-medium text-red-900">거절</h4>
      </div>
      
      <div className="space-y-3">
        <div className="text-sm text-red-800">
          <p className="mb-2">
            <strong>{ptDetail.member?.user.username}</strong>님의 PT 신청을 거절합니다.
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>PT 상태가 &quot;거절됨&quot;으로 변경됩니다</li>
            <li>예정된 {ptDetail.ptRecord.length}개 수업 일정이 삭제됩니다</li>
            <li>해당 시간대가 다른 회원에게 개방됩니다</li>
          </ul>
        </div>
        
        <form action={rejectPtAction.bind(null, ptId)}>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-red-900 mb-2">
              <MessageSquare className="w-4 h-4" />
              거절 사유
            </label>
            <textarea
              name="reason"
              rows={3}
              className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              placeholder="거절 사유를 입력해주세요..."
              required
            />
          </div>
          
          <div className="bg-red-100 p-2 rounded text-xs text-red-800 mb-3">
            ⚠️ 거절된 PT는 거절 목록에서 확인할 수 있습니다.
          </div>
          
          <Button
            type="submit"
            variant="outline"
            className="w-full border-red-300 text-red-700 hover:bg-red-100"
          >
            거절하기
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RejectionForm;