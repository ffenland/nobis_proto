"use client";

import { IMachineDetail } from "./actions";

// 변경사항 요약을 위한 타입
export type ChangeSummary = {
  title?: {
    from: string;
    to: string;
  };
  settings: {
    id: string;
    title: string;
    changes: {
      title?: { from: string; to: string };
      unit?: { from: string; to: string };
      values?: {
        added: { value: string }[];
        removed: { value: string }[];
        modified: { value: string; from: string; to: string }[];
      };
    };
  }[];
};

// 변경사항 감지 및 요약 함수
export const getChangeSummary = (
  original: IMachineDetail,
  current: IMachineDetail
): ChangeSummary => {
  const summary: ChangeSummary = {
    settings: [],
  };

  // 제목 변경 확인
  if (original.title !== current.title) {
    summary.title = {
      from: original.title,
      to: current.title,
    };
  }

  // 새로운 세팅 추가 확인
  const newSettings = current.machineSetting.filter((setting) => setting.isNew);
  if (newSettings.length > 0) {
    newSettings.forEach((setting) => {
      summary.settings.push({
        id: setting.id,
        title: setting.title,
        changes: {
          title: { from: "", to: setting.title },
          unit: { from: "", to: setting.unit },
          values: {
            added: setting.values.map((v) => ({ value: v.value })),
            removed: [],
            modified: [],
          },
        },
      });
    });
  }

  // 기존 세팅 변경 확인
  current.machineSetting.forEach((currentSetting) => {
    // 새로운 세팅은 이미 처리했으므로 건너뜀
    if (currentSetting.isNew) return;

    const originalSetting = original.machineSetting.find(
      (s) => s.id === currentSetting.id
    );
    if (!originalSetting) return;

    const settingChanges: ChangeSummary["settings"][number] = {
      id: currentSetting.id,
      title: currentSetting.title,
      changes: {},
    };

    // 제목 변경
    if (originalSetting.title !== currentSetting.title) {
      settingChanges.changes.title = {
        from: originalSetting.title,
        to: currentSetting.title,
      };
    }

    // 단위 변경
    if (originalSetting.unit !== currentSetting.unit) {
      settingChanges.changes.unit = {
        from: originalSetting.unit,
        to: currentSetting.unit,
      };
    }

    // 값 변경 확인
    const valueChanges = {
      added: [] as { value: string }[],
      removed: [] as { value: string }[],
      modified: [] as { value: string; from: string; to: string }[],
    };

    // 추가된 값
    currentSetting.values.forEach((currentValue) => {
      const originalValue = originalSetting.values.find(
        (v) => v.id === currentValue.id
      );
      if (!originalValue) {
        valueChanges.added.push({ value: currentValue.value });
      } else if (originalValue.value !== currentValue.value) {
        valueChanges.modified.push({
          value: currentValue.value,
          from: originalValue.value,
          to: currentValue.value,
        });
      }
    });

    // 삭제된 값
    originalSetting.values.forEach((originalValue) => {
      if (!currentSetting.values.find((v) => v.id === originalValue.id)) {
        valueChanges.removed.push({ value: originalValue.value });
      }
    });

    if (
      valueChanges.added.length > 0 ||
      valueChanges.removed.length > 0 ||
      valueChanges.modified.length > 0
    ) {
      settingChanges.changes.values = valueChanges;
    }

    if (Object.keys(settingChanges.changes).length > 0) {
      summary.settings.push(settingChanges);
    }
  });

  return summary;
};

// 변경사항 확인 모달 컴포넌트
export const ChangeConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  changes,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: ChangeSummary;
}) => {
  // 새로운 세팅과 기존 세팅 변경을 구분
  const newSettings = changes.settings.filter(
    (setting) => setting.changes.title?.from === ""
  );
  const modifiedSettings = changes.settings.filter(
    (setting) => setting.changes.title?.from !== ""
  );

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">변경사항 확인</h3>

        <div className="space-y-4">
          {/* 제목 변경 */}
          {changes.title && (
            <div className="border-b pb-2">
              <p className="font-semibold">머신 이름 변경</p>
              <p className="text-sm">
                {changes.title.from} → {changes.title.to}
              </p>
            </div>
          )}

          {/* 새로운 세팅 */}
          {newSettings.length > 0 && (
            <div className="border-b pb-2">
              <p className="font-semibold text-green-600">새로 추가된 세팅</p>
              {newSettings.map((setting) => (
                <div key={setting.id} className="ml-4 mt-2">
                  <p className="font-medium">{setting.title}</p>
                  {setting.changes.unit && (
                    <p className="text-sm">단위: {setting.changes.unit.to}</p>
                  )}
                  {setting.changes.values && (
                    <div className="text-sm">
                      <p>
                        추가된 값:{" "}
                        {setting.changes.values.added
                          .map((v) => v.value)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 수정된 세팅 */}
          {modifiedSettings.length > 0 && (
            <div className="border-b pb-2">
              <p className="font-semibold text-blue-600">수정된 세팅</p>
              {modifiedSettings.map((setting) => (
                <div key={setting.id} className="ml-4 mt-2">
                  <p className="font-medium">{setting.title}</p>

                  {/* 설정 제목 변경 */}
                  {setting.changes.title && (
                    <p className="text-sm">
                      제목: {setting.changes.title.from} →{" "}
                      {setting.changes.title.to}
                    </p>
                  )}

                  {/* 단위 변경 */}
                  {setting.changes.unit && (
                    <p className="text-sm">
                      단위: {setting.changes.unit.from} →{" "}
                      {setting.changes.unit.to}
                    </p>
                  )}

                  {/* 값 변경 */}
                  {setting.changes.values && (
                    <div className="text-sm">
                      {setting.changes.values.added.length > 0 && (
                        <p>
                          추가:{" "}
                          {setting.changes.values.added
                            .map((v) => v.value)
                            .join(", ")}
                        </p>
                      )}
                      {setting.changes.values.removed.length > 0 && (
                        <p>
                          삭제:{" "}
                          {setting.changes.values.removed
                            .map((v) => v.value)
                            .join(", ")}
                        </p>
                      )}
                      {setting.changes.values.modified.length > 0 && (
                        <p>
                          수정:{" "}
                          {setting.changes.values.modified
                            .map((v) => `${v.from} → ${v.to}`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-action">
          <button className="btn btn-primary" onClick={onConfirm}>
            변경사항 저장
          </button>
          <button className="btn" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default ChangeConfirmModal;
