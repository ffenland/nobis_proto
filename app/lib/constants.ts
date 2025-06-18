import { WeekDay } from "@prisma/client";
import { notFound } from "next/navigation";

export const styleClassName = {
  cardbox: "border-2 rounded-lg p-3",
};

export const weekDayNumberStringMap = {
  0: {
    eng: {
      short: "SUN",
      long: "Sunday",
    },
    kor: {
      short: "일",
      long: "일요일",
    },
    color: "text-gray-500",
  },
  1: {
    eng: {
      short: "MON",
      long: "Monday",
    },
    kor: {
      short: "월",
      long: "월요일",
    },
    color: "text-green-500",
  },
  2: {
    eng: {
      short: "TUE",
      long: "Tuesday",
    },
    kor: {
      short: "화",
      long: "화요일",
    },
    color: "text-orange-500",
  },
  3: {
    eng: {
      short: "WED",
      long: "Wednesday",
    },
    kor: {
      short: "수",
      long: "수요일",
    },
    color: "text-blue-500",
  },
  4: {
    eng: {
      short: "THU",
      long: "Thursday",
    },
    kor: {
      short: "목",
      long: "목요일",
    },
    color: "text-yellow-500",
  },
  5: {
    eng: {
      short: "FRI",
      long: "Friday",
    },
    kor: {
      short: "금",
      long: "금요일",
    },
    color: "text-pink-500",
  },
  6: {
    eng: {
      short: "SAT",
      long: "Saturday",
    },
    kor: {
      short: "토",
      long: "토요일",
    },
    color: "text-cyan-500",
  },
};

export const responseError = {
  sesseion: {
    noSession: {
      code: "SE1001",
      message: "No Session",
    },
    roleMismatch: {
      code: "SE1002",
      message: "Role Mismatch",
    },
  },
};

export const serverError = {
  unknown: {
    code: "BE1001",
    message: "Unknown Error",
  },
  prisma: {
    code: "BE1002",
    message: "Database Error",
  },
};

export const scheduleError = {
  chosenSchedule: {
    notChosen: {
      code: "SC1001",
      message: "Schedule not chosen",
    },
    regularScheduleCreationFailedAll: {
      code: "SC1002",
      message: "All Regular Schedule Creation Failed",
    },
  },
};

export const ptError = {
  ptProduct: {
    notFound: {
      code: "PT1001",
      message: "PT프로그램 정보를 찾을 수 없습니다.",
    },
  },
  schedule: {
    failCreation: {
      code: "PT1002",
      message: "스케줄 생성에 실패했습니다.",
    },
  },
};

export const weekdaysEnum: {
  enum: keyof typeof WeekDay;
  key: keyof typeof weekDayNumberStringMap;
}[] = [
  { enum: WeekDay.SUN, key: 0 },
  { enum: WeekDay.MON, key: 1 },
  { enum: WeekDay.TUE, key: 2 },
  { enum: WeekDay.WED, key: 3 },
  { enum: WeekDay.THU, key: 4 },
  { enum: WeekDay.FRI, key: 5 },
  { enum: WeekDay.SAT, key: 6 },
];

export const isValidWeekDayNumberStringMap = (
  num: number
): num is keyof typeof weekDayNumberStringMap => {
  return num >= 0 && num <= 6;
};
