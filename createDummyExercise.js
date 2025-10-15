// createDummyExercise.js
// 운동 기구, 프리 운동, 스트레칭 운동 더미 데이터 생성 스크립트

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ========== 운동 기구 데이터 (Equipment) ==========
const equipmentData = [
  // 웨이트 기구 (kg 단위)
  { title: "덤벨", unit: "kg" },
  { title: "바벨", unit: "kg" },
  { title: "케틀벨", unit: "kg" },
  { title: "플레이트", unit: "kg" },
  { title: "EZ바", unit: "kg" },

  // 밴드/줄 (단위 없음)
  { title: "저항밴드", unit: "none" },
  { title: "TRX", unit: "none" },
  { title: "점프로프", unit: "none" },
  { title: "배틀로프", unit: "none" },

  // 매트/볼 (단위 없음)
  { title: "요가매트", unit: "none" },
  { title: "메디신볼", unit: "kg" },
  { title: "짐볼", unit: "none" },
  { title: "밸런스볼", unit: "none" },
  { title: "폼롤러", unit: "none" },

  // 벤치/랙 (단위 없음)
  { title: "플랫벤치", unit: "none" },
  { title: "인클라인벤치", unit: "none" },
  { title: "디클라인벤치", unit: "none" },
  { title: "스쿼트랙", unit: "none" },
  { title: "파워랙", unit: "none" },

  // 풀업/딥스 (단위 없음)
  { title: "풀업바", unit: "none" },
  { title: "딥스바", unit: "none" },
  { title: "어시스트밴드", unit: "none" },

  // 기타 장비
  { title: "AB휠", unit: "none" },
  { title: "슬램볼", unit: "kg" },
  { title: "샌드백", unit: "kg" },
  { title: "박스", unit: "cm" },
  { title: "스텝박스", unit: "none" },
  { title: "아령", unit: "kg" },
];

// ========== 프리 운동 데이터 (FreeExercise) ==========
const freeExerciseData = [
  // 가슴 운동
  {
    title: "벤치프레스",
    description: "가슴 전체를 발달시키는 기본 운동",
  },
  {
    title: "인클라인 벤치프레스",
    description: "상부 가슴을 집중적으로 발달시키는 운동",
  },
  {
    title: "디클라인 벤치프레스",
    description: "하부 가슴을 집중적으로 발달시키는 운동",
  },
  {
    title: "덤벨 플라이",
    description: "가슴의 스트레칭과 수축을 강조하는 운동",
  },
  {
    title: "푸쉬업",
    description: "체중을 이용한 가슴 운동",
  },

  // 등 운동
  {
    title: "데드리프트",
    description: "전신 근력을 강화하는 복합 운동",
  },
  {
    title: "바벨로우",
    description: "등 중앙부를 발달시키는 운동",
  },
  {
    title: "덤벨로우",
    description: "등의 두께를 증가시키는 운동",
  },
  {
    title: "풀업",
    description: "광배근을 발달시키는 자중 운동",
  },
  {
    title: "턱걸이",
    description: "상부 등과 팔을 발달시키는 운동",
  },
  {
    title: "시티드로우",
    description: "등 중앙부 두께를 증가시키는 운동",
  },

  // 어깨 운동
  {
    title: "밀리터리 프레스",
    description: "어깨 전체를 발달시키는 복합 운동",
  },
  {
    title: "덤벨 숄더프레스",
    description: "어깨 전면과 측면을 발달시키는 운동",
  },
  {
    title: "사이드 레터럴 레이즈",
    description: "측면 삼각근을 집중적으로 발달시키는 운동",
  },
  {
    title: "프론트 레이즈",
    description: "전면 삼각근을 발달시키는 운동",
  },
  {
    title: "리어 델트 플라이",
    description: "후면 삼각근을 발달시키는 운동",
  },

  // 팔 운동
  {
    title: "바벨 컬",
    description: "이두근 전체를 발달시키는 기본 운동",
  },
  {
    title: "덤벨 컬",
    description: "이두근의 피크를 발달시키는 운동",
  },
  {
    title: "해머 컬",
    description: "상완근과 전완근을 발달시키는 운동",
  },
  {
    title: "트라이셉스 익스텐션",
    description: "삼두근 전체를 발달시키는 운동",
  },
  {
    title: "딥스",
    description: "삼두근과 가슴을 발달시키는 복합 운동",
  },
  {
    title: "케이블 푸쉬다운",
    description: "삼두근 외측을 발달시키는 운동",
  },

  // 하체 운동
  {
    title: "스쿼트",
    description: "하체 전체를 발달시키는 기본 운동",
  },
  {
    title: "프론트 스쿼트",
    description: "대퇴사두근을 집중적으로 발달시키는 운동",
  },
  {
    title: "런지",
    description: "하체 밸런스와 근력을 향상시키는 운동",
  },
  {
    title: "레그프레스",
    description: "허벅지 전체를 안전하게 발달시키는 운동",
  },
  {
    title: "레그 컬",
    description: "햄스트링을 집중적으로 발달시키는 운동",
  },
  {
    title: "레그 익스텐션",
    description: "대퇴사두근을 고립시켜 발달시키는 운동",
  },
  {
    title: "카프 레이즈",
    description: "종아리 근육을 발달시키는 운동",
  },

  // 코어 운동
  {
    title: "플랭크",
    description: "코어 전체를 강화하는 정적 운동",
  },
  {
    title: "크런치",
    description: "복직근을 발달시키는 기본 운동",
  },
  {
    title: "레그레이즈",
    description: "하복부를 집중적으로 발달시키는 운동",
  },
  {
    title: "러시안 트위스트",
    description: "복사근을 발달시키는 회전 운동",
  },
  {
    title: "마운틴 클라이머",
    description: "코어와 심폐지구력을 향상시키는 운동",
  },

  // 전신/기능성 운동
  {
    title: "버피",
    description: "전신 근력과 심폐지구력을 향상시키는 운동",
  },
  {
    title: "케틀벨 스윙",
    description: "후면 사슬과 파워를 발달시키는 운동",
  },
  {
    title: "클린 앤 프레스",
    description: "전신 파워와 근력을 향상시키는 복합 운동",
  },
  {
    title: "스내치",
    description: "폭발적인 전신 파워를 발달시키는 운동",
  },
];

