"use server";

import prisma from "@/app/lib/prisma";
import { loginToSession } from "@/app/lib/socialLogin";
import { createRandomNumber } from "@/app/lib/utils";
import { UserRole, WeekDay } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const createDummyData = async () => {
  // 시작하기 전에 "김태호"라는 username을 가진 user가 있는지 확인하고 있다면 그냥 리턴
  const trainer = await prisma.user.findFirst({
    where: {
      username: "김태호",
    },
  });
  if (trainer) {
    return;
  }

  // 트랜잭션 타임아웃을 30초로 설정
  await prisma.$transaction(
    async (tx) => {
      // 1. Trainer 10명 생성
      const dummyTrainerUsernames = [
        "김태호",
        "이영희",
        "박철수",
        "최민수",
        "정현우",
        "유지훈",
        "이지우",
        "오서준",
        "박서윤",
        "이서연",
      ];
      const dummyTrainerMobiles = [
        "01012345678",
        "01023456789",
        "01034567890",
        "01045678901",
        "01056789012",
        "01067890123",
        "01078901234",
        "01089012345",
        "01090123456",
        "01001234567",
      ];
      const dummyTrainerEmails = [
        "kimtaeho@test.com",
        "leeyounghee@test.com",
        "parkchulsoo@test.com",
        "choiminsoo@test.com",
        "jeonghyeonwoo@test.com",
        "yujihun@test.com",
        "leeziwoo@test.com",
        "ohseojun@test.com",
        "parkseoyun@test.com",
        "leeseoyeon@test.com",
      ];

      // 트레이너 생성
      for (let i = 0; i < 10; i++) {
        const trainer = await tx.user.create({
          data: {
            username: dummyTrainerUsernames[i],
            mobile: dummyTrainerMobiles[i],
            email: dummyTrainerEmails[i],
            role: UserRole.TRAINER,
          },
        });
        await tx.trainer.create({
          data: {
            user: { connect: { id: trainer.id } },
          },
        });
      }

      // 2. Manager 2명 생성
      const dummyManagerUsernames = ["대표A", "대표B"];
      const dummyManagerMobiles = ["01011112222", "01022223333"];
      const dummyManagerEmails = ["ceoa@test.com", "ceob@test.com"];

      for (let i = 0; i < 2; i++) {
        const manager = await tx.user.create({
          data: {
            username: dummyManagerUsernames[i],
            mobile: dummyManagerMobiles[i],
            email: dummyManagerEmails[i],
            role: UserRole.MANAGER,
          },
        });
        await tx.manager.create({
          data: {
            user: { connect: { id: manager.id } },
          },
        });
      }

      // 3. Member 10명 생성
      const dummyMemberUsernames = [
        "회원A",
        "회원B",
        "회원C",
        "회원D",
        "회원E",
        "회원F",
        "회원G",
        "회원H",
        "회원I",
        "회원J",
      ];
      const dummyMemberMobiles = [
        "01033334444",
        "01044445555",
        "01055556666",
        "01066667777",
        "01077778888",
        "01088889999",
        "01099990000",
        "01000001111",
        "01011113333",
        "01022224444",
      ];
      const dummyMemberEmails = [
        "membera@test.com",
        "memberb@test.com",
        "memberc@test.com",
        "memberd@test.com",
        "membere@test.com",
        "memberf@test.com",
        "memberg@test.com",
        "memberh@test.com",
        "memberi@test.com",
        "memberj@test.com",
      ];

      for (let i = 0; i < 10; i++) {
        const member = await tx.user.create({
          data: {
            username: dummyMemberUsernames[i],
            mobile: dummyMemberMobiles[i],
            email: dummyMemberEmails[i],
            role: UserRole.MEMBER,
          },
        });
        await tx.member.create({
          data: {
            user: { connect: { id: member.id } },
          },
        });
      }
    },
    {
      timeout: 30000, // 30초로 타임아웃 설정
    }
  );

  // 피트니스 센터 생성은 별도의 트랜잭션으로 분리
  await prisma.$transaction(
    async (tx) => {
      // 4. FitnessCenter 2개 생성
      const dummyFitnessCenterTitles = ["유천점", "입암본점"];
      const dummyFitnessCenterAddresses = [
        "선수촌로 79-19 더퍼스트 2층",
        "성덕포남로 45-8 4층",
      ];
      const dummyFitnessCenterPhones = ["0336429682", "050713919684"];
      const dummyFitnessCenterDescriptions = [
        "유천점입니다.",
        "입암본점입니다.",
      ];
      const weekDays = [
        WeekDay.MON,
        WeekDay.TUE,
        WeekDay.WED,
        WeekDay.THU,
        WeekDay.FRI,
        WeekDay.SAT,
      ];

      // 영업시간 생성
      for (const day of weekDays) {
        await tx.openingHour.create({
          data: {
            dayOfWeek: day,
            openTime: 900,
            closeTime: day === WeekDay.SAT ? 1300 : 2300,
            isClosed: false,
          },
        });
      }

      // 피트니스 센터 생성
      for (let i = 0; i < 2; i++) {
        await tx.fitnessCenter.create({
          data: {
            title: dummyFitnessCenterTitles[i],
            address: dummyFitnessCenterAddresses[i],
            phone: dummyFitnessCenterPhones[i],
            description: dummyFitnessCenterDescriptions[i],
            openingHours: {
              connect: weekDays.map((day) => ({
                dayOfWeek_openTime_closeTime: {
                  dayOfWeek: day,
                  openTime: 900,
                  closeTime: day === WeekDay.SAT ? 1300 : 2300,
                },
              })),
            },
          },
        });
      }
    },
    {
      timeout: 30000, // 30초로 타임아웃 설정
    }
  );

  console.log("더미 데이터 생성 완료");
  redirect("/login/test");
};

