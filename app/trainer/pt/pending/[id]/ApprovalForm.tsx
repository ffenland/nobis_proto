// app/trainer/pt/pending/[id]/ApprovalForm.tsx
import { Button } from "@/app/components/ui/Button";
import { approvePtAction, type TPendingPtDetail } from "./actions";
import { CheckCircle } from "lucide-react";

interface ApprovalFormProps {
  ptId: string;
  ptDetail: TPendingPtDetail;
}

const ApprovalForm = ({ ptId, ptDetail }: ApprovalFormProps) => {
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <h4 className="font-medium text-green-900">승인</h4>
      </div>
      
      <div className="space-y-3">
        <div className="text-sm text-green-800">
          <p className="mb-2">
            <strong>{ptDetail.member?.user.username}</strong>님의 PT 신청을 승인합니다.
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>PT 상태가 &quot;진행중&quot;으로 변경됩니다</li>
            <li>예정된 {ptDetail.ptRecord.length}개 수업이 활성화됩니다</li>
            <li>회원과 함께 PT를 시작할 수 있습니다</li>
          </ul>
        </div>
        
        <div className="bg-green-100 p-2 rounded text-xs text-green-800">
          💡 승인 후에는 회원과 직접 연락하여 결제를 진행해주세요.
        </div>
        
        <form action={approvePtAction.bind(null, ptId)}>
          <Button
            type="submit"
            variant="primary"
            className="w-full bg-green-600 hover:bg-green-700"
          >
            승인하기
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ApprovalForm;