// ========== 스트레칭 운동 데이터 (StretchingExercise) ==========
const stretchingExerciseData = [
  // 상체 스트레칭
  {
    title: "목 스트레칭",
    description: "목 주변 근육을 이완하여 긴장을 완화하는 스트레칭",
  },
  {
    title: "어깨 스트레칭",
    description: "어깨 관절의 유연성을 향상시키는 스트레칭",
  },
  {
    title: "가슴 스트레칭",
    description: "가슴 근육을 펴서 자세를 개선하는 스트레칭",
  },
  {
    title: "등 스트레칭",
    description: "등 전체를 이완시키고 유연성을 향상시키는 스트레칭",
  },
  {
    title: "광배근 스트레칭",
    description: "광배근을 늘려 상체 유연성을 향상시키는 스트레칭",
  },
  {
    title: "팔 스트레칭",
    description: "팔 근육의 긴장을 풀어주는 스트레칭",
  },

  // 하체 스트레칭
  {
    title: "햄스트링 스트레칭",
    description: "허벅지 뒷면 근육을 늘려 유연성을 향상시키는 스트레칭",
  },
  {
    title: "대퇴사두근 스트레칭",
    description: "허벅지 앞면 근육을 이완시키는 스트레칭",
  },
  {
    title: "종아리 스트레칭",
    description: "종아리 근육의 긴장을 완화하는 스트레칭",
  },
  {
    title: "고관절 스트레칭",
    description: "고관절 가동범위를 향상시키는 스트레칭",
  },
  {
    title: "엉덩이 스트레칭",
    description: "둔근의 유연성을 향상시키는 스트레칭",
  },
  {
    title: "내전근 스트레칭",
    description: "허벅지 안쪽 근육을 늘리는 스트레칭",
  },

  // 전신 스트레칭
  {
    title: "고양이 자세",
    description: "척추 전체를 이완시키고 유연성을 향상시키는 요가 자세",
  },
  {
    title: "아동 자세",
    description: "등과 어깨를 이완시키는 휴식 자세",
  },
  {
    title: "코브라 자세",
    description: "복부와 가슴을 펴는 요가 자세",
  },
  {
    title: "다운독 자세",
    description: "전신을 늘리고 이완시키는 요가 자세",
  },
  {
    title: "전신 측면 스트레칭",
    description: "몸의 측면을 늘려 유연성을 향상시키는 스트레칭",
  },

  // 동적 스트레칭
  {
    title: "팔 돌리기",
    description: "어깨 관절을 풀어주는 동적 스트레칭",
  },
  {
    title: "레그 스윙",
    description: "다리 전체를 풀어주는 동적 스트레칭",
  },
  {
    title: "몸통 비틀기",
    description: "척추와 코어를 풀어주는 회전 스트레칭",
  },
  {
    title: "하이 니",
    description: "하체를 활성화하는 동적 스트레칭",
  },

  // 쿨다운 스트레칭
  {
    title: "전신 이완 스트레칭",
    description: "운동 후 전신을 이완시키는 통합 스트레칭",
  },
  {
    title: "호흡 스트레칭",
    description: "심호흡과 함께 몸 전체를 이완시키는 스트레칭",
  },
  {
    title: "좌전굴",
    description: "허리와 햄스트링을 이완시키는 정적 스트레칭",
  },
  {
    title: "나비 자세",
    description: "고관절과 내전근을 늘리는 스트레칭",
  },
];

