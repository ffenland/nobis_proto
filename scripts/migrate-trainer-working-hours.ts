// scripts/migrate-trainer-working-hours.ts
// 기존 TrainerOff의 weekDay 데이터를 TrainerWorkingHour로 마이그레이션하는 스크립트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateTrainerWorkingHours() {
  console.log('🚀 Starting migration: TrainerOff weekDay → TrainerWorkingHour');

  try {
    // 1. 기존 weekDay가 있는 TrainerOff 데이터 조회
    const weeklyOffSchedules = await prisma.trainerOff.findMany({
      where: {
        weekDay: {
          not: null
        }
      },
      include: {
        trainer: {
          select: {
            id: true,
            user: {
              select: {
                username: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Found ${weeklyOffSchedules.length} weekly off schedules to migrate`);

    if (weeklyOffSchedules.length === 0) {
      console.log('✅ No weekly off schedules found. Migration complete.');
      return;
    }

    // 2. TrainerWorkingHour 데이터 생성
    // 주의: 기존 weekDay 오프 데이터는 "쉬는 시간"이므로, 
    // 이를 "근무 시간"으로 변환하는 로직이 필요합니다.
    // 여기서는 일단 기본 근무시간(9-18시)을 설정하고 오프 시간을 제외하는 방식으로 처리

    const migrationData: Array<{
      trainerId: string;
      dayOfWeek: string;
      startTime: number;
      endTime: number;
    }> = [];

    for (const offSchedule of weeklyOffSchedules) {
      console.log(`📝 Processing trainer: ${offSchedule.trainer.user.username} - ${offSchedule.weekDay} ${offSchedule.startTime}:00-${offSchedule.endTime}:00`);
      
      // 기본 근무시간 (9-18시)에서 오프 시간을 제외한 근무시간 계산
      const defaultStartTime = 9;
      const defaultEndTime = 18;
      
      // 오프 시간이 기본 근무시간과 겹치는 경우 분할
      if (offSchedule.startTime > defaultStartTime) {
        // 오프 시간 전에 근무 시간이 있음
        migrationData.push({
          trainerId: offSchedule.trainerId,
          dayOfWeek: offSchedule.weekDay!,
          startTime: defaultStartTime,
          endTime: offSchedule.startTime
        });
      }
      
      if (offSchedule.endTime < defaultEndTime) {
        // 오프 시간 후에 근무 시간이 있음
        migrationData.push({
          trainerId: offSchedule.trainerId,
          dayOfWeek: offSchedule.weekDay!,
          startTime: offSchedule.endTime,
          endTime: defaultEndTime
        });
      }
      
      // 만약 오프 시간이 기본 근무시간을 완전히 포함하면 해당 요일은 근무하지 않음 (레코드 생성 안함)
    }

    console.log(`📈 Generated ${migrationData.length} working hour records`);

    // 3. 중복 제거 및 TrainerWorkingHour 테이블에 삽입
    const uniqueWorkingHours = migrationData.filter((item, index, self) =>
      index === self.findIndex((t) => (
        t.trainerId === item.trainerId && 
        t.dayOfWeek === item.dayOfWeek && 
        t.startTime === item.startTime && 
        t.endTime === item.endTime
      ))
    );

    console.log(`🔄 Inserting ${uniqueWorkingHours.length} unique working hour records...`);

    // 트랜잭션으로 안전하게 삽입
    await prisma.$transaction(async (tx) => {
      for (const workingHour of uniqueWorkingHours) {
        try {
          await tx.trainerWorkingHour.create({
            data: {
              trainerId: workingHour.trainerId,
              dayOfWeek: workingHour.dayOfWeek as any,
              startTime: workingHour.startTime,
              endTime: workingHour.endTime
            }
          });
          console.log(`✅ Created working hour: ${workingHour.trainerId} - ${workingHour.dayOfWeek} ${workingHour.startTime}:00-${workingHour.endTime}:00`);
        } catch (error) {
          console.log(`⚠️ Skipped duplicate: ${workingHour.trainerId} - ${workingHour.dayOfWeek} ${workingHour.startTime}:00-${workingHour.endTime}:00`);
        }
      }
    });

    console.log('✅ Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Processed: ${weeklyOffSchedules.length} weekly off schedules`);
    console.log(`   - Created: ${uniqueWorkingHours.length} working hour records`);
    console.log(`   - ⚠️ Note: Weekly off schedules are still in TrainerOff table`);
    console.log(`   - ⚠️ Run the next migration to remove weekDay field`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// 롤백 함수 (필요시 사용)
async function rollbackMigration() {
  console.log('🔄 Rolling back migration: Deleting all TrainerWorkingHour records');
  
  try {
    const result = await prisma.trainerWorkingHour.deleteMany({});
    console.log(`✅ Deleted ${result.count} TrainerWorkingHour records`);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// 스크립트 실행
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--rollback')) {
    await rollbackMigration();
  } else {
    await migrateTrainerWorkingHours();
  }
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { migrateTrainerWorkingHours, rollbackMigration };