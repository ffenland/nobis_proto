// app/trainer/pt/[id]/[ptRecordId]/view/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import {
  Clock,
  Dumbbell,
  Activity,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { getPtRecordDetailAction, type TPtRecordDetail } from "../actions";
import PtRecordViewClient from "./PtRecordViewClient";

interface PageProps {
  params: Promise<{ id: string; ptRecordId: string }>;
}

const TrainerPtRecordViewPage = async ({ params }: PageProps) => {
  const { id: ptId, ptRecordId } = await params;

  let ptRecordDetail: TPtRecordDetail;

  try {
    ptRecordDetail = await getPtRecordDetailAction(ptRecordId);
  } catch (error) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <FileText className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            운동 기록을 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
          <Link href={`/trainer/pt/${ptId}`}>
            <Button variant="primary">PT 상세로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  // 운동 타입별 렌더링 함수
  const renderExerciseItem = (item: TPtRecordDetail["items"][number]) => {
    switch (item.type) {
      case "MACHINE":
        return (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold">{item.title || "머신 운동"}</h4>
                <Badge variant="default">머신</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {item.description && (
                <p className="text-gray-600 mb-4">{item.description}</p>
              )}
              
              {item.machineSetRecords && item.machineSetRecords.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-700">세트 기록</h5>
                  {item.machineSetRecords.map((setRecord, index) => (
                    <div key={setRecord.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-sm text-gray-700 mb-2">
                        {index + 1}세트
                      </div>
                      {setRecord.settingValues && setRecord.settingValues.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {setRecord.settingValues.map((setting) => (
                            <div key={setting.id} className="text-sm">
                              <span className="text-gray-600">
                                {setting.machineSetting.title}:
                              </span>
                              <span className="font-medium ml-1">
                                {setting.value} {setting.machineSetting.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "FREE":
        return (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold">{item.title || "프리웨이트"}</h4>
                <Badge variant="success">프리웨이트</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {item.description && (
                <p className="text-gray-600 mb-4">{item.description}</p>
              )}
              
              {item.freeSetRecords && item.freeSetRecords.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-700">세트 기록</h5>
                  {item.freeSetRecords.map((setRecord, index) => (
                    <div key={setRecord.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-sm text-gray-700 mb-2">
                        {index + 1}세트
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-sm">
                          <span className="text-gray-600">횟수:</span>
                          <span className="font-medium ml-1">{setRecord.reps}회</span>
                        </div>
                        {setRecord.equipments && setRecord.equipments.length > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-600">무게:</span>
                            <span className="font-medium ml-1">
                              {setRecord.equipments.map(eq => 
                                `${eq.primaryValue}${eq.primaryUnit}`
                              ).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "STRETCHING":
        return (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold">{item.title || "스트레칭"}</h4>
                <Badge variant="default">스트레칭</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {item.description && (
                <p className="text-gray-600 mb-4">{item.description}</p>
              )}
              
              {item.stretchingExerciseRecords && item.stretchingExerciseRecords.length > 0 && (
                <div className="space-y-3">
                  {item.stretchingExerciseRecords.map((record) => (
                    <div key={record.id} className="bg-gray-50 p-3 rounded-lg">
                      {record.stretchingExercise && (
                        <div className="font-medium text-sm text-gray-700 mb-1">
                          {record.stretchingExercise.title}
                        </div>
                      )}
                      {record.description && (
                        <div className="text-sm text-gray-600">
                          {record.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card key={item.id}>
            <CardContent>
              <div className="text-center py-4 text-gray-500">
                알 수 없는 운동 타입입니다.
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader
        title="운동 기록 상세"
        subtitle={`${formatDateThisYear(ptRecordDetail.ptSchedule.date)} 수업 기록`}
      />

      <div className="space-y-6">
        {/* 수업 정보 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold">수업 정보</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">수업 날짜</div>
                <div className="font-medium">
                  {formatDateThisYear(ptRecordDetail.ptSchedule.date)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">수업 시간</div>
                <div className="font-medium">
                  {formatTimeToString(
                    Math.floor(ptRecordDetail.ptSchedule.startTime / 100),
                    ptRecordDetail.ptSchedule.startTime % 100
                  )}{" "}
                  -{" "}
                  {formatTimeToString(
                    Math.floor(ptRecordDetail.ptSchedule.endTime / 100),
                    ptRecordDetail.ptSchedule.endTime % 100
                  )}
                </div>
              </div>
            </div>
            
            {ptRecordDetail.memo && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  메모
                </div>
                <div className="text-sm text-gray-600">
                  {ptRecordDetail.memo}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 운동 기록 목록 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">운동 기록</h3>
          
          {ptRecordDetail.items.length === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>운동 기록이 없습니다.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {ptRecordDetail.items.map(renderExerciseItem)}
            </div>
          )}
        </div>

        {/* 미디어 갤러리 - 클라이언트 컴포넌트 */}
        <PtRecordViewClient items={ptRecordDetail.items} />

        {/* 뒤로가기 버튼 */}
        <div className="flex gap-4">
          <Link href={`/trainer/pt/${ptId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              PT 상세로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
};

export default TrainerPtRecordViewPage;