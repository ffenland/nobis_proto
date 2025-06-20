import {
  IMachineDetail,
  IMachineSetting,
  IMachineSettingValue,
} from "@/app/manager/centers/[id]/facilities/machine/[machineId]/page";
import { ChangeSummary } from "@/app/manager/centers/[id]/facilities/machine/[machineId]/MachineChangeConfirm";

// 변경사항 요약 타입
export type DetailedChangeSummary = {
  hasChanges: boolean;
  title?: {
    from: string;
    to: string;
  };
  settings: {
    added: IMachineSetting[];
    removed: IMachineSetting[];
    modified: {
      setting: IMachineSetting;
      changes: {
        title?: { from: string; to: string };
        unit?: { from: string; to: string };
        values?: {
          added: string[];
          removed: string[];
        };
      };
    }[];
  };
};

// 세팅 내 중복 값 제거 및 original과 매칭
const normalizeMachineSettingValues = (
  currentSetting: IMachineSetting,
  originalSetting?: IMachineSetting
): IMachineSettingValue[] => {
  const values = [...currentSetting.values];

  // 1. 중복 값 그룹핑
  const valueGroups = new Map<string, IMachineSettingValue[]>();

  values.forEach((value) => {
    const trimmedValue = value.value.trim();
    if (!trimmedValue) return; // 빈 값 제외

    if (!valueGroups.has(trimmedValue)) {
      valueGroups.set(trimmedValue, []);
    }
    valueGroups.get(trimmedValue)!.push(value);
  });

  const normalizedValues: IMachineSettingValue[] = [];

  // 2. 각 값 그룹별로 처리
  valueGroups.forEach((duplicateValues, valueText) => {
    // original에서 같은 value를 가진 요소 찾기
    const originalValue = originalSetting?.values.find(
      (ov) => ov.value.trim() === valueText
    );

    if (originalValue) {
      // original과 동일한 value가 있는 경우
      const sameIdValue = duplicateValues.find(
        (dv) => dv.id === originalValue.id
      );

      if (sameIdValue) {
        // original과 id도 동일한 값이 있으면 그것을 사용
        normalizedValues.push(sameIdValue);
      } else {
        // original과 value는 같지만 id가 다른 경우들만 있으면
        // original의 정보로 복원
        normalizedValues.push({
          id: originalValue.id,
          value: originalValue.value,
          editState: originalValue.editState,
        });
      }
    } else {
      // original에 없는 새로운 값인 경우 첫 번째 요소만 사용
      normalizedValues.push(duplicateValues[0]);
    }
  });

  return normalizedValues;
};

// 머신 데이터 정규화 (중복 제거 및 original과 매칭)
export const normalizeMachineData = (
  current: IMachineDetail,
  original: IMachineDetail
): IMachineDetail => {
  return {
    ...current,
    machineSetting: current.machineSetting.map((currentSetting) => {
      const originalSetting = original.machineSetting.find(
        (os) => os.id === currentSetting.id
      );

      return {
        ...currentSetting,
        values: normalizeMachineSettingValues(currentSetting, originalSetting),
      };
    }),
  };
};

// 값 배열 비교 (순서 무관)
const compareValues = (
  values1: IMachineSettingValue[],
  values2: IMachineSettingValue[]
) => {
  if (values1.length !== values2.length) return false;

  const set1 = new Set(values1.map((v) => v.value.trim()));
  const set2 = new Set(values2.map((v) => v.value.trim()));

  if (set1.size !== set2.size) return false;

  for (const value of set1) {
    if (!set2.has(value)) return false;
  }

  return true;
};

