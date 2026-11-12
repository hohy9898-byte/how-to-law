# How to Law

변리사·변호사 시험 준비하면서 조문이랑 판례 외우려고 만드는 웹 서비스.
민법부터 시작하고 나중에 민사소송법, 특허법, 상표법 등으로 늘릴 예정이다.

## 기능

1단계 (MVP)
- 민법 조문 수집 (국가법령정보센터 Open API), 조·항·호·목 단위로 저장, 시행일별 버전 관리
- 목차(편·장·절) 탐색, 키워드 검색, 조문 번호로 바로 이동
- 준용·참조 조문 링크
- 빈칸 채우기
  - 빈칸은 직접 지정하거나 자동 생성 (숫자·기간, 요건·효과 키워드 등)
  - 키워드 → 구절 → 조문 전체 순으로 난이도 조절, 초성 힌트
  - 띄어쓰기·조사 차이는 정답 처리
- 틀린 조문 위주로 복습 주기 관리 (FSRS)

2단계
- 판례 카드 (사건번호·쟁점 / 판결요지·결론), 판결요지 빈칸, 결론 OX
- 조문 화면에서 관련 판례 보기
- 선택형 기출을 지문별 OX로 나누고 근거 조문·판례 연결
- 오답노트

3단계
- 사례형 기출 AI 답안 (조문·판례 DB 검색 후 생성, 쟁점-법리-포섭-결론 형식)
- 답안에 인용된 조문·사건번호가 DB에 실제로 있는지 확인
- 내가 쓴 답안 첨삭
- 학습 통계 (암기율, 취약 단원)

나중에
- 유사 제도 비교표 (해제/해지, 소멸시효/제척기간 등)
- 조문 TTS, 모바일 PWA
- 법 개정 시 바뀐 부분 표시

## 데이터 구조

법률 종류에 상관없이 같은 구조를 쓴다.

```
Law ─< LawVersion ─< Provision (편/장/절/조/항/호/목, parent_id)
Provision ─< ProvisionRef (준용·참조)
Case ─< CaseProvisionLink >─ Provision
Exam ─< Question ─< Choice ─< Evidence (근거 조문/판례)
ClozeCard (provision_id, 빈칸 위치, 난이도) / CaseCard
ReviewLog (user, card, 결과, FSRS 상태)
AIAnswer (question_id, 본문, 인용, 검증 결과, 검수 여부)
```

빈칸은 조문 버전 + 글자 위치로 저장해서 개정됐을 때 영향받는 카드를 찾을 수 있게 한다.

## 스택

Next.js, TypeScript, Tailwind, Prisma, Claude API
DB는 개발 중엔 SQLite, 배포 때 Supabase (PostgreSQL, pgvector)로 옮길 예정

## 실행 방법

1. 설치, DB 만들기
   ```
   npm install
   cp .env.example .env
   npm run db:push
   ```
   `.env`의 `LAW_API_OC`에 법령정보센터 Open API 인증값(가입 이메일의 @ 앞부분)을 넣는다. 호출하는 PC의 IP가 등록돼 있어야 함
2. 법령 받기 → DB에 넣기
   ```
   npm run law:fetch        # 기본 민법. 다른 법은 npm run law:fetch -- 상법
   npm run law:import
   ```
   API를 못 쓸 때는 본문을 `data/raw/민법.txt`로 저장하고 `law:fetch` 대신 `npm run law:parse`
3. `npm run dev` 후 http://localhost:3000

테스트: `npm test`

## 코드 구조

- `src/lib/law-parser/` 원문 → 공통 트리 변환. `adapters/api.ts`가 API 응답용, `adapters/text.ts`가 텍스트 파일용
- `src/lib/law-api/` 법령정보센터 API 호출 (수집 스크립트에서만 사용)
- `scripts/` fetch, parse, import 스크립트
- `prisma/schema.prisma` DB 스키마
- `src/app/laws/[slug]/` 목차, `articles/[no]` 조문 보기, `search` 검색

## 참고

- 법령·판례는 저작권 보호 대상이 아님 (저작권법 제7조). 기출문제·해설은 이용 조건 따로 확인할 것
- 법령 API는 인증키 신청 필요: https://open.law.go.kr

## 문서

- [트러블슈팅](docs/TROUBLESHOOTING.md)
- [고려사항](docs/고려사항.md)
