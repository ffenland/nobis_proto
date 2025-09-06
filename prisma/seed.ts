// prisma/seed.ts
import {
  PrismaClient,
  UserRole,
  WeekDay,
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

    // 4. Equipment 그룹 및 브랜드 생성
    await createEquipmentGroupsAndBrands();

    // 5. 웨이트 도구 생성 (새로운 구조)
    await createAllEquipmentData();

    // 6. 프리 웨이트 운동 생성
    await createFreeExercises();

    // 7. 스트레칭 운동 생성
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

  // 멤버 20명 생성 (절반은 naver, 절반은 kakao)
  const dummyMemberData = [
    { username: "김민준", mobile: "01012340001", email: "kimminjun@test.com" },
    { username: "이서윤", mobile: "01012340002", email: "leeseoyun@test.com" },
    { username: "박도현", mobile: "01012340003", email: "parkdohyun@test.com" },
    { username: "최예은", mobile: "01012340004", email: "choiyeeun@test.com" },
    {
      username: "정시우",
      mobile: "01012340005",
      email: "jeongsiwoo@test.com",
    },
    { username: "한지민", mobile: "01012340006", email: "hanjimin@test.com" },
    { username: "윤준서", mobile: "01012340007", email: "yunjunseo@test.com" },
    { username: "김하은", mobile: "01012340008", email: "kimhaeun@test.com" },
    {
      username: "이건우",
      mobile: "01012340009",
      email: "leegunwoo@test.com",
    },
    {
      username: "송유진",
      mobile: "01012340010",
      email: "songyujin@test.com",
    },
    {
      username: "홍길동",
      mobile: "01012340011",
      email: "honggildong@test.com",
    },
    { username: "김유나", mobile: "01012340012", email: "kimyuna@test.com" },
    {
      username: "박현수",
      mobile: "01012340013",
      email: "parkhyunsoo@test.com",
    },
    { username: "이수빈", mobile: "01012340014", email: "leesubin@test.com" },
    {
      username: "정민호",
      mobile: "01012340015",
      email: "jungminho@test.com",
    },
    { username: "황서영", mobile: "01012340016", email: "hwangseoyoung@test.com" },
    { username: "임태현", mobile: "01012340017", email: "limtaehyun@test.com" },
    { username: "조아름", mobile: "01012340018", email: "choahreum@test.com" },
    {
      username: "서지후",
      mobile: "01012340019",
      email: "seojihu@test.com",
    },
    { username: "강민서", mobile: "01012340020", email: "kangminseo@test.com" },
  ];

  // 매니저 2명 생성 (naver, kakao 각 1명)
  const dummyManagerData = [
    {
      username: "관리자1",
      mobile: "01099999991",
      email: "manager1@test.com",
    },
    {
      username: "관리자2",
      mobile: "01099999992",
      email: "manager2@test.com",
    },
  ];

  // 사용자 생성 및 역할별 프로필 생성
  for (let i = 0; i < dummyTrainerData.length; i++) {
    const userData = dummyTrainerData[i];
    const isNaverUser = i < 5;

    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        mobile: userData.mobile,
        role: UserRole.TRAINER,
        ...(isNaverUser
          ? { naverId: getUniqueNaverId() }
          : { kakaoId: getUniqueKakaoId() }),
        userData: {
          create: {},
        },
        trainerProfile: {
          create: {
            introduce: `안녕하세요! ${userData.username} 트레이너입니다. 건강한 운동 라이프를 만들어가요!`,
          },
        },
      },
    });
    console.log(`✅ 트레이너 생성: ${user.username}`);
  }

  for (let i = 0; i < dummyMemberData.length; i++) {
    const userData = dummyMemberData[i];
    const isNaverUser = i < 10;

    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        mobile: userData.mobile,
        role: UserRole.MEMBER,
        ...(isNaverUser
          ? { naverId: getUniqueNaverId() }
          : { kakaoId: getUniqueKakaoId() }),
        userData: {
          create: {},
        },
        memberProfile: {
          create: {
            active: true,
          },
        },
      },
    });
    console.log(`✅ 멤버 생성: ${user.username}`);
  }

  for (let i = 0; i < dummyManagerData.length; i++) {
    const userData = dummyManagerData[i];
    const isNaverUser = i === 0;

    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        mobile: userData.mobile,
        role: UserRole.MANAGER,
        ...(isNaverUser
          ? { naverId: getUniqueNaverId() }
          : { kakaoId: getUniqueKakaoId() }),
        userData: {
          create: {},
        },
        managerProfile: {
          create: {},
        },
      },
    });
    console.log(`✅ 매니저 생성: ${user.username}`);
  }

  console.log("✅ 사용자 데이터 생성 완료");
}