// 머신 데이터 상세 비교
export const compareMachineData = (
  original: IMachineDetail,
  current: IMachineDetail
): DetailedChangeSummary => {
  // 먼저 current 데이터를 정규화
  const normalizedCurrent = normalizeMachineData(current, original);

  const changes: DetailedChangeSummary = {
    hasChanges: false,
    settings: {
      added: [],
      removed: [],
      modified: [],
    },
  };

  // 1. 제목 변경 확인
  if (original.title.trim() !== normalizedCurrent.title.trim()) {
    changes.hasChanges = true;
    changes.title = {
      from: original.title,
      to: normalizedCurrent.title,
    };
  }

  // 2. 추가된 세팅 확인 (isNew가 true인 것들)
  const addedSettings = normalizedCurrent.machineSetting.filter(
    (setting) => setting.isNew && setting.title.trim() !== ""
  );

  if (addedSettings.length > 0) {
    changes.hasChanges = true;
    changes.settings.added = addedSettings;
  }

  // 3. 삭제된 세팅 확인
  const removedSettings = original.machineSetting.filter(
    (originalSetting) =>
      !normalizedCurrent.machineSetting.find(
        (currentSetting) => currentSetting.id === originalSetting.id
      )
  );

  if (removedSettings.length > 0) {
    changes.hasChanges = true;
    changes.settings.removed = removedSettings;
  }

  // 4. 수정된 세팅 확인
  normalizedCurrent.machineSetting.forEach((currentSetting) => {
    // 새로운 세팅은 이미 처리했으므로 건너뜀
    if (currentSetting.isNew) return;

    const originalSetting = original.machineSetting.find(
      (os) => os.id === currentSetting.id
    );

    if (!originalSetting) return;

    const settingChanges: DetailedChangeSummary["settings"]["modified"][0]["changes"] =
      {};

    // 제목 변경
    if (originalSetting.title.trim() !== currentSetting.title.trim()) {
      settingChanges.title = {
        from: originalSetting.title,
        to: currentSetting.title,
      };
    }

    // 단위 변경
    if (originalSetting.unit.trim() !== currentSetting.unit.trim()) {
      settingChanges.unit = {
        from: originalSetting.unit,
        to: currentSetting.unit,
      };
    }

    // 값 변경
    if (!compareValues(originalSetting.values, currentSetting.values)) {
      const originalValueSet = new Set(
        originalSetting.values.map((v) => v.value.trim())
      );
      const currentValueSet = new Set(
        currentSetting.values.map((v) => v.value.trim()).filter((v) => v !== "")
      );

      const addedValues = Array.from(currentValueSet).filter(
        (v) => !originalValueSet.has(v)
      );
      const removedValues = Array.from(originalValueSet).filter(
        (v) => !currentValueSet.has(v)
      );

      if (addedValues.length > 0 || removedValues.length > 0) {
        settingChanges.values = {
          added: addedValues,
          removed: removedValues,
        };
      }
    }

    // 변경사항이 있으면 추가
    if (Object.keys(settingChanges).length > 0) {
      changes.hasChanges = true;
      changes.settings.modified.push({
        setting: currentSetting,
        changes: settingChanges,
      });
    }
  });

  return changes;
};

// 변경사항을 기존 ChangeSummary 형태로 변환
export const convertToChangeSummary = (
  detailedChanges: DetailedChangeSummary
): ChangeSummary => {
  const changeSummary: ChangeSummary = {
    settings: [],
  };

  // 제목 변경
  if (detailedChanges.title) {
    changeSummary.title = detailedChanges.title;
  }

  // 새로운 세팅 추가
  detailedChanges.settings.added.forEach((setting) => {
    changeSummary.settings.push({
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

  // 수정된 세팅
  detailedChanges.settings.modified.forEach(({ setting, changes }) => {
    const settingChange: ChangeSummary["settings"][number] = {
      id: setting.id,
      title: setting.title,
      changes: {},
    };

    if (changes.title) {
      settingChange.changes.title = changes.title;
    }

    if (changes.unit) {
      settingChange.changes.unit = changes.unit;
    }

    if (changes.values) {
      settingChange.changes.values = {
        added: changes.values.added.map((v) => ({ value: v })),
        removed: changes.values.removed.map((v) => ({ value: v })),
        modified: [],
      };
    }

    changeSummary.settings.push(settingChange);
  });

  return changeSummary;
};
