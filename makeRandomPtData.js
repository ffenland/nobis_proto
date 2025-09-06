import { PrismaClient, PtState, RecordType } from "@prisma/client";
const prisma = new PrismaClient();

// 날짜 생성 헬퍼
function getDateDaysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// KST 날짜/시간 생성 (Prisma가 UTC로 변환하여 저장)
function createScheduledAt(daysFromNow, hour, minute) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function makeRandomPtData() {
  try {
    console.log("🎯 PT 테스트 데이터 생성 시작...\n");

    // 1. 유천점 피트니스 센터 조회 또는 생성
    console.log("1️⃣ 유천점 피트니스 센터 설정 중...");
    let fitnessCenter = await prisma.fitnessCenter.findFirst({
      where: { title: "유천점" },
    });

    if (!fitnessCenter) {
      fitnessCenter = await prisma.fitnessCenter.create({
        data: {
          title: "유천점",
          description: "유천점 피트니스 센터",
          inOperation: true,
        },
      });
      console.log("✅ 유천점 피트니스 센터 생성 완료");
    } else {
      console.log("✅ 기존 유천점 피트니스 센터 사용");
    }

    // 2. 트레이너 2명 조회 및 유천점 연결
    console.log("\n2️⃣ 트레이너 설정 중...");
    
    // 이서연 트레이너
    const trainer1User = await prisma.user.findFirst({
      where: { username: "이서연" },
    });
    
    if (!trainer1User) {
      console.error("❌ 이서연 트레이너가 없습니다. seed.ts를 먼저 실행해주세요.");
      return;
    }
    
    const trainer1 = await prisma.trainer.findUnique({
      where: { userId: trainer1User.id },
      include: { user: true },
    });
    
    // 유천점으로 소속 변경
    await prisma.trainer.update({
      where: { id: trainer1.id },
      data: { fitnessCenterId: fitnessCenter.id },
    });
    
    // 김태호 트레이너
    const trainer2User = await prisma.user.findFirst({
      where: { username: "김태호" },
    });
    
    if (!trainer2User) {
      console.error("❌ 김태호 트레이너가 없습니다. seed.ts를 먼저 실행해주세요.");
      return;
    }
    
    const trainer2 = await prisma.trainer.findUnique({
      where: { userId: trainer2User.id },
      include: { user: true },
    });
    
    // 유천점으로 소속 변경
    await prisma.trainer.update({
      where: { id: trainer2.id },
      data: { fitnessCenterId: fitnessCenter.id },
    });
    
    console.log(`✅ 트레이너 2명 유천점 연결 완료: ${trainer1.user.username}, ${trainer2.user.username}`);

    // 3. PtProduct 2개 생성
    console.log("\n3️⃣ PT 상품 생성 중...");
    
    // 기존 상품 삭제 (중복 방지)
    await prisma.ptProduct.deleteMany({
      where: {
        title: { in: ["테스트_전문가용", "테스트_초보용"] },
      },
    });
    
    const product1 = await prisma.ptProduct.create({
      data: {
        title: "테스트_전문가용",
        price: 2000000,
        description: "전문가를 위한 고강도 PT 프로그램",
        totalCount: 20,
        time: 60,
        onSale: true,
        trainer: { connect: { id: trainer1.id } },
      },
    });
    
    const product2 = await prisma.ptProduct.create({
      data: {
        title: "테스트_초보용",
        price: 1500000,
        description: "초보자를 위한 기초 PT 프로그램",
        totalCount: 20,
        time: 60,
        onSale: true,
        trainer: { connect: { id: trainer1.id } },
      },
    });
    
    // 김태호 트레이너도 두 상품에 연결
    await prisma.ptProduct.update({
      where: { id: product1.id },
      data: {
        trainer: { connect: { id: trainer2.id } },
      },
    });
    
    await prisma.ptProduct.update({
      where: { id: product2.id },
      data: {
        trainer: { connect: { id: trainer2.id } },
      },
    });
    
    console.log("✅ PT 상품 2개 생성 완료: 테스트_전문가용, 테스트_초보용");

    // 4. 회원 4명 조회 또는 생성
    console.log("\n4️⃣ 회원 설정 중...");
    const memberNames = ["회원A", "회원B", "회원C", "회원D"];
    const members = [];
    
    for (const username of memberNames) {
      let user = await prisma.user.findFirst({
        where: { username },
      });
      
      if (!user) {
        // 회원이 없으면 생성
        user = await prisma.user.create({
          data: {
            username,
            email: `${username}@test.com`,
            emailVerified: true,
            role: "MEMBER",
          },
        });
        
        await prisma.member.create({
          data: {
            userId: user.id,
            active: true,
          },
        });
        
        console.log(`✅ ${username} 생성 완료`);
      }
      
      const member = await prisma.member.findUnique({
        where: { userId: user.id },
        include: { user: true },
      });
      
      members.push(member);
    }
    
    console.log(`✅ 회원 4명 준비 완료: ${memberNames.join(", ")}`);

    // 5. PT 등록 생성
    console.log("\n5️⃣ PT 등록 생성 중...");
    const pts = [];
    
    // 이서연 트레이너 - 회원A (전문가용)
    const pt1 = await prisma.pt.create({
      data: {
        ptProduct: { connect: { id: product1.id } },
        member: { connect: { id: members[0].id } }, // 회원A
        trainer: { connect: { id: trainer1.id } },
        state: PtState.CONFIRMED,
        paymentAmount: product1.price,
        startDate: getDateDaysFromNow(-30),
        description: `${members[0].user.username}님의 전문가 PT`,
      },
    });
    pts.push({ pt: pt1, trainer: trainer1, member: members[0] });
    
    // 이서연 트레이너 - 회원B (초보용)
    const pt2 = await prisma.pt.create({
      data: {
        ptProduct: { connect: { id: product2.id } },
        member: { connect: { id: members[1].id } }, // 회원B
        trainer: { connect: { id: trainer1.id } },
        state: PtState.CONFIRMED,
        paymentAmount: product2.price,
        startDate: getDateDaysFromNow(-25),
        description: `${members[1].user.username}님의 초보 PT`,
      },
    });
    pts.push({ pt: pt2, trainer: trainer1, member: members[1] });
    
    // 김태호 트레이너 - 회원C (전문가용)
    const pt3 = await prisma.pt.create({
      data: {
        ptProduct: { connect: { id: product1.id } },
        member: { connect: { id: members[2].id } }, // 회원C
        trainer: { connect: { id: trainer2.id } },
        state: PtState.CONFIRMED,
        paymentAmount: product1.price,
        startDate: getDateDaysFromNow(-20),
        description: `${members[2].user.username}님의 전문가 PT`,
      },
    });
    pts.push({ pt: pt3, trainer: trainer2, member: members[2] });
    
    // 김태호 트레이너 - 회원D (초보용)
    const pt4 = await prisma.pt.create({
      data: {
        ptProduct: { connect: { id: product2.id } },
        member: { connect: { id: members[3].id } }, // 회원D
        trainer: { connect: { id: trainer2.id } },
        state: PtState.CONFIRMED,
        paymentAmount: product2.price,
        startDate: getDateDaysFromNow(-15),
        description: `${members[3].user.username}님의 초보 PT`,
      },
    });
    pts.push({ pt: pt4, trainer: trainer2, member: members[3] });
    
    console.log("✅ PT 등록 4개 생성 완료");

    // 6. 레슨 생성 (과거 레슨 2개씩만)
    console.log("\n6️⃣ 레슨 생성 중...");
    let totalLessons = 0;
    let totalRecords = 0;
    
    for (const ptData of pts) {
      const { pt, trainer, member } = ptData;
      
      // 각 PT당 과거 레슨 2개만 생성
      const lessonDates = [
        { daysAgo: -7, hour: 10, minute: 0 },  // 7일 전 10:00
        { daysAgo: -3, hour: 14, minute: 30 }, // 3일 전 14:30
      ];
      
      for (let i = 0; i < lessonDates.length; i++) {
        const schedule = lessonDates[i];
        
        // Lesson 생성 (새로운 스키마 구조)
        const lesson = await prisma.lesson.create({
          data: {
            pt: { connect: { id: pt.id } },
            fitnessCenter: { connect: { id: fitnessCenter.id } },
            scheduledAt: createScheduledAt(
              schedule.daysAgo,
              schedule.hour,
              schedule.minute
            ),
            duration: 60, // 60분 수업
            memo: `${member.user.username}님의 ${i + 1}번째 완료된 레슨`,
          },
        });
        
        totalLessons++;
        
        // 레슨 기록 생성
        const machines = await prisma.machine.findMany({ take: 2 });
        const freeExercises = await prisma.freeExercise.findMany({ take: 2 });
        
        // 첫 번째 레슨: 머신 1개
        if (i === 0 && machines.length > 0) {
          const lessonRecord = await prisma.lessonRecord.create({
            data: {
              lesson: { connect: { id: lesson.id } },
              entry: 1,
              type: RecordType.MACHINE,
              title: machines[0].title,
              description: `${member.user.username}님의 머신 운동`,
            },
          });
          
          // 머신 세트 기록
          const machineSettings = await prisma.machineSetting.findMany({
            where: { machineId: machines[0].id },
            include: { values: true },
          });
          
          for (let set = 1; set <= 3; set++) {
            const settingValues = [];
            for (const setting of machineSettings) {
              if (setting.values.length > 0) {
                settingValues.push(setting.values[0].id);
              }
            }
            
            if (settingValues.length > 0) {
              await prisma.machineSetRecord.create({
                data: {
                  lessonRecord: { connect: { id: lessonRecord.id } },
                  set,
                  reps: 12 - (set - 1) * 2, // 12, 10, 8
                  settingValues: {
                    connect: settingValues.map((id) => ({ id })),
                  },
                },
              });
            }
          }
          totalRecords++;
        }
        
        // 두 번째 레슨: 프리 웨이트 1개
        if (i === 1 && freeExercises.length > 0) {
          const lessonRecord = await prisma.lessonRecord.create({
            data: {
              lesson: { connect: { id: lesson.id } },
              entry: 1,
              type: RecordType.FREE,
              title: freeExercises[0].title,
              description: `${member.user.username}님의 프리 웨이트 운동`,
            },
          });
          
          // 프리 웨이트 세트 기록
          const equipments = await prisma.equipment.findMany({
            where: { category: "WEIGHT" },
            take: 1,
          });
          
          for (let set = 1; set <= 3; set++) {
            await prisma.freeSetRecord.create({
              data: {
                lessonRecord: { connect: { id: lessonRecord.id } },
                freeExercise: { connect: { id: freeExercises[0].id } },
                set,
                reps: 15 - (set - 1) * 3, // 15, 12, 9
                equipments:
                  equipments.length > 0
                    ? { connect: [{ id: equipments[0].id }] }
                    : undefined,
              },
            });
          }
          totalRecords++;
        }
      }
    }
    
    console.log(`✅ 레슨 ${totalLessons}개, 운동 기록 ${totalRecords}개 생성 완료\n`);

    // 7. 생성된 데이터 요약
    console.log("📊 생성된 데이터 요약:");
    console.log("─".repeat(50));
    console.log(`• 피트니스 센터: ${fitnessCenter.title}`);
    console.log(`• 트레이너: ${trainer1.user.username}, ${trainer2.user.username}`);
    console.log(`• 회원: ${memberNames.join(", ")}`);
    console.log(`• PT 상품: 테스트_전문가용, 테스트_초보용`);
    console.log(`• PT 등록: 4개`);
    console.log("  - 이서연 + 회원A (전문가용)");
    console.log("  - 이서연 + 회원B (초보용)");
    console.log("  - 김태호 + 회원C (전문가용)");
    console.log("  - 김태호 + 회원D (초보용)");
    console.log(`• 레슨: ${totalLessons}개 (각 PT당 과거 레슨 2개)`);
    console.log(`• 운동 기록: ${totalRecords}개`);
    console.log("─".repeat(50));
    
    console.log("\n✨ 테스트 데이터 생성 완료!");
  } catch (error) {
    console.error("❌ 데이터 생성 중 오류 발생:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
makeRandomPtData()
  .then(() => {
    console.log("\n👋 프로세스 종료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });