// app/trainer/pt/[id]/[ptRecordId]/edit/[itemId]/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import {
  Edit,
  Dumbbell,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { 
  getPtRecordItemAction
} from "./actions";
import { checkEditTimePermissionAction } from "../../actions";
import EditTimeRestrictionNotice from "../components/EditTimeRestrictionNotice";
import EditItemForm from "./EditItemForm";

interface PageProps {
  params: Promise<{ id: string; ptRecordId: string; itemId: string }>;
}

const PtRecordItemEditPage = async ({ params }: PageProps) => {
  const { id: ptId, ptRecordId, itemId } = await params;

  try {
    // 편집 시간 제한 검증
    const timePermission = await checkEditTimePermissionAction(ptRecordId);
    
    if (!timePermission.canEdit) {
      return (
        <EditTimeRestrictionNotice
          ptId={ptId}
          ptRecordId={ptRecordId}
          timeInfo={timePermission}
        />
      );
    }

    // 운동 기록 아이템 조회
    const item = await getPtRecordItemAction(itemId);

    // 운동 타입별 아이콘과 제목
    const getTypeInfo = () => {
      switch (item.type) {
        case "MACHINE":
          return {
            icon: <Activity className="w-6 h-6 text-blue-600" />,
            title: "머신 운동",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
          };
        case "FREE":
          return {
            icon: <Dumbbell className="w-6 h-6 text-green-600" />,
            title: "프리웨이트",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
          };
        case "STRETCHING":
          return {
            icon: <Activity className="w-6 h-6 text-purple-600" />,
            title: "스트레칭",
            bgColor: "bg-purple-50",
            borderColor: "border-purple-200",
          };
        default:
          return {
            icon: <Edit className="w-6 h-6 text-gray-600" />,
            title: "운동",
            bgColor: "bg-gray-50",
            borderColor: "border-gray-200",
          };
      }
    };

    const typeInfo = getTypeInfo();

    return (
      <PageLayout maxWidth="2xl">
        <PageHeader
          title="운동 기록 수정"
          subtitle={`${item.ptRecord.pt.member?.user.username}님의 ${formatDateThisYear(item.ptRecord.ptSchedule.date)} 수업`}
        />

        <div className="space-y-6">
          {/* 기록 정보 카드 */}
          <Card className={`${typeInfo.borderColor} ${typeInfo.bgColor}`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {typeInfo.icon}
                <div>
                  <h3 className="text-lg font-semibold">{item.title || typeInfo.title}</h3>
                  <Badge variant="default">{typeInfo.title}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">운동 순서</div>
                  <div className="font-medium">{item.entry}번째 운동</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">수업 시간</div>
                  <div className="font-medium">
                    {formatTimeToString(
                      Math.floor(item.ptRecord.ptSchedule.startTime / 100),
                      item.ptRecord.ptSchedule.startTime % 100
                    )}{" "}
                    -{" "}
                    {formatTimeToString(
                      Math.floor(item.ptRecord.ptSchedule.endTime / 100),
                      item.ptRecord.ptSchedule.endTime % 100
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 수정 폼 */}
          <EditItemForm 
            item={item} 
            ptId={ptId} 
            ptRecordId={ptRecordId}
            centerId={item.ptRecord.pt.trainer?.fitnessCenterId || ""}
          />
        </div>
      </PageLayout>
    );

  } catch (error) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            운동 기록을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link href={`/trainer/pt/${ptId}/${ptRecordId}/edit`}>
            <Button variant="primary">편집 페이지로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }
};

export default PtRecordItemEditPage;