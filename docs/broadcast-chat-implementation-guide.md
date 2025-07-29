# Supabase Broadcast 기반 실시간 채팅 시스템 구현 가이드

## 개요

이 문서는 Supabase의 Broadcast 기능을 활용한 실시간 채팅 시스템의 구현 방법과 주의사항을 설명합니다.

## 시스템 아키텍처

### 1. 데이터베이스 구조

```
ChatRoom (1:1 채팅방)
├── Message (메시지)
└── MessageRead (읽음 상태)
```

### 2. 실시간 통신 방식

- **Postgres Changes** 대신 **Broadcast** 방식 사용
- 데이터베이스 트리거가 자동으로 브로드캐스트 이벤트 발생
- Private 채널을 통한 보안 강화

## 구현 단계

### 1. 데이터베이스 설정

1. **SQL 스크립트 실행**
   ```sql
   -- supabase-chat-broadcast-setup.sql 파일을 
   -- Supabase Dashboard > SQL Editor에서 실행
   ```

2. **설정 확인**
   - RLS 정책이 올바르게 적용되었는지 확인
   - 트리거가 생성되었는지 확인
   - 인덱스가 생성되었는지 확인

### 2. 클라이언트 구현

#### 메시지 구독 예시

```typescript
import { subscribeToMessages } from '@/app/lib/supabase-chat';

// 채팅방 컴포넌트에서
useEffect(() => {
  const subscription = subscribeToMessages(
    roomId,
    userId,
    (newMessage) => {
      // 새 메시지 처리
      setMessages(prev => [...prev, newMessage]);
    }
  );

  return () => subscription.unsubscribe();
}, [roomId, userId]);
```

#### 읽음 상태 구독 예시

```typescript
import { subscribeToReadStatus } from '@/app/lib/supabase-chat';

// 읽음 상태 구독
const readSubscription = subscribeToReadStatus(
  roomId,
  userId,
  (messageId, readBy) => {
    // 읽음 상태 업데이트
    updateMessageReadStatus(messageId);
  }
);
```

### 3. 메시지 전송

메시지는 일반적인 데이터베이스 INSERT를 통해 전송합니다:

```typescript
const { data, error } = await supabase
  .from('Message')
  .insert({
    roomId,
    senderId,
    content,
    messageType: 'TEXT'
  })
  .select()
  .single();
```

트리거가 자동으로 브로드캐스트 이벤트를 발생시킵니다.

## 주요 기능

### 1. 자동 재연결

- Supabase 클라이언트가 자동으로 재연결 처리
- 네트워크 상태 변경 시 자동 복구

### 2. 메시지 중복 방지

- 메시지 ID를 기반으로 중복 체크
- 자신이 보낸 메시지는 구독에서 제외

### 3. 읽음 상태 실시간 동기화

- MessageRead 테이블 변경 시 자동 브로드캐스트
- 상대방의 읽음 상태를 실시간으로 확인

### 4. Presence (온라인 상태)

```typescript
import { subscribeToPresence } from '@/app/lib/supabase-chat';

const presenceSubscription = subscribeToPresence(
  roomId,
  userId,
  (onlineUsers) => {
    // 온라인 사용자 목록 업데이트
    setOnlineUsers(onlineUsers);
  }
);
```

## 보안 고려사항

### 1. Row Level Security (RLS)

- 모든 테이블에 RLS 활성화
- 사용자는 자신이 참여한 채팅방만 접근 가능
- 메시지는 채팅방 참여자만 읽기/쓰기 가능

### 2. Private 채널

- 모든 브로드캐스트 채널은 private으로 설정
- 인증된 사용자만 구독 가능
- `supabase.realtime.setAuth()`를 통한 토큰 설정

### 3. 데이터 검증

- 서버 측 트리거에서 데이터 무결성 검증
- 클라이언트 입력값 검증

## 성능 최적화

### 1. 인덱스 전략

```sql
-- 자주 조회되는 컬럼에 인덱스 생성
CREATE INDEX idx_message_roomid_createdat ON "Message"("roomId", "createdAt" DESC);
```

### 2. 채널 관리

- 사용하지 않는 채널은 즉시 정리
- 채널 재사용 방지를 위한 기존 채널 제거

### 3. 메시지 페이징

```typescript
// 메시지 50개씩 로드
const { data } = await supabase
  .from('Message')
  .select('*')
  .eq('roomId', roomId)
  .order('createdAt', { ascending: false })
  .limit(50);
```

## 트러블슈팅

### 1. 메시지가 실시간으로 전달되지 않는 경우

1. **트리거 확인**
   ```sql
   SELECT trigger_name FROM information_schema.triggers 
   WHERE event_object_table = 'Message';
   ```

2. **RLS 정책 확인**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('ChatRoom', 'Message', 'MessageRead');
   ```

3. **브로드캐스트 함수 확인**
   ```sql
   -- realtime.broadcast_changes 함수가 존재하는지 확인
   ```

### 2. 인증 오류

- `supabase.auth.getSession()` 확인
- 토큰 만료 여부 확인
- Private 채널 설정 확인

### 3. 성능 이슈

- 인덱스 추가 고려
- 메시지 로드 수 제한
- 채널 수 최적화

## 테스트 방법

1. **단위 테스트**
   ```bash
   npx tsx test-broadcast-chat.ts
   ```

2. **통합 테스트**
   - 두 개의 브라우저 창에서 테스트
   - 네트워크 지연 시뮬레이션
   - 대량 메시지 전송 테스트

## 마이그레이션 가이드

### Postgres Changes에서 Broadcast로 전환

1. 기존 구독 코드 제거
2. 새로운 broadcast 구독 코드 적용
3. 데이터베이스 트리거 설정
4. 테스트 및 검증

## 참고 자료

- [Supabase Realtime 문서](https://supabase.com/docs/guides/realtime)
- [Supabase Broadcast 문서](https://supabase.com/docs/guides/realtime/broadcast)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)