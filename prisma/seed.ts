// prisma/seed.ts
import {
  PrismaClient,
  UserRole,
  WeekDay,
  EquipmentCategory,
} from "@prisma/client";

const prisma = new PrismaClient();

// 랜덤 ID 생성 함수들
function generateRandomNaverId(): string {
  return `naver_${Math.random().toString(36).substring(2, 15)}${Math.random()
    .toString(36)
    .substring(2, 15)}`;
}

function generateRandomKakaoId(): string {
  return Math.floor(Math.random() * 900000000 + 100000000).toString(); // 9자리 랜덤 숫자
}

async function main() {
  console.log("🌱 시드 데이터 생성 시작...");

  try {
    // 1. 사용자 및 역할별 데이터 생성
    await createUsers();

    // 2. 피트니스 센터 및 영업시간 생성
    await createFitnessCenters();

    // 3. 머신 데이터 생성
    await createMachines();

    // 4. 웨이트 도구 생성
    await createAllEquipmentData();

    // 5. 스트레칭 운동 생성
    await createStretchingExercises();

    console.log("🎉 시드 데이터 생성 완료!");
  } catch (error) {
    console.error("❌ 시드 데이터 생성 실패:", error);
    throw error;
  }
}

async function createUsers() {
  console.log("👥 사용자 데이터 생성 중...");

  // 사용된 ID들을 추적하기 위한 Set
  const usedNaverIds = new Set<string>();
  const usedKakaoIds = new Set<string>();

  // 중복되지 않는 ID 생성 함수
  function getUniqueNaverId(): string {
    let naverId: string;
    do {
      naverId = generateRandomNaverId();
    } while (usedNaverIds.has(naverId));
    usedNaverIds.add(naverId);
    return naverId;
  }

  function getUniqueKakaoId(): string {
    let kakaoId: string;
    do {
      kakaoId = generateRandomKakaoId();
    } while (usedKakaoIds.has(kakaoId));
    usedKakaoIds.add(kakaoId);
    return kakaoId;
  }

  // 트레이너 10명 생성 (절반은 naver, 절반은 kakao)
  const dummyTrainerData = [
    { username: "김태호", mobile: "01012345678", email: "kimtaeho@test.com" },
    {
      username: "이영희",
      mobile: "01023456789",
      email: "leeyounghee@test.com",
    },
    {
      username: "박철수",
      mobile: "01034567890",
      email: "parkchulsoo@test.com",
    },
    { username: "최민수", mobile: "01045678901", email: "choiminsoo@test.com" },
    {
      username: "정현우",
      mobile: "01056789012",
      email: "jeonghyeonwoo@test.com",
    },
    { username: "유지훈", mobile: "01067890123", email: "yujihun@test.com" },
    { username: "이지우", mobile: "01078901234", email: "leeziwoo@test.com" },
    { username: "오서준", mobile: "01089012345", email: "ohseojun@test.com" },
    { username: "박서윤", mobile: "01090123456", email: "parkseoyun@test.com" },
    { username: "이서연", mobile: "01001234567", email: "leeseoyeon@test.com" },
  ];

  for (let i = 0; i < dummyTrainerData.length; i++) {
    const trainerData = dummyTrainerData[i];

    // 이미 존재하는 트레이너인지 확인
    const existingUser = await prisma.user.findFirst({
      where: { username: trainerData.username },
    });

    if (existingUser) {
      console.log(
        `🔄 트레이너 "${trainerData.username}" 이미 존재함 - 건너뛰기`
      );
      continue;
    }

    const isNaver = i < Math.ceil(dummyTrainerData.length / 2); // 첫 절반은 네이버

    try {
      const trainer = await prisma.user.create({
        data: {
          ...trainerData,
          role: UserRole.TRAINER,
          naverId: isNaver ? getUniqueNaverId() : null,
          kakaoId: isNaver ? null : getUniqueKakaoId(),
        },
      });
      await prisma.trainer.create({
        data: {
          user: { connect: { id: trainer.id } },
        },
      });
      console.log(`✅ 트레이너 "${trainerData.username}" 생성 완료`);
    } catch (error) {
      console.error(`❌ 트레이너 "${trainerData.username}" 생성 실패:`, error);
    }
  }

  // 매니저 2명 생성 (1명은 naver, 1명은 kakao)
  const dummyManagerData = [
    { username: "대표A", mobile: "01011112222", email: "ceoa@test.com" },
    { username: "대표B", mobile: "01022223333", email: "ceob@test.com" },
  ];

  for (let i = 0; i < dummyManagerData.length; i++) {
    const managerData = dummyManagerData[i];

    // 이미 존재하는 매니저인지 확인
    const existingUser = await prisma.user.findFirst({
      where: { username: managerData.username },
    });

    if (existingUser) {
      console.log(`🔄 매니저 "${managerData.username}" 이미 존재함 - 건너뛰기`);
      continue;
    }

    const isNaver = i === 0; // 첫 번째는 네이버

    try {
      const manager = await prisma.user.create({
        data: {
          ...managerData,
          role: UserRole.MANAGER,
          naverId: isNaver ? getUniqueNaverId() : null,
          kakaoId: isNaver ? null : getUniqueKakaoId(),
        },
      });
      await prisma.manager.create({
        data: {
          user: { connect: { id: manager.id } },
        },
      });
      console.log(`✅ 매니저 "${managerData.username}" 생성 완료`);
    } catch (error) {
      console.error(`❌ 매니저 "${managerData.username}" 생성 실패:`, error);
    }
  }

  // 회원 10명 생성 (절반은 naver, 절반은 kakao)
  const dummyMemberData = [
    { username: "회원A", mobile: "01033334444", email: "membera@test.com" },
    { username: "회원B", mobile: "01044445555", email: "memberb@test.com" },
    { username: "회원C", mobile: "01055556666", email: "memberc@test.com" },
    { username: "회원D", mobile: "01066667777", email: "memberd@test.com" },
    { username: "회원E", mobile: "01077778888", email: "membere@test.com" },
    { username: "회원F", mobile: "01088889999", email: "memberf@test.com" },
    { username: "회원G", mobile: "01099990000", email: "memberg@test.com" },
    { username: "회원H", mobile: "01000001111", email: "memberh@test.com" },
    { username: "회원I", mobile: "01011113333", email: "memberi@test.com" },
    { username: "회원J", mobile: "01022224444", email: "memberj@test.com" },
  ];

  for (let i = 0; i < dummyMemberData.length; i++) {
    const memberData = dummyMemberData[i];

    // 이미 존재하는 회원인지 확인
    const existingUser = await prisma.user.findFirst({
      where: { username: memberData.username },
    });

    if (existingUser) {
      console.log(`🔄 회원 "${memberData.username}" 이미 존재함 - 건너뛰기`);
      continue;
    }

    const isNaver = i < Math.ceil(dummyMemberData.length / 2); // 첫 절반은 네이버

    try {
      const member = await prisma.user.create({
        data: {
          ...memberData,
          role: UserRole.MEMBER,
          naverId: isNaver ? getUniqueNaverId() : null,
          kakaoId: isNaver ? null : getUniqueKakaoId(),
        },
      });
      await prisma.member.create({
        data: {
          user: { connect: { id: member.id } },
        },
      });
      console.log(`✅ 회원 "${memberData.username}" 생성 완료`);
    } catch (error) {
      console.error(`❌ 회원 "${memberData.username}" 생성 실패:`, error);
    }
  }

  console.log("✅ 사용자 데이터 생성 완료");
}