async function createFitnessCenters() {
  console.log("🏢 피트니스 센터 데이터 생성 중...");

  // 영업시간 생성 (월~금: 06:00-22:00, 토: 08:00-20:00, 일: 휴무)
  const weekdayHours = await prisma.openingHour.create({
    data: {
      dayOfWeek: WeekDay.MON,
      openTime: 600,
      closeTime: 2200,
      isClosed: false,
    },
  });

  const saturdayHours = await prisma.openingHour.create({
    data: {
      dayOfWeek: WeekDay.SAT,
      openTime: 800,
      closeTime: 2000,
      isClosed: false,
    },
  });

  const sundayHours = await prisma.openingHour.create({
    data: {
      dayOfWeek: WeekDay.SUN,
      openTime: 0,
      closeTime: 0,
      isClosed: true,
    },
  });

  // 트레이너 근무시간 생성 (월~금: 09:00-21:00, 토: 10:00-18:00)
  const trainerWeekdayHours = await prisma.workingHour.create({
    data: {
      dayOfWeek: WeekDay.MON,
      openTime: 900,
      closeTime: 2100,
    },
  });

  const trainerSaturdayHours = await prisma.workingHour.create({
    data: {
      dayOfWeek: WeekDay.SAT,
      openTime: 1000,
      closeTime: 1800,
    },
  });

  // 피트니스 센터 2개 생성
  const fitnessCenters = [
    {
      title: "노비스 피트니스 강남점",
      address: "서울특별시 강남구 테헤란로 123",
      phone: "02-1234-5678",
      description: "강남의 프리미엄 피트니스 센터",
    },
    {
      title: "노비스 피트니스 홍대점",
      address: "서울특별시 마포구 홍익로 456",
      phone: "02-2345-6789",
      description: "홍대의 트렌디한 피트니스 센터",
    },
  ];

  for (const centerData of fitnessCenters) {
    const center = await prisma.fitnessCenter.create({
      data: {
        ...centerData,
        openingHours: {
          connect: [
            { id: weekdayHours.id },
            { id: saturdayHours.id },
            { id: sundayHours.id },
          ],
        },
        defaultWorkingHours: {
          connect: [
            { id: trainerWeekdayHours.id },
            { id: trainerSaturdayHours.id },
          ],
        },
      },
    });

    console.log(`✅ 피트니스 센터 생성: ${center.title}`);

    // 매니저와 트레이너를 센터에 할당
    const managers = await prisma.manager.findMany({
      take: 1,
      skip: fitnessCenters.indexOf(centerData), // 각 센터당 매니저 1명
    });

    const trainers = await prisma.trainer.findMany({
      take: 5,
      skip: fitnessCenters.indexOf(centerData) * 5, // 각 센터당 트레이너 5명
    });

    // 매니저 할당
    if (managers.length > 0) {
      await prisma.manager.update({
        where: { id: managers[0].id },
        data: { fitnessCenterId: center.id },
      });
    }

    // 트레이너들 할당 및 근무시간 설정
    for (const trainer of trainers) {
      await prisma.trainer.update({
        where: { id: trainer.id },
        data: {
          fitnessCenterId: center.id,
          workingHours: {
            connect: [
              { id: trainerWeekdayHours.id },
              { id: trainerSaturdayHours.id },
            ],
          },
        },
      });
    }

    // 멤버들을 센터에 할당
    const members = await prisma.member.findMany({
      take: 10,
      skip: fitnessCenters.indexOf(centerData) * 10, // 각 센터당 멤버 10명
    });

    for (const member of members) {
      await prisma.member.update({
        where: { id: member.id },
        data: { fitnessCenterId: center.id },
      });
    }
  }

  console.log("✅ 피트니스 센터 데이터 생성 완료");
}

