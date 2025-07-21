// app/trainer/pt/[id]/[ptRecordId]/edit/components/EditTimeRestrictionNotice.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import {
  Clock,
  AlertTriangle,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { type TEditTimePermission } from "../actions";

interface EditTimeRestrictionNoticeProps {
  ptId: string;
  ptRecordId: string;
  timeInfo: TEditTimePermission;
}

const EditTimeRestrictionNotice = ({ 
  ptId, 
  ptRecordId, 
  timeInfo 
}: EditTimeRestrictionNoticeProps) => {
  const formatDateTime = (date: Date) => {
    return `${formatDateThisYear(date)} ${formatTimeToString(
      date.getHours(),
      date.getMinutes()
    )}`;
  };

  const formatTime = (date: Date) => {
    return formatTimeToString(date.getHours(), date.getMinutes());
  };

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader
        title="운동 기록 작성 불가"
        subtitle="현재는 운동 기록을 작성할 수 없는 시간입니다"
      />

      <div className="space-y-6">
        {/* 메인 안내 카드 */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-8 text-center">
            <div className="text-orange-600 mb-4">
              <Clock className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-orange-900 mb-4">
              🕐 운동 기록 작성 불가
            </h2>
            <p className="text-orange-800 text-lg mb-6">
              현재는 운동 기록을 작성할 수 없는 시간입니다.
            </p>
            
            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <div className="text-orange-900 font-medium mb-2">
                현재 시간
              </div>
              <div className="text-xl font-bold text-orange-800">
                {formatDateTime(timeInfo.currentTime)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 일정 정보 카드 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">운동 일정 정보</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">운동 날짜</div>
                <div className="font-semibold text-blue-900">
                  {formatDateThisYear(timeInfo.scheduleStart)}
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">운동 시간</div>
                <div className="font-semibold text-blue-900">
                  {formatTime(timeInfo.scheduleStart)} ~ {formatTime(timeInfo.scheduleEnd)}
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-green-600" />
                <div className="font-semibold text-green-900">작성 가능 시간</div>
              </div>
              <div className="text-green-800">
                <div className="font-medium mb-2">
                  {formatDateTime(timeInfo.allowedStart)} ~ {formatDateTime(timeInfo.allowedEnd)}
                </div>
                <div className="text-sm">
                  • 운동 시작 5분 전부터 가능<br/>
                  • 운동 종료 1시간 후까지 가능
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 안내 정보 카드 */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">왜 시간 제한이 있나요?</h3>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <div>
                  <div className="font-medium">정확한 기록 보장</div>
                  <div className="text-sm text-gray-600">
                    운동 직전이나 직후에 기록하여 정확성을 높입니다.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <div>
                  <div className="font-medium">데이터 신뢰성</div>
                  <div className="text-sm text-gray-600">
                    시간이 지난 후 기록을 수정하여 데이터가 왜곡되는 것을 방지합니다.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">3</span>
                </div>
                <div>
                  <div className="font-medium">일관된 워크플로우</div>
                  <div className="text-sm text-gray-600">
                    모든 트레이너가 동일한 기준으로 기록을 작성합니다.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼들 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={`/trainer/pt/${ptId}/${ptRecordId}`}>
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              PT 기록 메인으로
            </Button>
          </Link>
          <Link href={`/trainer/pt/${ptId}`}>
            <Button variant="primary" className="w-full sm:w-auto">
              PT 상세로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
};

export default EditTimeRestrictionNotice;