async function createFitnessCenters() {
  console.log("🏢 피트니스 센터 및 영업시간 생성 중...");

  // 영업시간 데이터 정의
  const openingHoursData = [
    { dayOfWeek: WeekDay.MON, openTime: 600, closeTime: 2400, isClosed: false }, // 월: 06:00-24:00
    { dayOfWeek: WeekDay.TUE, openTime: 0, closeTime: 2400, isClosed: false }, // 화: 00:00-24:00
    { dayOfWeek: WeekDay.WED, openTime: 0, closeTime: 2400, isClosed: false }, // 수: 00:00-24:00
    { dayOfWeek: WeekDay.THU, openTime: 0, closeTime: 2400, isClosed: false }, // 목: 00:00-24:00
    { dayOfWeek: WeekDay.FRI, openTime: 0, closeTime: 2400, isClosed: false }, // 금: 00:00-24:00
    { dayOfWeek: WeekDay.SAT, openTime: 0, closeTime: 1800, isClosed: false }, // 토: 00:00-18:00
    { dayOfWeek: WeekDay.SUN, openTime: 0, closeTime: 0, isClosed: true }, // 일: 휴무
  ];

  // 영업시간 생성 (이미 존재하는지 확인)
  const createdOpeningHours = [];
  for (const hourData of openingHoursData) {
    const existingHour = await prisma.openingHour.findFirst({
      where: {
        dayOfWeek: hourData.dayOfWeek,
        openTime: hourData.openTime,
        closeTime: hourData.closeTime,
      },
    });

    if (existingHour) {
      console.log(
        `🔄 영업시간 "${hourData.dayOfWeek}" 이미 존재함 - 기존 데이터 사용`
      );
      createdOpeningHours.push(existingHour);
    } else {
      try {
        const openingHour = await prisma.openingHour.create({
          data: hourData,
        });
        createdOpeningHours.push(openingHour);
        console.log(`✅ 영업시간 "${hourData.dayOfWeek}" 생성 완료`);
      } catch (error) {
        console.error(`❌ 영업시간 "${hourData.dayOfWeek}" 생성 실패:`, error);
      }
    }
  }

  // 피트니스 센터 생성
  const dummyFitnessCenterData = [
    {
      title: "유천점",
      address: "선수촌로 79-19 더퍼스트 2층",
      phone: "0336429682",
      description: "유천점입니다.",
    },
    {
      title: "입암본점",
      address: "성덕포남로 45-8 4층",
      phone: "050713919684",
      description: "입암본점입니다.",
    },
  ];

  for (const centerData of dummyFitnessCenterData) {
    // 이미 존재하는 피트니스센터인지 확인
    const existingCenter = await prisma.fitnessCenter.findFirst({
      where: { title: centerData.title },
    });

    if (existingCenter) {
      console.log(
        `🔄 피트니스센터 "${centerData.title}" 이미 존재함 - 건너뛰기`
      );
      continue;
    }

    try {
      await prisma.fitnessCenter.create({
        data: {
          ...centerData,
          openingHours: {
            connect: createdOpeningHours.map((hour) => ({ id: hour.id })),
          },
        },
      });
      console.log(`✅ 피트니스센터 "${centerData.title}" 생성 완료`);
    } catch (error) {
      console.error(`❌ 피트니스센터 "${centerData.title}" 생성 실패:`, error);
    }
  }

  console.log("✅ 피트니스 센터 생성 완료");
}

