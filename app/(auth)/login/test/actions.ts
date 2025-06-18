"use server";

import prisma from "@/app/lib/prisma";
import { loginToSession } from "@/app/lib/socialLogin";
import { createRandomNumber } from "@/app/lib/utils";
import { ToolType, UserRole, WeekDay } from "@prisma/client";
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
  const dummyMachines = [
    {
      title: "레그 익스텐션",
      settings: [
        {
          title: "중량",
          unit: "Kg",
          values: [
            { value: "5" },
            { value: "10" },
            { value: "15" },
            { value: "20" },
            { value: "25" },
            { value: "30" },
            { value: "35" },
            { value: "40" },
            { value: "45" },
            { value: "50" },
            { value: "55" },
            { value: "60" },
            { value: "65" },
            { value: "70" },
            { value: "75" },
            { value: "80" },
            { value: "85" },
            { value: "90" },
            { value: "95" },
            { value: "100" },
          ],
        },
        {
          title: "등받이 깊이",
          unit: "단",
          values: [
            { value: "1" },
            { value: "2" },
            { value: "3" },
            { value: "4" },
            { value: "5" },
            { value: "6" },
            { value: "7" },
          ],
        },
        {
          title: "무릎 각도",
          unit: "단",
          values: [
            { value: "1" },
            { value: "2" },
            { value: "3" },
            { value: "4" },
            { value: "5" },
            { value: "6" },
            { value: "7" },
          ],
        },
        {
          title: "발목 각도",
          unit: "단",
          values: [
            { value: "1" },
            { value: "2" },
            { value: "3" },
            { value: "4" },
            { value: "5" },
            { value: "6" },
            { value: "7" },
          ],
        },
      ],
    },
    {
      title: "렛풀다운",
      settings: [
        {
          title: "중량",
          unit: "Kg",
          values: [
            { value: "5" },
            { value: "10" },
            { value: "15" },
            { value: "20" },
            { value: "25" },
            { value: "30" },
            { value: "35" },
            { value: "40" },
            { value: "45" },
            { value: "50" },
            { value: "55" },
            { value: "60" },
            { value: "65" },
            { value: "70" },
            { value: "75" },
            { value: "80" },
            { value: "85" },
            { value: "90" },
            { value: "95" },
            { value: "100" },
          ],
        },
        {
          title: "무릎받침",
          unit: "단",
          values: [
            { value: "1" },
            { value: "2" },
            { value: "3" },
            { value: "4" },
            { value: "5" },
            { value: "6" },
            { value: "7" },
          ],
        },
      ],
    },
    {
      title: "레그 프레스",
      settings: [
        {
          title: "중량",
          unit: "Kg",
          values: [
            { value: "5" },
            { value: "10" },
            { value: "15" },
            { value: "20" },
            { value: "25" },
            { value: "30" },
            { value: "35" },
            { value: "40" },
            { value: "45" },
            { value: "50" },
            { value: "55" },
            { value: "60" },
            { value: "65" },
            { value: "70" },
            { value: "75" },
            { value: "80" },
            { value: "85" },
            { value: "90" },
            { value: "95" },
            { value: "100" },
          ],
        },
        {
          title: "의자 깊이",
          unit: "단",
          values: [
            { value: "1" },
            { value: "2" },
            { value: "3" },
            { value: "4" },
            { value: "5" },
            { value: "6" },
            { value: "7" },
          ],
        },
      ],
    },
  ];
  for (const machine of dummyMachines) {
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
  }
};

export const createDummyFreeTool = async () => {
  const freeTools = [
    {
      title: "덤벨 1Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 1,
    },
    {
      title: "덤벨 2Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 2,
    },
    {
      title: "덤벨 3Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 3,
    },
    {
      title: "덤벨 4Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 4,
    },
    {
      title: "덤벨 5Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 5,
    },
    {
      title: "덤벨 6Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 6,
    },
    {
      title: "덤벨 7Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 7,
    },
    {
      title: "덤벨 8Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 8,
    },
    {
      title: "덤벨 9Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 9,
    },
    {
      title: "덤벨 10Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 10,
    },
    {
      title: "덤벨 12Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 12,
    },
    {
      title: "덤벨 14Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 14,
    },
    {
      title: "덤벨 16Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 16,
    },
    {
      title: "덤벨 18Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 18,
    },
    {
      title: "덤벨 20Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 20,
    },
    {
      title: "덤벨 22Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 22,
    },
    {
      title: "덤벨 24Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 24,
    },
    {
      title: "덤벨 26Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 26,
    },
    {
      title: "덤벨 28Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 28,
    },
    {
      title: "덤벨 30Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 30,
    },
    {
      title: "덤벨 35Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 35,
    },
    {
      title: "덤벨 40Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 40,
    },
    {
      title: "덤벨 45Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 45,
    },
    {
      title: "덤벨 50Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 50,
    },
    {
      title: "덤벨 55Kg",
      type: ToolType.DUMBBELL,
      hasFixedWeight: true,
      fixedWeight: 55,
    },
    { title: "바벨", type: ToolType.BARBELL, hasFixedWeight: false },
    { title: "밴드노랑", type: ToolType.RESISTANCE, hasFixedWeight: false },
    { title: "밴드빨강", type: ToolType.RESISTANCE, hasFixedWeight: false },
    { title: "밴드초록", type: ToolType.RESISTANCE, hasFixedWeight: false },
    { title: "밴드파랑", type: ToolType.RESISTANCE, hasFixedWeight: false },
    { title: "밴드보라", type: ToolType.RESISTANCE, hasFixedWeight: false },
    { title: "스텝박스", type: ToolType.PLATFORM, hasFixedWeight: false },
    { title: "봉", type: ToolType.OTHER, hasFixedWeight: false },
  ];
  const fitnessCenters = await prisma.fitnessCenter.findMany({
    select: { id: true },
  });
  await Promise.all(
    fitnessCenters.map(async (fitnessCenter) => {
      await Promise.all(
        freeTools.map(async (freeTool) => {
          await prisma.freeTool.create({
            data: {
              ...freeTool,
              fitnessCenterId: fitnessCenter.id,
            },
          });
        })
      );
    })
  );
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
