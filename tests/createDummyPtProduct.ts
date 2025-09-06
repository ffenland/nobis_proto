import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const dummyData = [
  {
    title: "기본 10회권 A",
    totalCount: 10,
    price: 450000,
    incentivePercent: 10,
    time: 60,
    description:
      "10회의 PT 수업이 1회 60분씩, 진행되며 40일 안에 사용해야합니다.",
    expiration_period: 40,
    onSale: true,
  },
  {
    title: "기본 10회권 B",
    totalCount: 10,
    price: 450000,
    incentivePercent: 20,
    time: 60,
    description:
      "10회의 PT 수업이 1회 60분씩, 진행되며 40일 안에 사용해야합니다.",
    expiration_period: 40,
    onSale: true,
  },
  {
    title: "기본 30회권 A",
    totalCount: 30,
    price: 1200000,
    incentivePercent: 10,
    time: 60,
    description:
      "30회의 PT 수업이 1회 60분씩, 진행되며 130일 안에 사용해야합니다.",
    expiration_period: 130,
    onSale: true,
  },
  {
    title: "기본 30회권 B",
    totalCount: 30,
    price: 1200000,
    incentivePercent: 20,
    time: 60,
    description:
      "30회의 PT 수업이 1회 60분씩, 진행되며 130일 안에 사용해야합니다.",
    expiration_period: 130,
    onSale: true,
  },
];

async function createDummyPtProducts() {
  try {
    console.log('🚀 더미 PtProduct 생성 시작...');

    // 모든 트레이너 조회
    const allTrainers = await prisma.trainer.findMany({
      select: {
        id: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    if (allTrainers.length === 0) {
      console.error('❌ 트레이너가 존재하지 않습니다. 먼저 트레이너를 생성해주세요.');
      return;
    }

    console.log(`📝 발견된 트레이너: ${allTrainers.length}명`);
    allTrainers.forEach((trainer, index) => {
      console.log(`  ${index + 1}. ${trainer.user.username} (ID: ${trainer.id})`);
    });

    // 각 더미 데이터로 PtProduct 생성
    for (let i = 0; i < dummyData.length; i++) {
      const data = dummyData[i];
      
      console.log(`\n📦 "${data.title}" 생성 중...`);
      
      const ptProduct = await prisma.ptProduct.create({
        data: {
          title: data.title,
          totalCount: data.totalCount,
          price: data.price,
          incentivePercent: data.incentivePercent,
          time: data.time,
          description: data.description,
          expiration_period: data.expiration_period,
          onSale: data.onSale,
          // 모든 트레이너 연결
          trainer: {
            connect: allTrainers.map(trainer => ({ id: trainer.id })),
          },
        },
        include: {
          trainer: {
            select: {
              id: true,
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      });

      console.log(`✅ "${ptProduct.title}" 생성 완료 (ID: ${ptProduct.id})`);
      console.log(`   - 연결된 트레이너: ${ptProduct.trainer.length}명`);
    }

    console.log('\n🎉 모든 더미 PtProduct 생성 완료!');
    console.log(`📊 총 ${dummyData.length}개 제품이 ${allTrainers.length}명의 트레이너에 연결됨`);

  } catch (error) {
    console.error('❌ 더미 PtProduct 생성 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  createDummyPtProducts();
}

export default createDummyPtProducts;