async function createMachines() {
  console.log("🏋️ 머신 데이터 생성 중...");

  const fitnessCenters = await prisma.fitnessCenter.findMany({
    select: { id: true },
  });

  for (const fitnessCenter of fitnessCenters) {
    await createMachineData(fitnessCenter.id);
  }

  console.log("✅ 머신 데이터 생성 완료");
}

async function createMachineData(fitnessCenterId: string) {
  // 이미 존재하는 머신 확인
  const existingMachines = await prisma.machine.findMany({
    where: { fitnessCenterId },
    select: { title: true },
  });
  const existingMachineTitles = new Set(existingMachines.map((m) => m.title));

  const machines = [
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
  ];

  for (const machine of machines) {
    // 중복 체크: 이미 존재하는 머신이면 건너뛰기
    if (existingMachineTitles.has(machine.title)) {
      console.log(`🔄 머신 "${machine.title}" 이미 존재함 - 건너뛰기`);
      continue;
    }

    try {
      await prisma.machine.create({
        data: {
          title: machine.title,
          fitnessCenterId,
          machineSetting: {
            create: machine.settings.map((setting) => ({
              title: setting.title,
              unit: setting.unit,
              values: {
                create: setting.values,
              },
            })),
          },
        },
      });
      console.log(`✅ 머신 "${machine.title}" 생성 완료`);
    } catch (error) {
      console.error(`❌ 머신 "${machine.title}" 생성 실패:`, error);
    }
  }
}