export const createDummyMachine = async () => {
  const fitnessCenters = await prisma.fitnessCenter.findMany({
    select: { id: true },
  });
  await Promise.all(
    fitnessCenters.map(async (fitnessCenter) => {
      await createDummyMachineData(fitnessCenter.id);
    })
  );
};

export const createDummyMachineData = async (fitnessCenterId: string) => {
  // 이미 존재하는 머신 확인
  const existingMachines = await prisma.machine.findMany({
    where: { fitnessCenterId },
    select: { title: true },
  });
  const existingMachineTitles = new Set(existingMachines.map((m) => m.title));

  const dummyMachines = [
    // 하체 머신들
    {
      title: "레그 익스텐션",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "등받이 각도",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "무릎 패드 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "레그 프레스",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 30 }, (_, i) => ({
            value: String((i + 1) * 10),
          })),
        },
        {
          title: "등받이 각도",
          unit: "도",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(30 + i * 5),
          })),
        },
        {
          title: "발판 높이",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "레그 컬",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 15 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "발목 패드 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "무릎 받침 위치",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "스미스 머신",
      settings: [
        {
          title: "바벨 높이",
          unit: "단",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "안전바 높이",
          unit: "단",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "핵 스쿼트",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 25 }, (_, i) => ({
            value: String((i + 1) * 10),
          })),
        },
        {
          title: "어깨 패드 높이",
          unit: "단",
          values: Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "발판 각도",
          unit: "도",
          values: Array.from({ length: 5 }, (_, i) => ({
            value: String(15 + i * 5),
          })),
        },
      ],
    },
    {
      title: "칼프 레이즈",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 18 }, (_, i) => ({
            value: String((i + 1) * 10),
          })),
        },
        {
          title: "어깨 패드 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "발판 높이",
          unit: "단",
          values: Array.from({ length: 5 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "애덕터 머신",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 15 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "패드 폭",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "압덕터 머신",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 15 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "패드 폭",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },

    // 등 머신들
    {
      title: "렛풀다운",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 25 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "무릎 받침",
          unit: "단",
          values: Array.from({ length: 7 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "시티드 로우",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 22 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "가슴 패드 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "티바 로우",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "가슴 패드 높이",
          unit: "단",
          values: Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "가슴 패드 각도",
          unit: "단",
          values: Array.from({ length: 5 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "풀업 어시스트",
      settings: [
        {
          title: "보조 중량",
          unit: "kg",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "무릎 패드 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },

    // 가슴 머신들
    {
      title: "체스트 프레스",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "등받이 각도",
          unit: "단",
          values: Array.from({ length: 5 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "인클라인 체스트 프레스",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 18 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "등받이 각도",
          unit: "도",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(15 + i * 5),
          })),
        },
      ],
    },
    {
      title: "펙 덱 플라이",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 16 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "팔 패드 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "디클라인 체스트 프레스",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 18 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "다리 고정대",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },

    // 어깨 머신들
    {
      title: "숄더 프레스",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 18 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "등받이 각도",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "래터럴 레이즈",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 12 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "팔 패드 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "리어 델트 플라이",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 12 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "가슴 패드 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },

    // 팔 머신들
    {
      title: "바이셉 컬",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 15 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "팔꿈치 패드 높이",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "트라이셉 익스텐션",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 15 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "등받이 각도",
          unit: "단",
          values: Array.from({ length: 5 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "트라이셉 딥스",
      settings: [
        {
          title: "보조 중량",
          unit: "kg",
          values: Array.from({ length: 18 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "무릎 패드 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },

    // 복근/코어 머신들
    {
      title: "앱 크런치",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 12 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "등받이 각도",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "백 익스텐션",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "발목 고정대 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "패드 높이",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "로터리 토르소",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 12 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "시트 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "등받이 각도",
          unit: "단",
          values: Array.from({ length: 5 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },

    // 케이블 머신들
    {
      title: "케이블 크로스오버",
      settings: [
        {
          title: "좌측 중량",
          unit: "kg",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "우측 중량",
          unit: "kg",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "케이블 높이",
          unit: "단",
          values: Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "케이블 로우",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "케이블 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "시트 거리",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
    {
      title: "고정 풀리",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 25 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "케이블 높이",
          unit: "단",
          values: Array.from({ length: 15 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },

    // 기능성 머신들
    {
      title: "멀티 힙",
      settings: [
        {
          title: "중량",
          unit: "kg",
          values: Array.from({ length: 18 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "패드 높이",
          unit: "단",
          values: Array.from({ length: 8 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "발판 각도",
          unit: "도",
          values: Array.from({ length: 5 }, (_, i) => ({
            value: String(15 + i * 10),
          })),
        },
      ],
    },
    {
      title: "그래비트론",
      settings: [
        {
          title: "보조 중량",
          unit: "kg",
          values: Array.from({ length: 20 }, (_, i) => ({
            value: String((i + 1) * 5),
          })),
        },
        {
          title: "무릎 패드 높이",
          unit: "단",
          values: Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
        {
          title: "스텝 높이",
          unit: "단",
          values: Array.from({ length: 6 }, (_, i) => ({
            value: String(i + 1),
          })),
        },
      ],
    },
  ];

  for (const machine of dummyMachines) {
    // 중복 체크: 이미 존재하는 머신이면 건너뛰기
    if (existingMachineTitles.has(machine.title)) {
      console.log(`머신 "${machine.title}" 이미 존재함 - 건너뛰기`);
      continue;
    }

    try {
      const newMachine = await prisma.machine.create({
        data: {
          title: machine.title,
          fitnessCenterId,
          machineSetting: {
            create: machine.settings.map((setting) => ({
              title: setting.title,
              unit: setting.unit,
              values: {
                create: setting.values.map((option) => ({
                  value: option.value,
                })),
              },
            })),
          },
        },
      });
      console.log(`머신 "${machine.title}" 생성 완료`);
    } catch (error) {
      console.error(`머신 "${machine.title}" 생성 실패:`, error);
    }
  }
};

export const createDummyWeights = async () => {
  const fitnessCenters = await prisma.fitnessCenter.findMany({
    select: { id: true },
  });
  await Promise.all(
    fitnessCenters.map(async (fitnessCenter) => {
      await createDummyWeightsData(fitnessCenter.id);
    })
  );
};

export const createDummyWeightsData = async (fitnessCenterId: string) => {
  // 이미 존재하는 웨이트 도구 확인
  const existingWeights = await prisma.weights.findMany({
    where: { fitnessCenterId },
    select: { title: true },
  });
  const existingWeightTitles = new Set(existingWeights.map((w) => w.title));

  const weights = [
    // 덤벨 세트 (1kg부터 50kg까지)
    ...Array.from({ length: 25 }, (_, i) => ({
      title: `덤벨 ${(i + 1) * 2}kg`,
      weight: (i + 1) * 2,
      unit: "kg",
      description: `${(i + 1) * 2}kg 고정식 덤벨`,
    })),

    // 바벨
    {
      title: "올림픽 바벨 (20kg)",
      weight: 20,
      unit: "kg",
      description: "표준 올림픽 바벨",
    },
    {
      title: "EZ 바벨 (10kg)",
      weight: 10,
      unit: "kg",
      description: "컬용 EZ 바벨",
    },
    {
      title: "스트레이트 바벨 (15kg)",
      weight: 15,
      unit: "kg",
      description: "스트레이트 바벨",
    },

    // 원판들
    {
      title: "원판 1.25kg",
      weight: 1.25,
      unit: "kg",
      description: "1.25kg 고무 원판",
    },
    {
      title: "원판 2.5kg",
      weight: 2.5,
      unit: "kg",
      description: "2.5kg 고무 원판",
    },
    { title: "원판 5kg", weight: 5, unit: "kg", description: "5kg 고무 원판" },
    {
      title: "원판 10kg",
      weight: 10,
      unit: "kg",
      description: "10kg 고무 원판",
    },
    {
      title: "원판 15kg",
      weight: 15,
      unit: "kg",
      description: "15kg 고무 원판",
    },
    {
      title: "원판 20kg",
      weight: 20,
      unit: "kg",
      description: "20kg 고무 원판",
    },
    {
      title: "원판 25kg",
      weight: 25,
      unit: "kg",
      description: "25kg 고무 원판",
    },

    // 케틀벨
    ...Array.from({ length: 10 }, (_, i) => ({
      title: `케틀벨 ${8 + i * 4}kg`,
      weight: 8 + i * 4,
      unit: "kg",
      description: `${8 + i * 4}kg 케틀벨`,
    })),

    // 기타 도구들
    {
      title: "메디신볼 3kg",
      weight: 3,
      unit: "kg",
      description: "3kg 메디신볼",
    },
    {
      title: "메디신볼 5kg",
      weight: 5,
      unit: "kg",
      description: "5kg 메디신볼",
    },
    {
      title: "메디신볼 8kg",
      weight: 8,
      unit: "kg",
      description: "8kg 메디신볼",
    },
    {
      title: "메디신볼 10kg",
      weight: 10,
      unit: "kg",
      description: "10kg 메디신볼",
    },

    // 밴드류 (무게 없음)
    {
      title: "저항밴드 (약함)",
      weight: 0,
      unit: "개",
      description: "노란색 저항밴드 - 약한 강도",
    },
    {
      title: "저항밴드 (보통)",
      weight: 0,
      unit: "개",
      description: "빨간색 저항밴드 - 보통 강도",
    },
    {
      title: "저항밴드 (강함)",
      weight: 0,
      unit: "개",
      description: "검정색 저항밴드 - 강한 강도",
    },
    {
      title: "루프밴드",
      weight: 0,
      unit: "개",
      description: "하체용 루프밴드",
    },

    // 기능성 도구들
    {
      title: "폼롤러",
      weight: 0.5,
      unit: "kg",
      description: "근막 이완용 폼롤러",
    },
    {
      title: "밸런스볼",
      weight: 1.2,
      unit: "kg",
      description: "65cm 밸런스볼",
    },
    {
      title: "보수볼",
      weight: 2,
      unit: "kg",
      description: "밸런스 트레이닝용 보수볼",
    },
    {
      title: "스텝박스",
      weight: 3,
      unit: "kg",
      description: "높이 조절 가능한 스텝박스",
    },
    {
      title: "슬라이딩 디스크",
      weight: 0.2,
      unit: "kg",
      description: "코어 운동용 슬라이딩 디스크",
    },

    // 기타
    {
      title: "헥스바",
      weight: 18,
      unit: "kg",
      description: "데드리프트용 헥스바",
    },
    { title: "안전바", weight: 12, unit: "kg", description: "스쿼트용 안전바" },
    { title: "체인", weight: 15, unit: "kg", description: "웨이트 체인" },
  ];

  for (const weight of weights) {
    // 중복 체크: 이미 존재하는 웨이트 도구면 건너뛰기
    if (existingWeightTitles.has(weight.title)) {
      console.log(`웨이트 도구 "${weight.title}" 이미 존재함 - 건너뛰기`);
      continue;
    }

    try {
      await prisma.weights.create({
        data: {
          title: weight.title,
          weight: weight.weight,
          unit: weight.unit,
          description: weight.description,
          fitnessCenterId,
        },
      });
      console.log(`웨이트 도구 "${weight.title}" 생성 완료`);
    } catch (error) {
      console.error(`웨이트 도구 "${weight.title}" 생성 실패:`, error);
    }
  }
};

export const createDummyStretchingExercises = async () => {
  // 이미 존재하는 스트레칭 운동 확인
  const existingExercises = await prisma.stretchingExercise.findMany({
    select: { title: true },
  });
  const existingExerciseTitles = new Set(existingExercises.map((e) => e.title));

  const stretchingExercises = [
    {
      title: "목 좌우 스트레칭",
      description: "목을 좌우로 천천히 기울여 목 옆쪽 근육을 늘려주는 스트레칭",
    },
    {
      title: "목 전후 스트레칭",
      description: "목을 앞뒤로 천천히 움직여 목 앞뒤 근육을 늘려주는 스트레칭",
    },
    {
      title: "어깨 돌리기",
      description:
        "어깨를 크게 원을 그리며 돌려 어깨 관절의 가동성을 높이는 운동",
    },
    {
      title: "어깨 뒤로 당기기",
      description:
        "양손을 뒤로 깍지 끼고 가슴을 펴며 어깨 앞쪽을 늘려주는 스트레칭",
    },
    {
      title: "삼두근 스트레칭",
      description:
        "한 팔을 머리 뒤로 올려 반대편 손으로 팔꿈치를 당겨 삼두근을 늘리는 스트레칭",
    },
    {
      title: "이두근 스트레칭",
      description:
        "팔을 뒤로 뻗어 벽에 대고 몸을 앞으로 밀어 이두근을 늘리는 스트레칭",
    },
    {
      title: "가슴 스트레칭",
      description:
        "벽 모서리에 팔을 대고 몸을 앞으로 밀어 가슴 근육을 늘리는 스트레칭",
    },
    {
      title: "광배근 스트레칭",
      description:
        "한 팔을 머리 위로 올려 반대편으로 기울여 옆구리와 광배근을 늘리는 스트레칭",
    },
    {
      title: "허리 비틀기",
      description:
        "앉은 자세에서 상체를 좌우로 비틀어 허리 근육을 늘리는 스트레칭",
    },
    {
      title: "무릎 가슴 당기기",
      description:
        "누운 자세에서 무릎을 가슴으로 당겨 허리와 엉덩이 근육을 늘리는 스트레칭",
    },
    {
      title: "대퇴사두근 스트레칭",
      description:
        "서서 한쪽 발목을 잡고 뒤로 당겨 허벅지 앞쪽 근육을 늘리는 스트레칭",
    },
    {
      title: "햄스트링 스트레칭",
      description:
        "앉아서 다리를 뻗고 상체를 앞으로 숙여 허벅지 뒤쪽 근육을 늘리는 스트레칭",
    },
    {
      title: "고관절 굴곡근 스트레칭",
      description:
        "런지 자세에서 골반을 앞으로 밀어 고관절 앞쪽 근육을 늘리는 스트레칭",
    },
    {
      title: "종아리 스트레칭",
      description:
        "벽에 손을 대고 한쪽 다리를 뒤로 뻗어 종아리 근육을 늘리는 스트레칭",
    },
    {
      title: "발목 돌리기",
      description:
        "앉아서 발목을 시계방향, 반시계방향으로 돌려 발목 관절의 가동성을 높이는 운동",
    },
    {
      title: "비둘기 자세",
      description:
        "한쪽 다리를 앞으로 구부리고 뒤쪽 다리를 뻗어 엉덩이 근육을 깊게 늘리는 스트레칭",
    },
    {
      title: "캣 카우 스트레칭",
      description:
        "네발 기기 자세에서 등을 둥글게 말았다 펴면서 척추 유연성을 높이는 스트레칭",
    },
    {
      title: "차일드 포즈",
      description:
        "무릎을 꿇고 앉아 상체를 앞으로 숙여 등과 어깨를 이완시키는 스트레칭",
    },
    {
      title: "코브라 스트레칭",
      description:
        "엎드린 자세에서 상체를 들어올려 복부와 허리 앞쪽을 늘리는 스트레칭",
    },
    {
      title: "나비 스트레칭",
      description:
        "앉아서 발바닥을 맞대고 무릎을 바닥에 가까이 내려 고관절 내측을 늘리는 스트레칭",
    },
    {
      title: "IT 밴드 스트레칭",
      description:
        "다리를 교차시켜 옆으로 기울여 허벅지 바깥쪽 IT 밴드를 늘리는 스트레칭",
    },
    {
      title: "척추 비틀기",
      description:
        "누워서 무릎을 한쪽으로 넘겨 척추를 비틀어 허리 긴장을 풀어주는 스트레칭",
    },
    {
      title: "엉덩이 스트레칭",
      description:
        "누운 자세에서 한쪽 다리를 가슴으로 당겨 엉덩이 근육을 늘리는 스트레칭",
    },
    {
      title: "전신 스트레칭",
      description:
        "누워서 팔과 다리를 반대 방향으로 뻗어 전신을 늘리는 스트레칭",
    },
    {
      title: "손목 스트레칭",
      description:
        "손목을 앞뒤, 좌우로 움직여 손목 관절과 전완근을 이완시키는 스트레칭",
    },
  ];

  for (const exercise of stretchingExercises) {
    // 중복 체크: 이미 존재하는 스트레칭 운동이면 건너뛰기
    if (existingExerciseTitles.has(exercise.title)) {
      console.log(`스트레칭 운동 "${exercise.title}" 이미 존재함 - 건너뛰기`);
      continue;
    }

    try {
      await prisma.stretchingExercise.create({
        data: {
          title: exercise.title,
          description: exercise.description,
        },
      });
      console.log(`스트레칭 운동 "${exercise.title}" 생성 완료`);
    } catch (error) {
      console.error(`스트레칭 운동 "${exercise.title}" 생성 실패:`, error);
    }
  }
};

export const submitLogin = async (data: FormData) => {
  const roleId = data.get("id");
  const userId = data.get("userId");
  const rawUserRole = data.get("role");
  const userRole =
    rawUserRole === "MANAGER"
      ? UserRole.MANAGER
      : rawUserRole === "TRAINER"
      ? UserRole.TRAINER
      : UserRole.MEMBER;

  if (userId && roleId && userRole) {
    await loginToSession(String(userId), userRole, String(roleId));
    if (userRole === UserRole.MANAGER) {
      redirect("/manager");
    } else if (userRole === UserRole.TRAINER) {
      redirect("/trainer");
    } else {
      redirect("/member");
    }
  }
};

export const getUserList = async () => {
  const memberList = await prisma.member.findMany({
    select: { id: true, user: { select: { username: true, id: true } } },
  });
  const trainerList = await prisma.trainer.findMany({
    select: { id: true, user: { select: { username: true, id: true } } },
  });
  const managerList = await prisma.manager.findMany({
    select: { id: true, user: { select: { username: true, id: true } } },
  });
  return { memberList, trainerList, managerList };
};

export const createRandomUser = async (data: FormData) => {
  let username = "";
  let exists: boolean = true;
  let mobile = "";
  let mobileExists: boolean = true;
  const rawUserRole = data.get("role");
  const userRole =
    rawUserRole === "MANAGER"
      ? UserRole.MANAGER
      : rawUserRole === "TRAINER"
      ? UserRole.TRAINER
      : UserRole.MEMBER;
  while (exists) {
    username = createRandomNumber(6) + "@test";
    const user = await prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });
    exists = user !== null;
  }
  while (mobileExists) {
    mobile = "010" + createRandomNumber(8);
    const user = await prisma.user.findFirst({
      where: { mobile },
      select: { id: true },
    });
    mobileExists = user != null;
  }
  const newUser = await prisma.user.create({
    data: {
      username,
      email: username + "@nobis.com",
      mobile,
      role: userRole,
    },
  });
  let roleId = "";
  if (userRole === UserRole.MANAGER) {
    const creation = await prisma.manager.create({
      data: {
        user: { connect: { id: newUser.id } },
      },
      select: { id: true },
    });
    roleId = creation.id;
  } else if (userRole === UserRole.TRAINER) {
    const creation = await prisma.trainer.create({
      data: {
        user: { connect: { id: newUser.id } },
      },
    });
    roleId = creation.id;
  } else {
    const creation = await prisma.member.create({
      data: {
        user: { connect: { id: newUser.id } },
      },
    });
    roleId = creation.id;
  }
  revalidatePath("/login");
};
