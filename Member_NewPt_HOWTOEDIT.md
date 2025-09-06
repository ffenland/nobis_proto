/member/pt/new 경로의 변경요청.
API요청과 서비스 로직을 한쪽으로 몰아서 통일한다.

api요청은 모두 api/member/new-pt 또는 그 하위로 옮긴다.

app/lib/services/pt-apply.service.ts 의 로직은 결과적으로 app/services/member/pt/pt.service.ts 로 옮겨가게 된다.

### 맨 처음 FitnessCenter를 선택하는 단계

- 기존의 "/api/member/fitness-centers"경로를 삭제하고
- 새로운 경로 /api/member/new-pt/centers로 이동한다.
- 기존 라우트에서 호출하던 getFitnessCentersService와 타입관련 로직들은 @app/services/member/pt/pt.service.ts 파일로 이동한다.타입정의, 추론 모두 CLAUDE.MD의 지침을 따른다.

### 두번째 Trainer를 선택하는 단계

- 선택한 fitnessCenter에 소속된 trainer의 목록과 그들이 수업할 수 있는 PtProduct를 한번에 불러온다.
- 새로운 api경로 : `/api/member/new-pt/trainers?center=${centerId}`
- NextJS 최신버전에 맞게 searchParam의 값을 비동기로 가져온다. (CLAUDE.MD의 내용대로 수행)
- 서비스 로직의 경로 @app/services/member/pt/pt.service.ts 파일에 생성. 타입정의, 추론 모두 CLAUDE.MD의 지침을 따른다.
- TrainerSelectionStep.tsx는 위의 API요청에 맞게 수정하고, 페이지의 디자인도 트레이너별로 카드를 만들어서 세로 정렬로 배치한다. 트레이너의 avatar, username, introduce 의 정보를 보여주고, 하단에 트레이너가 수업 가능한 PtProduct의 title과 가격정보를 보여주고 각 PtProduct의 오른쪽 끝에 "신청하기" 버튼을 만든다. 이 버튼을 누르면 Trainer, PtProduct가 선택되고, 다음 단계인 StartDate를 선택하는 step으로 넘어간다.