const createAllEquipmentData = async () => {
  const fitnessCenters = await prisma.fitnessCenter.findMany({
    select: { id: true, title: true },
  });

  for (const center of fitnessCenters) {
    console.log(`피트니스 센터 "${center.title}"에 기구 데이터 생성 중...`);
    await createEquipmentData(center.id);
  }
};

const createEquipmentData = async (fitnessCenterId: string) => {
  // 이미 존재하는 기구 확인
  const existingEquipment = await prisma.equipment.findMany({
    where: { fitnessCenterId },
    select: { title: true },
  });
  const existingTitles = new Set(existingEquipment.map((e) => e.title));

  const equipmentData = [
    // 덤벨 세트
    ...Array.from({ length: 25 }, (_, i) => ({
      title: `덤벨 ${(i + 1) * 2}kg`,
      category: EquipmentCategory.WEIGHT,
      primaryValue: (i + 1) * 2,
      primaryUnit: "kg",
      description: `${(i + 1) * 2}kg 고정식 덤벨`,
      quantity: 2,
      location: "덤벨 렉",
    })),

    // 바벨류
    {
      title: "올림픽 바벨 20kg",
      category: EquipmentCategory.WEIGHT,
      primaryValue: 20,
      primaryUnit: "kg",
      secondaryValue: 220,
      secondaryUnit: "cm",
      description: "표준 올림픽 바벨",
      quantity: 3,
      location: "바벨 렉",
    },
    {
      title: "EZ 바벨 10kg",
      category: EquipmentCategory.WEIGHT,
      primaryValue: 10,
      primaryUnit: "kg",
      description: "컬용 EZ 바벨",
      quantity: 2,
      location: "바벨 렉",
    },

    // 원판류
    ...Array.from({ length: 7 }, (_, i) => {
      const weights = [1.25, 2.5, 5, 10, 15, 20, 25];
      const quantities = [8, 8, 6, 4, 4, 2, 2];
      return {
        title: `원판 ${weights[i]}kg`,
        category: EquipmentCategory.WEIGHT,
        primaryValue: weights[i],
        primaryUnit: "kg",
        description: `${weights[i]}kg 고무 원판`,
        quantity: quantities[i],
        location: "원판 렉",
      };
    }),

    // 케틀벨
    ...Array.from({ length: 6 }, (_, i) => {
      const weights = [8, 12, 16, 20, 24, 28];
      return {
        title: `케틀벨 ${weights[i]}kg`,
        category: EquipmentCategory.SPECIALTY,
        primaryValue: weights[i],
        primaryUnit: "kg",
        description: `${weights[i]}kg 케틀벨`,
        quantity: 1,
        location: "케틀벨 존",
      };
    }),

    // 고무밴드/저항밴드
    {
      title: "고무밴드 옐로우",
      category: EquipmentCategory.RESISTANCE,
      primaryValue: 15,
      primaryUnit: "lbs",
      description: "15파운드 저항력 고무밴드",
      quantity: 15,
      location: "밴드 보관함",
    },
    {
      title: "고무밴드 레드",
      category: EquipmentCategory.RESISTANCE,
      primaryValue: 20,
      primaryUnit: "lbs",
      description: "20파운드 저항력 고무밴드",
      quantity: 12,
      location: "밴드 보관함",
    },
    {
      title: "고무밴드 블루",
      category: EquipmentCategory.RESISTANCE,
      primaryValue: 25,
      primaryUnit: "lbs",
      description: "25파운드 저항력 고무밴드",
      quantity: 10,
      location: "밴드 보관함",
    },
    {
      title: "루프밴드 라이트",
      category: EquipmentCategory.RESISTANCE,
      primaryValue: 1,
      primaryUnit: "level",
      description: "하체용 루프밴드 - 약한 강도",
      quantity: 15,
      location: "밴드 보관함",
    },
    {
      title: "루프밴드 미디움",
      category: EquipmentCategory.RESISTANCE,
      primaryValue: 2,
      primaryUnit: "level",
      description: "하체용 루프밴드 - 보통 강도",
      quantity: 15,
      location: "밴드 보관함",
    },

    // 기능성 도구
    {
      title: "폼롤러 60cm",
      category: EquipmentCategory.FUNCTIONAL,
      primaryValue: 60,
      primaryUnit: "cm",
      description: "근막 이완용 폼롤러",
      quantity: 8,
      location: "스트레칭 존",
    },
    {
      title: "밸런스볼 65cm",
      category: EquipmentCategory.FUNCTIONAL,
      primaryValue: 65,
      primaryUnit: "cm",
      description: "밸런스 트레이닝용 짐볼",
      quantity: 6,
      location: "기능성 존",
    },

    // 메디신볼
    ...Array.from({ length: 4 }, (_, i) => {
      const weights = [3, 5, 8, 10];
      return {
        title: `메디신볼 ${weights[i]}kg`,
        category: EquipmentCategory.CORE,
        primaryValue: weights[i],
        primaryUnit: "kg",
        description: `${weights[i]}kg 메디신볼`,
        quantity: 2,
        location: "메디신볼 렉",
      };
    }),

    // 가동성 도구
    {
      title: "요가매트",
      category: EquipmentCategory.MOBILITY,
      primaryValue: 173,
      primaryUnit: "cm",
      secondaryValue: 61,
      secondaryUnit: "cm",
      description: "운동용 요가매트",
      quantity: 20,
      location: "매트 보관함",
    },

    // 액세서리
    {
      title: "파워 리프팅 벨트",
      category: EquipmentCategory.ACCESSORY,
      primaryValue: 10,
      primaryUnit: "cm",
      description: "파워리프팅용 가죽 벨트",
      quantity: 5,
      location: "액세서리 보관함",
    },

    // 유산소 도구
    {
      title: "줄넘기",
      category: EquipmentCategory.CARDIO,
      primaryValue: 3,
      primaryUnit: "m",
      description: "조절 가능한 줄넘기",
      quantity: 15,
      location: "유산소 존",
    },
  ];

  // 기구 생성
  for (const equipment of equipmentData) {
    if (existingTitles.has(equipment.title)) {
      console.log(`기구 "${equipment.title}" 이미 존재함 - 건너뛰기`);
      continue;
    }

    try {
      await prisma.equipment.create({
        data: {
          ...equipment,
          fitnessCenterId,
        },
      });
      console.log(`기구 "${equipment.title}" 생성 완료`);
    } catch (error) {
      console.error(`기구 "${equipment.title}" 생성 실패:`, error);
    }
  }
};

async function createStretchingExercises() {
  console.log("🤸 스트레칭 운동 생성 중...");

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
      console.log(
        `🔄 스트레칭 운동 "${exercise.title}" 이미 존재함 - 건너뛰기`
      );
      continue;
    }

    try {
      await prisma.stretchingExercise.create({
        data: {
          title: exercise.title,
          description: exercise.description,
        },
      });
      console.log(`✅ 스트레칭 운동 "${exercise.title}" 생성 완료`);
    } catch (error) {
      console.error(`❌ 스트레칭 운동 "${exercise.title}" 생성 실패:`, error);
    }
  }

  console.log("✅ 스트레칭 운동 생성 완료");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