async function createMachines() {
  console.log("🏋️ 머신 데이터 생성 중...");

  const fitnessCenters = await prisma.fitnessCenter.findMany({
    select: { id: true, title: true },
  });

  const machineTemplates = [
    {
      title: "레그 프레스",
      settings: [
        {
          title: "무게",
          unit: "kg",
          values: Array.from({ length: 20 }, (_, i) => `${(i + 1) * 5}`),
        },
        {
          title: "시트 높이",
          unit: "level",
          values: Array.from({ length: 10 }, (_, i) => `${i + 1}`),
        },
      ],
    },
    {
      title: "체스트 프레스",
      settings: [
        {
          title: "무게",
          unit: "kg",
          values: Array.from({ length: 15 }, (_, i) => `${(i + 1) * 5}`),
        },
        {
          title: "시트 높이",
          unit: "level",
          values: Array.from({ length: 8 }, (_, i) => `${i + 1}`),
        },
        {
          title: "등받이 각도",
          unit: "degree",
          values: ["80", "85", "90"],
        },
      ],
    },
    {
      title: "랫 풀다운",
      settings: [
        {
          title: "무게",
          unit: "kg",
          values: Array.from({ length: 15 }, (_, i) => `${(i + 1) * 5}`),
        },
        {
          title: "시트 높이",
          unit: "level",
          values: Array.from({ length: 6 }, (_, i) => `${i + 1}`),
        },
      ],
    },
  ];

  for (const center of fitnessCenters) {
    console.log(`피트니스 센터 "${center.title}"에 머신 데이터 생성 중...`);

    for (const template of machineTemplates) {
      const machine = await prisma.machine.create({
        data: {
          title: template.title,
          fitnessCenterId: center.id,
        },
      });

      for (const settingTemplate of template.settings) {
        const setting = await prisma.machineSetting.create({
          data: {
            machineId: machine.id,
            title: settingTemplate.title,
            unit: settingTemplate.unit,
          },
        });

        for (const value of settingTemplate.values) {
          await prisma.machineSettingValue.create({
            data: {
              machineSettingId: setting.id,
              value: value,
            },
          });
        }
      }

      console.log(`  ✅ ${template.title} 머신 생성 완료`);
    }
  }

  console.log("✅ 머신 데이터 생성 완료");
}