async function main() {
  console.log("🏋️ 운동 더미 데이터 생성 시작...\n");

  // ========== FitnessCenter 조회 ==========
  console.log("🏢 피트니스 센터 조회 중...");
  const fitnessCenters = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
    },
  });

  if (fitnessCenters.length === 0) {
    console.log("  ⚠️  등록된 피트니스 센터가 없습니다.");
    console.log("  ℹ️  Equipment는 생성하지 않습니다.\n");
  } else {
    console.log(`  ✅ ${fitnessCenters.length}개 센터 발견\n`);
    fitnessCenters.forEach((center) => {
      console.log(`    - ${center.title} (${center.id})`);
    });
    console.log("");
  }

  // ========== Equipment 생성 (모든 센터에) ==========
  if (fitnessCenters.length > 0) {
    console.log("📦 운동 기구(Equipment) 생성 중...");
    let createdEquipmentCount = 0;
    let skippedEquipmentCount = 0;

    for (const center of fitnessCenters) {
      console.log(`\n  🏢 ${center.title} - 장비 생성 중...`);

      for (const equipment of equipmentData) {
        try {
          await prisma.equipment.create({
            data: {
              title: equipment.title,
              unit: equipment.unit,
              fitnessCenterId: center.id,
            },
          });
          createdEquipmentCount++;
          console.log(`    ✅ ${equipment.title} (${equipment.unit})`);
        } catch (error) {
          // 이미 존재하는 경우 스킵 (title + unit + fitnessCenterId 중복)
          if (error.code === "P2002") {
            skippedEquipmentCount++;
            console.log(`    ⏭️  ${equipment.title} - 이미 존재함`);
          } else {
            console.error(
              `    ❌ ${equipment.title} 생성 실패:`,
              error.message
            );
          }
        }
      }
    }
    console.log(
      `\n📦 Equipment: ${createdEquipmentCount}개 생성, ${skippedEquipmentCount}개 스킵\n`
    );
  }

  // ========== FreeExercise 생성 ==========
  console.log("💪 프리 운동(FreeExercise) 생성 중...");
  let createdFreeExerciseCount = 0;

  for (const exercise of freeExerciseData) {
    try {
      await prisma.freeExercise.create({
        data: {
          title: exercise.title,
          description: exercise.description,
        },
      });
      createdFreeExerciseCount++;
      console.log(`  ✅ ${exercise.title}`);
    } catch (error) {
      console.error(`  ❌ ${exercise.title} 생성 실패:`, error.message);
    }
  }
  console.log(`\n💪 FreeExercise: ${createdFreeExerciseCount}개 생성\n`);

  // ========== StretchingExercise 생성 ==========
  console.log("🧘 스트레칭 운동(StretchingExercise) 생성 중...");
  let createdStretchingExerciseCount = 0;

  for (const exercise of stretchingExerciseData) {
    try {
      await prisma.stretchingExercise.create({
        data: {
          title: exercise.title,
          description: exercise.description,
        },
      });
      createdStretchingExerciseCount++;
      console.log(`  ✅ ${exercise.title}`);
    } catch (error) {
      console.error(`  ❌ ${exercise.title} 생성 실패:`, error.message);
    }
  }
  console.log(
    `\n🧘 StretchingExercise: ${createdStretchingExerciseCount}개 생성\n`
  );

  // ========== 완료 ==========
  console.log("✨ 더미 데이터 생성 완료!\n");
  console.log("📊 요약:");
  console.log(`  - Equipment: ${createdEquipmentCount}개`);
  console.log(`  - FreeExercise: ${createdFreeExerciseCount}개`);
  console.log(`  - StretchingExercise: ${createdStretchingExerciseCount}개`);
  console.log(
    `  - 총: ${
      createdEquipmentCount +
      createdFreeExerciseCount +
      createdStretchingExerciseCount
    }개\n`
  );
}

main()
  .catch((e) => {
    console.error("❌ 에러 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
