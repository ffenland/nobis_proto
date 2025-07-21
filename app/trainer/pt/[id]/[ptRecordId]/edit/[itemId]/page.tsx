// app/trainer/pt/[id]/[ptRecordId]/edit/[itemId]/page.tsx
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import {
  ArrowLeft,
  Edit,
  Dumbbell,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { 
  getPtRecordItemAction, 
  updateMachineRecordAction,
  updateFreeRecordAction,
  updateStretchingRecordAction,
  type TPtRecordItem 
} from "./actions";
import { checkEditTimePermissionAction } from "../../actions";
import EditTimeRestrictionNotice from "../components/EditTimeRestrictionNotice";

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
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">운동 기록 수정</h3>
            </CardHeader>
            <CardContent>
              {/* 타입별 수정 폼 렌더링 */}
              {item.type === "MACHINE" && (
                <MachineEditForm item={item} ptId={ptId} ptRecordId={ptRecordId} />
              )}
              
              {item.type === "FREE" && (
                <FreeEditForm item={item} ptId={ptId} ptRecordId={ptRecordId} />
              )}
              
              {item.type === "STRETCHING" && (
                <StretchingEditForm item={item} ptId={ptId} ptRecordId={ptRecordId} />
              )}
            </CardContent>
          </Card>

          {/* 뒤로가기 버튼 */}
          <div className="flex gap-4">
            <Link href={`/trainer/pt/${ptId}/${ptRecordId}/edit`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                편집 페이지로 돌아가기
              </Button>
            </Link>
          </div>
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

// 머신 운동 수정 폼
const MachineEditForm = ({ item, ptId, ptRecordId }: {
  item: TPtRecordItem;
  ptId: string;
  ptRecordId: string;
}) => {
  return (
    <form action={updateMachineRecordAction.bind(null, item.id)}>
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              운동명
            </label>
            <input
              type="text"
              name="title"
              defaultValue={item.title || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            메모
          </label>
          <textarea
            name="description"
            rows={2}
            defaultValue={item.description || ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 세트 정보 */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">세트 기록</h4>
          <input type="hidden" name="setCount" value={item.machineSetRecords.length} />
          
          <div className="space-y-4">
            {item.machineSetRecords.map((setRecord, index) => (
              <div key={setRecord.id} className="border border-gray-200 rounded-lg p-4">
                <input type="hidden" name={`sets[${index}].id`} value={setRecord.id} />
                <input type="hidden" name={`sets[${index}].set`} value={setRecord.set} />
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="font-medium">{setRecord.set}세트</div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">횟수:</label>
                    <input
                      type="number"
                      name={`sets[${index}].reps`}
                      defaultValue={setRecord.reps}
                      min="1"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      required
                    />
                  </div>
                </div>

                {/* 설정값들 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {setRecord.settingValues.map((settingValue, settingIndex) => (
                    <div key={settingValue.id} className="flex items-center gap-2">
                      <input 
                        type="hidden" 
                        name={`sets[${index}].settings[${settingIndex}].settingValueId`}
                        value={settingValue.id}
                      />
                      <label className="text-sm text-gray-600 min-w-0 flex-1">
                        {settingValue.machineSetting.title}:
                      </label>
                      <input
                        type="number"
                        name={`sets[${index}].settings[${settingIndex}].value`}
                        defaultValue={settingValue.value}
                        step="0.1"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                        required
                      />
                      <span className="text-sm text-gray-600">
                        {settingValue.machineSetting.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex gap-4">
          <Button type="submit" variant="primary">
            수정 완료
          </Button>
          <Link href={`/trainer/pt/${ptId}/${ptRecordId}/edit`}>
            <Button variant="outline">취소</Button>
          </Link>
        </div>
      </div>
    </form>
  );
};

// 프리웨이트 운동 수정 폼
const FreeEditForm = ({ item, ptId, ptRecordId }: {
  item: TPtRecordItem;
  ptId: string;
  ptRecordId: string;
}) => {
  return (
    <form action={updateFreeRecordAction.bind(null, item.id)}>
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              운동명 *
            </label>
            <input
              type="text"
              name="title"
              defaultValue={item.title || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            메모
          </label>
          <textarea
            name="description"
            rows={2}
            defaultValue={item.description || ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 세트 정보 */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">세트 기록</h4>
          <input type="hidden" name="setCount" value={item.freeSetRecords.length} />
          
          <div className="space-y-4">
            {item.freeSetRecords.map((setRecord, index) => (
              <div key={setRecord.id} className="border border-gray-200 rounded-lg p-4">
                <input type="hidden" name={`sets[${index}].id`} value={setRecord.id} />
                <input type="hidden" name={`sets[${index}].set`} value={setRecord.set} />
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="font-medium">{setRecord.set}세트</div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">횟수:</label>
                    <input
                      type="number"
                      name={`sets[${index}].reps`}
                      defaultValue={setRecord.reps}
                      min="1"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      required
                    />
                  </div>
                </div>

                {/* 사용 기구들 */}
                <div>
                  <div className="text-sm text-gray-600 mb-2">사용 기구:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {setRecord.equipments.map((equipment, equipmentIndex) => (
                      <div key={equipment.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <input 
                          type="hidden" 
                          name={`sets[${index}].equipments[${equipmentIndex}]`}
                          value={equipment.id}
                        />
                        <span className="text-sm">
                          {equipment.title}
                          {equipment.primaryValue && equipment.primaryUnit && 
                            ` (${equipment.primaryValue}${equipment.primaryUnit})`
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex gap-4">
          <Button type="submit" variant="primary">
            수정 완료
          </Button>
          <Link href={`/trainer/pt/${ptId}/${ptRecordId}/edit`}>
            <Button variant="outline">취소</Button>
          </Link>
        </div>
      </div>
    </form>
  );
};

// 스트레칭 운동 수정 폼
const StretchingEditForm = ({ item, ptId, ptRecordId }: {
  item: TPtRecordItem;
  ptId: string;
  ptRecordId: string;
}) => {
  const stretchingRecord = item.stretchingExerciseRecords[0];

  return (
    <form action={updateStretchingRecordAction.bind(null, item.id)}>
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              운동명
            </label>
            <input
              type="text"
              name="title"
              defaultValue={item.title || stretchingRecord?.stretchingExercise?.title || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly
            />
            <input 
              type="hidden" 
              name="exerciseId" 
              value={stretchingRecord?.stretchingExercise?.id || ""} 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명/주의사항
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={item.description || stretchingRecord?.description || ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 사용 기구 */}
        {stretchingRecord?.equipments && stretchingRecord.equipments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사용 기구
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stretchingRecord.equipments.map((equipment, index) => (
                <div key={equipment.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <input 
                    type="hidden" 
                    name={`equipments[${index}]`}
                    value={equipment.id}
                  />
                  <span className="text-sm">{equipment.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex gap-4">
          <Button type="submit" variant="primary">
            수정 완료
          </Button>
          <Link href={`/trainer/pt/${ptId}/${ptRecordId}/edit`}>
            <Button variant="outline">취소</Button>
          </Link>
        </div>
      </div>
    </form>
  );
};

export default PtRecordItemEditPage;