async function createEquipmentGroupsAndBrands() {
  console.log("🏷️ Equipment 그룹 및 브랜드 데이터 생성 중...");

  // Equipment 그룹 생성
  const equipmentGroups = [
    { name: "덤벨", description: "고정식 및 조절식 덤벨" },
    { name: "바벨", description: "올림픽바, EZ바 등 바벨류" },
    { name: "원판", description: "바벨용 웨이트 플레이트" },
    { name: "케틀벨", description: "케틀벨 웨이트" },
    { name: "고무밴드", description: "저항 운동용 밴드" },
    { name: "루프밴드", description: "하체용 루프 밴드" },
    { name: "폼롤러", description: "근막 이완용 도구" },
    { name: "밸런스볼", description: "밸런스 트레이닝 도구" },
    { name: "메디신볼", description: "코어 운동용 볼" },
    { name: "요가매트", description: "요가 및 스트레칭용 매트" },
    { name: "줄넘기", description: "유산소 운동용 줄넘기" },
    { name: "TRX", description: "서스펜션 트레이닝 도구" },
  ];

  for (const group of equipmentGroups) {
    const created = await prisma.equipmentGroup.create({
      data: group,
    });
    console.log(`  ✅ 그룹 생성: ${created.name}`);
  }

  // Equipment 브랜드 생성
  const equipmentBrands = [
    { name: "Nike" },
    { name: "Adidas" },
    { name: "PowerTech" },
    { name: "LifeFitness" },
    { name: "Technogym" },
    { name: "Hammer" },
    { name: "Eleiko" },
    { name: "Rogue" },
    { name: "Theraband" },
    { name: "TRX" },
    { name: "Gaiam" },
    { name: "SPRI" },
  ];

  for (const brand of equipmentBrands) {
    const created = await prisma.equipmentBrand.create({
      data: brand,
    });
    console.log(`  ✅ 브랜드 생성: ${created.name}`);
  }

  console.log("✅ Equipment 그룹 및 브랜드 데이터 생성 완료");
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
  // 그룹과 브랜드 데이터 가져오기
  const groups = await prisma.equipmentGroup.findMany();
  const brands = await prisma.equipmentBrand.findMany();
  
  const groupMap = new Map(groups.map(g => [g.name, g.id]));
  const brandMap = new Map(brands.map(b => [b.name, b.id]));

  // 덤벨 생성 (2kg~50kg, 2kg 단위)
  const dumbbellGroup = groupMap.get("덤벨");
  if (dumbbellGroup) {
    for (let weight = 2; weight <= 50; weight += 2) {
      await prisma.equipment.create({
        data: {
          groupId: dumbbellGroup,
          brandId: brandMap.get("PowerTech") || null,
          primaryValue: weight.toString(),
          primaryUnit: "kg",
          description: `고정식 덤벨 ${weight}kg`,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 덤벨 생성 완료 (2kg~50kg)");
  }

  // 바벨 생성
  const barbelGroup = groupMap.get("바벨");
  if (barbelGroup) {
    // 올림픽 바벨
    await prisma.equipment.create({
      data: {
        groupId: barbelGroup,
        brandId: brandMap.get("Eleiko") || null,
        primaryValue: "20",
        primaryUnit: "kg",
        secondaryValue: "220",
        secondaryUnit: "cm",
        description: "표준 올림픽 바벨",
        fitnessCenterId,
      },
    });

    // EZ 바벨
    await prisma.equipment.create({
      data: {
        groupId: barbelGroup,
        brandId: brandMap.get("PowerTech") || null,
        primaryValue: "10",
        primaryUnit: "kg",
        description: "컬용 EZ 바벨",
        fitnessCenterId,
      },
    });
    console.log("  ✅ 바벨 생성 완료");
  }

  // 원판 생성
  const plateGroup = groupMap.get("원판");
  if (plateGroup) {
    const plateWeights = [1.25, 2.5, 5, 10, 15, 20, 25];
    for (const weight of plateWeights) {
      await prisma.equipment.create({
        data: {
          groupId: plateGroup,
          brandId: brandMap.get("Eleiko") || null,
          primaryValue: weight.toString(),
          primaryUnit: "kg",
          description: `고무 원판 ${weight}kg`,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 원판 생성 완료");
  }

  // 케틀벨 생성
  const kettlebellGroup = groupMap.get("케틀벨");
  if (kettlebellGroup) {
    const kettlebellWeights = [8, 12, 16, 20, 24, 28];
    for (const weight of kettlebellWeights) {
      await prisma.equipment.create({
        data: {
          groupId: kettlebellGroup,
          brandId: brandMap.get("Rogue") || null,
          primaryValue: weight.toString(),
          primaryUnit: "kg",
          description: `케틀벨 ${weight}kg`,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 케틀벨 생성 완료");
  }

  // 고무밴드 생성 (저항력별 색상)
  const resistanceBandGroup = groupMap.get("고무밴드");
  if (resistanceBandGroup) {
    const bandData = [
      { color: "옐로우", resistance: "15", unit: "lbs", description: "15파운드 저항력 고무밴드" },
      { color: "레드", resistance: "20", unit: "lbs", description: "20파운드 저항력 고무밴드" },
      { color: "블루", resistance: "25", unit: "lbs", description: "25파운드 저항력 고무밴드" },
      { color: "그린", resistance: "30", unit: "lbs", description: "30파운드 저항력 고무밴드" },
      { color: "블랙", resistance: "35", unit: "lbs", description: "35파운드 저항력 고무밴드" },
    ];

    for (const band of bandData) {
      await prisma.equipment.create({
        data: {
          groupId: resistanceBandGroup,
          brandId: brandMap.get("Theraband") || null,
          primaryValue: band.resistance,
          primaryUnit: band.unit,
          secondaryValue: band.color,
          secondaryUnit: "color",
          description: band.description,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 고무밴드 생성 완료");
  }

  // 루프밴드 생성 (강도별)
  const loopBandGroup = groupMap.get("루프밴드");
  if (loopBandGroup) {
    const loopBandData = [
      { level: "라이트", value: "약", description: "하체용 루프밴드 - 약한 강도" },
      { level: "미디움", value: "중", description: "하체용 루프밴드 - 보통 강도" },
      { level: "헤비", value: "강", description: "하체용 루프밴드 - 강한 강도" },
    ];

    for (const band of loopBandData) {
      await prisma.equipment.create({
        data: {
          groupId: loopBandGroup,
          brandId: brandMap.get("SPRI") || null,
          primaryValue: band.value,
          primaryUnit: "강도",
          secondaryValue: band.level,
          secondaryUnit: "level",
          description: band.description,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 루프밴드 생성 완료");
  }

  // 폼롤러 생성
  const foamRollerGroup = groupMap.get("폼롤러");
  if (foamRollerGroup) {
    const foamRollerSizes = [60, 90];
    for (const size of foamRollerSizes) {
      await prisma.equipment.create({
        data: {
          groupId: foamRollerGroup,
          brandId: brandMap.get("Gaiam") || null,
          primaryValue: size.toString(),
          primaryUnit: "cm",
          description: `근막 이완용 폼롤러 ${size}cm`,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 폼롤러 생성 완료");
  }

  // 밸런스볼 생성
  const balanceBallGroup = groupMap.get("밸런스볼");
  if (balanceBallGroup) {
    const ballSizes = [55, 65, 75];
    for (const size of ballSizes) {
      await prisma.equipment.create({
        data: {
          groupId: balanceBallGroup,
          brandId: brandMap.get("Gaiam") || null,
          primaryValue: size.toString(),
          primaryUnit: "cm",
          description: `밸런스 트레이닝용 짐볼 ${size}cm`,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 밸런스볼 생성 완료");
  }

  // 메디신볼 생성
  const medicineBallGroup = groupMap.get("메디신볼");
  if (medicineBallGroup) {
    const medicineWeights = [3, 5, 8, 10];
    for (const weight of medicineWeights) {
      await prisma.equipment.create({
        data: {
          groupId: medicineBallGroup,
          brandId: brandMap.get("SPRI") || null,
          primaryValue: weight.toString(),
          primaryUnit: "kg",
          description: `코어 운동용 메디신볼 ${weight}kg`,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 메디신볼 생성 완료");
  }

  // 요가매트 생성
  const yogaMatGroup = groupMap.get("요가매트");
  if (yogaMatGroup) {
    const matThicknesses = [4, 6, 8];
    for (const thickness of matThicknesses) {
      await prisma.equipment.create({
        data: {
          groupId: yogaMatGroup,
          brandId: brandMap.get("Gaiam") || null,
          primaryValue: thickness.toString(),
          primaryUnit: "mm",
          description: `요가 및 스트레칭용 매트 ${thickness}mm`,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 요가매트 생성 완료");
  }

  // 줄넘기 생성
  const jumpRopeGroup = groupMap.get("줄넘기");
  if (jumpRopeGroup) {
    const ropeTypes = [
      { type: "기본형", description: "일반 줄넘기" },
      { type: "스피드", description: "스피드 줄넘기" },
      { type: "무선", description: "무선 줄넘기" },
    ];

    for (const rope of ropeTypes) {
      await prisma.equipment.create({
        data: {
          groupId: jumpRopeGroup,
          brandId: brandMap.get("Nike") || null,
          primaryValue: rope.type,
          primaryUnit: "type",
          description: rope.description,
          fitnessCenterId,
        },
      });
    }
    console.log("  ✅ 줄넘기 생성 완료");
  }

  // TRX 생성
  const trxGroup = groupMap.get("TRX");
  if (trxGroup) {
    await prisma.equipment.create({
      data: {
        groupId: trxGroup,
        brandId: brandMap.get("TRX") || null,
        primaryValue: "프로",
        primaryUnit: "model",
        description: "서스펜션 트레이닝 TRX 프로",
        fitnessCenterId,
      },
    });
    console.log("  ✅ TRX 생성 완료");
  }
};

async function createFreeExercises() {
  console.log("💪 프리 웨이트 운동 데이터 생성 중...");

  const freeExercises = [
    {
      title: "벤치프레스",
      description: "가슴 근육을 발달시키는 대표적인 웨이트 운동",
    },
    {
      title: "스쿼트",
      description: "하체 전체 근육을 단련하는 기본 운동",
    },
    {
      title: "데드리프트",
      description: "등과 하체를 동시에 단련하는 복합 운동",
    },
    {
      title: "오버헤드 프레스",
      description: "어깨와 팔 근육을 발달시키는 운동",
    },
    {
      title: "바벨 로우",
      description: "등 근육을 집중적으로 단련하는 운동",
    },
    {
      title: "바이셉 컬",
      description: "팔 앞쪽 근육(이두근)을 단련하는 운동",
    },
    {
      title: "트라이셉 익스텐션",
      description: "팔 뒤쪽 근육(삼두근)을 단련하는 운동",
    },
    {
      title: "런지",
      description: "하체 근력과 밸런스를 향상시키는 운동",
    },
    {
      title: "케틀벨 스윙",
      description: "전신 근력과 심폐지구력을 향상시키는 운동",
    },
    {
      title: "덤벨 플라이",
      description: "가슴 근육의 스트레칭과 수축을 극대화하는 운동",
    },
  ];

  for (const exercise of freeExercises) {
    const created = await prisma.freeExercise.create({
      data: exercise,
    });
    console.log(`  ✅ ${created.title} 운동 생성`);
  }

  console.log("✅ 프리 웨이트 운동 데이터 생성 완료");
}

async function createStretchingExercises() {
  console.log("🧘 스트레칭 운동 데이터 생성 중...");

  const stretchingExercises = [
    {
      title: "목 스트레칭",
      description: "목과 어깨 근육의 긴장을 완화하는 스트레칭",
    },
    {
      title: "어깨 스트레칭",
      description: "어깨 관절의 가동성을 향상시키는 스트레칭",
    },
    {
      title: "가슴 스트레칭",
      description: "가슴 근육을 이완시키고 자세를 개선하는 스트레칭",
    },
    {
      title: "허리 스트레칭",
      description: "허리 근육의 유연성을 향상시키는 스트레칭",
    },
    {
      title: "고관절 스트레칭",
      description: "고관절 주변 근육을 이완시키는 스트레칭",
    },
    {
      title: "햄스트링 스트레칭",
      description: "허벅지 뒤쪽 근육을 늘려주는 스트레칭",
    },
    {
      title: "종아리 스트레칭",
      description: "종아리 근육의 긴장을 완화하는 스트레칭",
    },
    {
      title: "전신 스트레칭",
      description: "전신의 근육을 차례대로 이완시키는 통합 스트레칭",
    },
    {
      title: "요가 자세",
      description: "요가 동작을 활용한 전신 스트레칭",
    },
    {
      title: "쿨다운 스트레칭",
      description: "운동 후 근육 회복을 돕는 마무리 스트레칭",
    },
  ];

  for (const exercise of stretchingExercises) {
    const created = await prisma.stretchingExercise.create({
      data: exercise,
    });
    console.log(`  ✅ ${created.title} 운동 생성`);
  }

  console.log("✅ 스트레칭 운동 데이터 생성 완료");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });