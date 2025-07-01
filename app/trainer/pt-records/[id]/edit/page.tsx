import { notFound } from "next/navigation";
import { getPtRecordAction, updateMemoAction } from "./actions";

type Params = Promise<{ id: string }>;

export default async function PtRecordEditPage(props: { params: Params }) {
  let ptRecord;
  const params = await props.params;
  const id = params.id;

  try {
    ptRecord = await getPtRecordAction(id);
  } catch (error) {
    console.error("PT 기록 조회 실패:", error);
    notFound();
  }

  // 운동 기록 정보 포맷팅
  const getExerciseInfo = (item: (typeof ptRecord.items)[number]) => {
    switch (item.type) {
      case "MACHINE":
        const machineRecord = item.machineSetRecords[0];
        if (machineRecord?.settingValues[0]?.machineSetting?.machine?.title) {
          return machineRecord.settingValues[0].machineSetting.machine.title;
        }
        return item.title || "머신 운동";

      case "FREE":
        return item.title || "프리웨이트";

      case "STRETCHING":
        const stretchingRecord = item.stretchingExerciseRecords[0];
        if (stretchingRecord?.stretchingExercise?.title) {
          return stretchingRecord.stretchingExercise.title;
        }
        return item.title || "스트레칭";

      default:
        return item.title || "운동";
    }
  };

  // 세트 정보 포맷팅
  const getSetInfo = (item: (typeof ptRecord.items)[number]) => {
    switch (item.type) {
      case "MACHINE":
        return item.machineSetRecords.map((record) => ({
          set: record.set,
          reps: record.reps,
          settings: record.settingValues
            .map(
              (sv) =>
                `${sv.machineSetting.title}: ${sv.value}${sv.machineSetting.unit}`
            )
            .join(", "),
        }));

      case "FREE":
        return item.freeSetRecords.map((record) => ({
          set: record.set,
          reps: record.reps,
          settings: record.weights
            .map((w) => `${w.title}: ${w.weight}${w.unit}`)
            .join(", "),
        }));

      case "STRETCHING":
        return item.stretchingExerciseRecords.map((record, index) => ({
          set: index + 1,
          reps: 1,
          settings: record.stretchingExercise.title,
        }));

      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PT 기록 수정</h1>
            <p className="text-gray-600 mt-1">
              {ptRecord.pt.member?.user.username} |{" "}
              {ptRecord.pt.trainer?.fitnessCenter?.title}
            </p>
          </div>
        </div>

        {/* 운동 기록 섹션 (읽기 전용) */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">운동 기록</h2>
            <p className="text-sm text-gray-500 mt-1">
              운동 기록은 수정할 수 없습니다. 메모만 수정 가능합니다.
            </p>
          </div>
          <div className="p-6">
            {ptRecord.items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                등록된 운동 기록이 없습니다.
              </p>
            ) : (
              <div className="space-y-4">
                {ptRecord.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="border border-gray-100 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">
                        {index + 1}. {getExerciseInfo(item)}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
                        {item.type === "MACHINE" && "머신"}
                        {item.type === "FREE" && "프리웨이트"}
                        {item.type === "STRETCHING" && "스트레칭"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {getSetInfo(item).map((setInfo, setIndex) => (
                        <div key={setIndex} className="text-sm text-gray-600">
                          {item.type !== "STRETCHING" ? (
                            <div>
                              <span className="font-medium">
                                {setInfo.set}세트:
                              </span>{" "}
                              {setInfo.reps}회
                              {setInfo.settings && (
                                <span className="ml-2 text-gray-500">
                                  ({setInfo.settings})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium">스트레칭:</span>{" "}
                              {setInfo.settings}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 메모 수정 폼 */}
        <form
          action={updateMemoAction}
          className="bg-white rounded-lg border border-gray-200 mb-6"
        >
          <input type="hidden" name="ptRecordId" value={id} />
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">메모</h2>
          </div>
          <div className="p-6">
            <textarea
              name="memo"
              defaultValue={ptRecord.memo}
              placeholder="메모를 입력해 주세요..."
              className="w-full min-h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            />
          </div>

          {/* 액션 버튼 */}
          <div className="px-6 pb-6 flex items-center justify-end space-x-3">
            <a
              href={`/trainer/pt-records/${id}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </a>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
