// prisma/seed.ts
import { PrismaClient, UserRole } from "@prisma/client";

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
    // User 11명 생성 (Member 10명, Manager 1명)
    await createUsers();

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

  // Member 10명 생성 데이터
  const memberData = [
    {
      username: "심심한 풋사과",
      mobile: "01012340001",
      email: "member1@test.com",
    },
    {
      username: "날쌘 거북이",
      mobile: "01012340002",
      email: "member2@test.com",
    },
    {
      username: "아름다운 운동화",
      mobile: "01012340003",
      email: "member3@test.com",
    },
    {
      username: "용감한 고양이",
      mobile: "01012340004",
      email: "member4@test.com",
    },
    {
      username: "행복한 도토리",
      mobile: "01012340005",
      email: "member5@test.com",
    },
    {
      username: "멋진 햄스터",
      mobile: "01012340006",
      email: "member6@test.com",
    },
    { username: "빠른 토끼", mobile: "01012340007", email: "member7@test.com" },
    {
      username: "조용한 호랑이",
      mobile: "01012340008",
      email: "member8@test.com",
    },
    {
      username: "신나는 펭귄",
      mobile: "01012340009",
      email: "member9@test.com",
    },
    {
      username: "귀여운 판다",
      mobile: "01012340010",
      email: "member10@test.com",
    },
  ];

  // Manager 1명 생성 데이터
  const managerData = {
    username: "관리자",
    mobile: "01099999999",
    email: "manager@test.com",
  };

  // Member 10명 생성
  for (let i = 0; i < memberData.length; i++) {
    const userData = memberData[i];
    const isNaverUser = i % 2 === 0; // 짝수 인덱스는 naver, 홀수는 kakao

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
          create: {},
        },
      },
    });

    console.log(`  ✅ Member 생성: ${user.username} (${user.email})`);
  }

  // Manager 1명 생성
  const managerUser = await prisma.user.create({
    data: {
      username: managerData.username,
      email: managerData.email,
      mobile: managerData.mobile,
      role: UserRole.MANAGER,
      naverId: getUniqueNaverId(),
      userData: {
        create: {},
      },
      managerProfile: {
        create: {},
      },
    },
  });

  console.log(
    `  ✅ Manager 생성: ${managerUser.username} (${managerUser.email})`
  );
  console.log("✅ 사용자 데이터 생성 완료");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
