// app/trainer/pt/[id]/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import Image from "next/image";
import {
  getPtDetailAction,
  type TPtDetail,
  type TPtRecord,
  type TPtRecordItem,
} from "./actions";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import {
  User,
  CheckCircle,
  XCircle,
  Circle,
  ChevronRight,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

// 출석 상태 계산 함수
const calculateAttendanceStatus = (
  ptSchedule: TPtRecord["ptSchedule"],
  items: TPtRecordItem[]
): "참석" | "불참" | "예정" => {
  const now = new Date();
  const classDate = new Date(ptSchedule.date);
  const classStartTime = ptSchedule.startTime;

  const startHour = Math.floor(classStartTime / 100);
  const startMinute = classStartTime % 100;

  const classStart = new Date(classDate);
  classStart.setHours(startHour, startMinute, 0, 0);

  // 미래 수업인 경우
  if (classStart > now) {
    return "예정";
  }

  // 과거 수업인 경우 - 기록이 있으면 출석, 없으면 결석
  return items.length > 0 ? "참석" : "불참";
};

const TrainerPtDetailPage = async ({ params }: PageProps) => {
  const { id: ptId } = await params;

  let ptDetail: TPtDetail;

  try {
    ptDetail = await getPtDetailAction(ptId);
  } catch (error) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            PT 정보를 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link href="/trainer/pt">
            <Button variant="primary">목록으로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  // 출석 상태별 스타일
  const getAttendanceStyle = (status: string) => {
    switch (status) {
      case "참석":
        return {
          bgColor: "bg-green-50 border-green-200",
          badgeVariant: "success" as const,
          icon: CheckCircle,
        };
      case "불참":
        return {
          bgColor: "bg-red-50 border-red-200", 
          badgeVariant: "error" as const,
          icon: XCircle,
        };
      case "예정":
        return {
          bgColor: "bg-blue-50 border-blue-200",
          badgeVariant: "default" as const,
          icon: Circle,
        };
      default:
        return {
          bgColor: "bg-gray-50 border-gray-200",
          badgeVariant: "default" as const,
          icon: Circle,
        };
    }
  };

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader
        title="PT 상세 정보"
        subtitle={`${ptDetail.member?.user.username}님의 ${ptDetail.ptProduct.title}`}
      />

      <div className="space-y-6">
        {/* PT 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">
              {ptDetail.ptProduct.title}
            </h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              {ptDetail.member?.user.avatarMedia?.thumbnailUrl || ptDetail.member?.user.avatarMedia?.publicUrl ? (
                <Image
                  src={ptDetail.member.user.avatarMedia.thumbnailUrl || ptDetail.member.user.avatarMedia.publicUrl || ''}
                  alt={ptDetail.member.user.username}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-500 p-2 bg-gray-100 rounded-full" />
              )}
              <div>
                <div className="text-lg font-medium">
                  {ptDetail.member?.user.username}
                </div>
                <div className="text-sm text-gray-600">
                  시작일: {formatDateThisYear(ptDetail.startDate)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 수업 기록 목록 */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">수업 기록</h3>
          </CardHeader>
          <CardContent>
            {ptDetail.ptRecord.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Circle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>수업 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ptDetail.ptRecord.map((record) => {
                  const attendanceStatus = calculateAttendanceStatus(
                    record.ptSchedule,
                    record.items
                  );
                  const style = getAttendanceStyle(attendanceStatus);
                  const IconComponent = style.icon;

                  return (
                    <Link 
                      key={record.id}
                      href={`/trainer/pt/${ptId}/${record.id}`}
                      className="block"
                    >
                      <div
                        className={`border rounded-lg p-4 ${style.bgColor} transition-all hover:shadow-md cursor-pointer`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-5 h-5" />
                            <div>
                              <div className="font-medium">
                                {formatDateThisYear(record.ptSchedule.date)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatTimeToString(
                                  Math.floor(record.ptSchedule.startTime / 100),
                                  record.ptSchedule.startTime % 100
                                )}{" "}
                                -{" "}
                                {formatTimeToString(
                                  Math.floor(record.ptSchedule.endTime / 100),
                                  record.ptSchedule.endTime % 100
                                )}
                              </div>
                              {/* 운동 기록 개수 표시 (참석한 경우) */}
                              {attendanceStatus === "참석" && record.items.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  운동 기록 {record.items.length}개
                                </div>
                              )}
                            </div>
                            <Badge variant={style.badgeVariant}>
                              {attendanceStatus}
                            </Badge>
                          </div>
                          
                          {/* 화살표 아이콘으로 클릭 가능함을 표시 */}
                          <div className="text-gray-400">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 뒤로가기 버튼 */}
        <div className="flex">
          <Link href="/trainer/pt">
            <Button variant="outline">목록으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
};

export default TrainerPtDetailPage;
