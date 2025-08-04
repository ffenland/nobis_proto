/**
 * 에러 발생 상황을 설명하는 한글 컨텍스트 상수
 * Sentry 에러 리포팅 시 description 필드에 사용
 */

export const ErrorContexts = {
  // ===== PT 관련 =====
  // 회원 PT 액션
  PT_SCHEDULE_CREATE: "회원이 새로운 PT 신청 중 스케줄 등록에서 오류 발생",
  PT_SCHEDULE_CHANGE_REQUEST: "회원이 PT 일정 변경을 요청하는 중 오류 발생",
  PT_SCHEDULE_CHANGE_APPROVE: "회원이 PT 일정 변경을 승인하는 중 오류 발생",
  PT_CANCEL: "회원이 PT를 취소하는 중 오류 발생",
  PT_LIST_FETCH: "회원이 PT 목록을 조회하는 중 오류 발생",
  
  // 트레이너 PT 관리
  PT_RECORD_CREATE: "트레이너가 PT 기록을 생성하는 중 오류 발생",
  PT_RECORD_UPDATE: "트레이너가 PT 기록을 수정하는 중 오류 발생",
  PT_RECORD_DELETE: "트레이너가 PT 기록을 삭제하는 중 오류 발생",
  PT_RECORD_ITEM_CREATE: "트레이너가 PT 운동 항목을 추가하는 중 오류 발생",
  PT_RECORD_ITEM_UPDATE: "트레이너가 PT 운동 항목을 수정하는 중 오류 발생",
  PT_RECORD_ITEM_DELETE: "트레이너가 PT 운동 항목을 삭제하는 중 오류 발생",
  PT_RECORD_LIST_FETCH: "트레이너가 PT 기록 목록을 조회하는 중 오류 발생",
  PT_ATTENDANCE_UPDATE: "트레이너가 PT 출석 상태를 변경하는 중 오류 발생",
  
  // ===== 머신/장비 관리 =====
  MACHINE_CREATE: "매니저가 새 머신을 등록하는 중 오류 발생",
  MACHINE_UPDATE: "매니저가 머신 정보를 수정하는 중 오류 발생",
  MACHINE_DELETE: "매니저가 머신을 삭제하는 중 오류 발생",
  MACHINE_IMAGE_UPLOAD: "매니저가 머신 이미지를 업로드하는 중 오류 발생",
  MACHINE_IMAGE_DELETE: "매니저가 머신 이미지를 삭제하는 중 오류 발생",
  MACHINE_LIST_FETCH: "머신 목록을 조회하는 중 오류 발생",
  
  // ===== 프로필 관리 =====
  PROFILE_UPDATE: "사용자가 프로필 정보를 수정하는 중 오류 발생",
  PROFILE_IMAGE_UPLOAD: "사용자가 프로필 이미지를 업로드하는 중 오류 발생",
  PROFILE_IMAGE_DELETE: "사용자가 프로필 이미지를 삭제하는 중 오류 발생",
  PROFILE_FETCH: "프로필 정보를 조회하는 중 오류 발생",
  
  // ===== 회원가입/인증 =====
  SIGNUP_PROCESS: "회원가입 처리 중 오류 발생",
  LOGIN_PROCESS: "로그인 처리 중 오류 발생",
  LOGOUT_PROCESS: "로그아웃 처리 중 오류 발생",
  SOCIAL_LOGIN_KAKAO: "카카오 로그인 처리 중 오류 발생",
  SOCIAL_LOGIN_NAVER: "네이버 로그인 처리 중 오류 발생",
  PASSWORD_RESET: "비밀번호 재설정 중 오류 발생",
  
  // ===== 결제/구매 =====
  PAYMENT_PROCESS: "결제 처리 중 오류 발생",
  PAYMENT_CANCEL: "결제 취소 처리 중 오류 발생",
  PAYMENT_REFUND: "환불 처리 중 오류 발생",
  PAYMENT_VERIFY: "결제 검증 중 오류 발생",
  PURCHASE_PT: "PT 상품 구매 중 오류 발생",
  PURCHASE_MEMBERSHIP: "회원권 구매 중 오류 발생",
  
  // ===== 스케줄 관리 =====
  SCHEDULE_CREATE: "스케줄 생성 중 오류 발생",
  SCHEDULE_UPDATE: "스케줄 수정 중 오류 발생",
  SCHEDULE_DELETE: "스케줄 삭제 중 오류 발생",
  SCHEDULE_FETCH: "스케줄 조회 중 오류 발생",
  SCHEDULE_CONFLICT_CHECK: "스케줄 충돌 확인 중 오류 발생",
  
  // ===== 채팅 =====
  CHAT_SEND_MESSAGE: "채팅 메시지 전송 중 오류 발생",
  CHAT_LOAD_MESSAGES: "채팅 메시지 불러오기 중 오류 발생",
  CHAT_ROOM_CREATE: "채팅방 생성 중 오류 발생",
  CHAT_ROOM_LEAVE: "채팅방 나가기 중 오류 발생",
  
  // ===== 센터 관리 =====
  CENTER_CREATE: "센터 생성 중 오류 발생",
  CENTER_UPDATE: "센터 정보 수정 중 오류 발생",
  CENTER_DELETE: "센터 삭제 중 오류 발생",
  CENTER_TRAINER_ADD: "센터에 트레이너 추가 중 오류 발생",
  CENTER_TRAINER_REMOVE: "센터에서 트레이너 제거 중 오류 발생",
  
  // ===== 상품 관리 =====
  PRODUCT_CREATE: "상품 생성 중 오류 발생",
  PRODUCT_UPDATE: "상품 정보 수정 중 오류 발생",
  PRODUCT_DELETE: "상품 삭제 중 오류 발생",
  PRODUCT_ACTIVATE: "상품 활성화 중 오류 발생",
  PRODUCT_DEACTIVATE: "상품 비활성화 중 오류 발생",
  
  // ===== 쿠폰 관리 =====
  COUPON_CREATE: "쿠폰 생성 중 오류 발생",
  COUPON_USE: "쿠폰 사용 중 오류 발생",
  COUPON_VALIDATE: "쿠폰 유효성 검증 중 오류 발생",
  COUPON_LIST_FETCH: "쿠폰 목록 조회 중 오류 발생",
  
  // ===== 미디어 관리 =====
  MEDIA_UPLOAD: "미디어 파일 업로드 중 오류 발생",
  MEDIA_DELETE: "미디어 파일 삭제 중 오류 발생",
  MEDIA_FETCH: "미디어 파일 조회 중 오류 발생",
  MEDIA_VALIDATE: "미디어 파일 검증 중 오류 발생",
  
  // ===== 권한/보안 =====
  PERMISSION_DENIED: "권한이 없는 작업 시도로 오류 발생",
  SESSION_EXPIRED: "세션 만료로 인한 오류 발생",
  UNAUTHORIZED_ACCESS: "인증되지 않은 접근 시도로 오류 발생",
  INVALID_REQUEST: "잘못된 요청으로 인한 오류 발생",
  
  // ===== 기타 =====
  DATA_FETCH: "데이터 조회 중 오류 발생",
  DATA_SAVE: "데이터 저장 중 오류 발생",
  DATA_UPDATE: "데이터 수정 중 오류 발생",
  DATA_DELETE: "데이터 삭제 중 오류 발생",
  UNKNOWN_ERROR: "알 수 없는 오류 발생",
} as const;

// 타입 정의
export type ErrorContextKey = keyof typeof ErrorContexts;
export type ErrorContextValue = typeof ErrorContexts[ErrorContextKey];