'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';
import { Calendar, Edit, Eye } from 'lucide-react';

interface ActionButtonsProps {
  ptId: string;
  ptRecordId: string;
  attendanceStatus: '예정' | '수업중' | '참석' | '불참';
  hasRecords: boolean;
}

export default function ActionButtons({ ptId, ptRecordId, attendanceStatus, hasRecords }: ActionButtonsProps) {

  const handleRecordClick = () => {
    if (attendanceStatus === '불참') {
      if (window.confirm('이미 수업시간이 지난 수업입니다. 그래도 기록하시겠습니까?')) {
        window.location.href = `/trainer/pt/${ptId}/${ptRecordId}/record`;
      }
    } else {
      window.location.href = `/trainer/pt/${ptId}/${ptRecordId}/record`;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 운동 기록이 있을 때는 항상 기록 확인 버튼 표시 */}
      {hasRecords && attendanceStatus !== "참석" && (
        <Link href={`/trainer/pt/${ptId}/${ptRecordId}/view`}>
          <Button variant="outline" className="w-full">
            <Eye className="w-4 h-4 mr-2" />
            기록 확인
          </Button>
        </Link>
      )}
      
      {/* 예정된 수업: 일정 변경 */}
      {attendanceStatus === "예정" && (
        <>
          <Link href={`/trainer/pt/${ptId}/${ptRecordId}/scheduleChange`}>
            <Button variant="primary" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              일정 변경
            </Button>
          </Link>
          <Button onClick={handleRecordClick} variant="outline" className="w-full">
            <Edit className="w-4 h-4 mr-2" />
            운동 기록하기
          </Button>
        </>
      )}

      {/* 수업중: 운동 기록하기 */}
      {attendanceStatus === "수업중" && (
        <>
          <Button onClick={handleRecordClick} variant="primary" className="w-full">
            <Edit className="w-4 h-4 mr-2" />
            운동 기록하기
          </Button>
          {!hasRecords && <div />} {/* 그리드 정렬을 위한 빈 요소 */}
        </>
      )}

      {/* 참석한 수업: 기록 조회 및 편집 */}
      {attendanceStatus === "참석" && (
        <>
          <Link href={`/trainer/pt/${ptId}/${ptRecordId}/view`}>
            <Button variant="primary" className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              기록 확인
            </Button>
          </Link>
          <Link href={`/trainer/pt/${ptId}/${ptRecordId}/edit`}>
            <Button variant="outline" className="w-full">
              <Edit className="w-4 h-4 mr-2" />
              기록 수정하기
            </Button>
          </Link>
        </>
      )}

      {/* 불참한 수업: 운동 기록 작성 (경고 포함) */}
      {attendanceStatus === "불참" && (
        <>
          <Button onClick={handleRecordClick} variant="primary" className="w-full">
            <Edit className="w-4 h-4 mr-2" />
            운동 기록하기
          </Button>
          {!hasRecords && <div />} {/* 그리드 정렬을 위한 빈 요소 */}
        </>
      )}
    </div>
  );
}