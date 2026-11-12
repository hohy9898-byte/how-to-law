# 트러블슈팅

[← README](../README.md)

개발하면서 막혔던 것들 기록. 발견한 순서대로 번호를 붙이고, 새 항목은 맨 아래에 추가한다.
1~14번의 발견 시각은 당시 따로 적지 않아서 git 기록, 서버 로그, 파일 저장 시각으로 추정한 값이다 (±5분 안팎).

### 1. create-next-app이 기존 폴더에서 실행 안 됨
- 발견: 2026-11-12 09:10
- 문제: README.md가 있는 폴더에서는 create-next-app이 파일 충돌로 멈춤
- 해결: 임시 폴더에 생성한 뒤 README.md와 .git을 빼고 프로젝트 폴더로 복사

### 2. npm install 후 Prisma가 동작하지 않음
- 발견: 2026-11-12 09:12
- 문제: `npm install` 때 `npm warn install-scripts … not yet covered by allowScripts` 경고가 뜨고 Prisma 엔진, esbuild 등이 제대로 설치되지 않음
- 원인: npm 11은 패키지의 설치 스크립트(postinstall 등)를 기본으로 막음
- 해결: `npm install-scripts ls`로 확인 후 `npm install-scripts approve @prisma/client @prisma/engines prisma esbuild sharp`, 이어서 `npm rebuild`. 허용 목록은 package.json의 `allowScripts`에 저장됨

### 3. 가지 조문이 "제7의2조"로 표시됨
- 발견: 2026-11-12 09:17
- 문제: 화면에서 가지 조문이 `제7의2조`로 나옴. 법령 표기는 `제7조의2`
- 원인: 조 키("7의2") 앞뒤에 "제", "조"만 붙여서 표시함
- 해결: `articleName()`을 만들고 목차·조문·검색 화면에서 모두 이 함수로 표시 (당시 `src/lib/law-keys.ts`, 지금은 `src/features/law/keys.ts`)

### 4. GitHub 첫 push 후 README 깨짐
- 발견: 2026-11-12 09:22
- 문제: GitHub 안내 명령을 두 번 실행했더니 `remote origin already exists` 오류가 남. push는 됐는데 GitHub에서 README 끝이 `#   h o w - t o - l a w`처럼 깨져 보이고 git은 README를 바이너리로 취급함
- 원인: PowerShell 5.1의 `echo "..." >> README.md`가 UTF-16으로 씀. UTF-8 파일 끝에 UTF-16 글자가 붙어 NUL 바이트가 생김. 두 번째 `git remote add`는 origin이 이미 있어서 실패
- 해결: README 끝의 UTF-16 부분을 잘라냄. PowerShell에서 파일에 쓸 땐 `Add-Content -Encoding utf8`을 쓰거나 Git Bash 사용. remote 오류는 무시해도 됨 (주소를 바꾸려면 `git remote set-url origin <url>`)

### 5. 법령 API 응답 형식이 일정하지 않음
- 발견: 2026-11-12 09:34
- 문제: 제40조처럼 항 번호 없이 호만 있는 조는 `항`이 배열이 아니라 객체로 옴. 삭제 조문은 `삭제 <2015.2.3>`처럼 날짜만 있어서 본문에 그대로 남음
- 원인: API가 항목이 하나면 배열 대신 객체로 줌. 날짜 표기는 `<개정 …>` 형식이 아님
- 해결: `adapters/api.ts`에서 항·호·목을 항상 배열로 맞춤. `common.ts`의 표기 정규식에 날짜만 있는 경우 추가

### 6. API 어댑터 테스트 1건 실패 (테스트 쪽 문제)
- 발견: 2026-11-12 09:36
- 문제: `api.test.ts`에서 제3편의 첫 번째 하위 항목을 제9절의2로 기대했는데 제436조가 나옴
- 원인: 테스트 샘플을 만들 때 장을 빼서 제436조가 제3편 바로 아래 첫 번째로 붙음. 어댑터는 정상
- 해결: 순서 대신 `level === "SECTION"`으로 찾도록 테스트 수정. 샘플에서 일부만 뽑을 땐 상위 계층이 빠지는지 확인할 것

### 7. 개발 서버가 켜져 있으면 prisma generate 실패
- 발견: 2026-11-12 09:50
- 문제: 스키마 바꾸고 `npx prisma db push` 했는데 클라이언트 생성이 `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`로 실패
- 원인: Windows에서 실행 중인 next dev가 Prisma 엔진 DLL을 잡고 있음. 서버 작업을 멈춰도 자식 node 프로세스가 남아 있을 수 있음 (11번)
- 해결: 개발 서버(남은 node 프로세스 포함)를 끄고 `npx prisma generate` 다시 실행

### 8. 없는 조문이 404가 아니라 200, 로그인 리다이렉트가 307이 아니라 200
- 발견: 2026-11-12 09:53
- 문제: `/laws/civil/articles/9999`가 404 화면은 나오는데 상태 코드는 200. 비로그인으로 `/me`에 가면 307 대신 200
- 원인: `src/app/loading.tsx`가 있으면 페이지가 스트리밍으로 200을 먼저 보내서, 뒤에 실행되는 `notFound()`, `redirect()`가 상태 코드를 못 바꿈 (클라이언트에서만 처리됨)
- 해결: 루트 `loading.tsx` 삭제. 로딩 화면이 필요하면 notFound·redirect를 안 쓰는 하위 경로에만 둘 것

### 9. Git Bash에서 curl로 폼 테스트할 때 값이 바뀌어 전송됨
- 발견: 2026-11-12 09:58
- 문제: curl로 회원가입 폼을 보냈더니 `next=/laws/...`가 `C:/Program Files/Git/laws/...`로 바뀌고, 한글 메모는 깨져서 저장됨
- 원인: Git Bash(MSYS)가 `/`로 시작하는 인자를 Windows 경로로 바꿈. 명령줄 인자의 한글은 UTF-8이 아니라 시스템 코드페이지로 넘어감. 앱 문제 아님 (브라우저는 정상)
- 해결: `export MSYS_NO_PATHCONV=1` 후 실행. 한글 값은 UTF-8 파일로 저장하고 `-F "body=<note.txt"`로 보냄

### 10. 폴더 구조를 바꾼 뒤 개발 서버가 모든 페이지에 500
- 발견: 2026-11-12 10:11
- 문제: 파일을 features/로 옮긴 뒤 켜져 있던 next dev가 `Failed to read source code from ...\src\components\AuthForm.tsx`(옮기기 전 경로)로 500. 파일을 다시 저장하니 일부는 돌아왔지만 이후 `Jest worker encountered 2 child process exceptions, exceeding retry limit`으로 계속 500
- 원인: 실행 중인 개발 서버가 옛 경로를 캐시에 들고 있고, 대량 이동 중에 내부 작업 프로세스가 죽어서 다시 안 살아남
- 해결: 개발 서버를 완전히 끄고(남은 node 프로세스까지) 다시 켬. 파일을 많이 옮길 땐 서버를 먼저 끌 것. 그래도 이상하면 `.next` 폴더를 지우고 켬

### 11. 개발 서버를 멈춰도 node 프로세스가 남음
- 발견: 2026-11-12 10:12
- 문제: 백그라운드로 띄운 `npx next dev`를 멈췄는데도 포트와 파일 잠금이 그대로라 7번, 10번 문제가 계속됨
- 원인: npx → next → `start-server.js`로 프로세스가 세 단계로 뜨는데, 바깥 작업만 멈추면 안쪽 node 프로세스가 남음
- 해결: `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`로 명령줄을 보고 이 프로젝트의 next 프로세스만 `Stop-Process -Id ...`로 종료. Claude Code에서는 이 종료가 자동 모드에서 막혀서 `.claude/settings.local.json`에 `PowerShell(Stop-Process *)`를 허용함

### 12. 목차 페이지가 매번 2.6초, 1.76MB
- 발견: 2026-11-12 10:20
- 문제: `/laws/civil`이 다시 열어도 매번 2.5~2.7초. HTML 1.76MB
- 원인: 서버에서 조문 1,337개를 모두 `<Link>`로 그려서, HTML과 클라이언트용 데이터(RSC payload)에 같은 내용이 이중으로 실림
- 해결: 목차 행을 `[key, title, level, depth, 삭제여부]` 배열로만 보내고, 클라이언트 컴포넌트(`TocTree`)가 펼친 편·장·절의 자식만 그림. 목차 데이터는 버전 id 키로 `unstable_cache`
- 결과 (개발 모드, 다시 열 때): 2.6초 → 0.14초, 1.76MB → 102KB. 배포 모드에서는 0.04초, gzip 20KB
- 참고: 다른 페이지도 처음 열 때 1.5~6초 걸리는 건 개발 모드가 그때 컴파일해서임. 배포 모드(`npm run build && npm start`)에서는 모든 페이지 0.1초 이하. turbopack(`next dev --turbopack`)은 처음 컴파일은 비슷하고 다시 열 때 0.1초쯤 더 느려서 안 씀

### 13. 판례 API 검색 결과를 그대로 쓰면 안 됨
- 발견: 2026-11-12 10:36
- 문제
  - "민법 제750조" 본문 검색에 하급심 판결과, 그 조문을 지나가며 언급만 한 판례가 섞여 나옴
  - 목록의 선고일자는 `2026.04.30`, 상세는 `20260430`으로 형식이 다름
  - 사건번호로 찾을 때 `query=2013다40681`은 그 사건번호를 본문에 인용한 다른 판례까지 나옴
- 해결
  - 검색에 `curt=대법원`을 붙이고, 상세의 참조조문을 파싱해서 그 조문이 실제로 있을 때만 연결. 실제 연결은 검색 결과의 30~60%
  - 날짜는 `toIsoDate()`로 `YYYY-MM-DD`로 통일
  - 사건번호 검색은 `nb=` 파라미터를 쓰면 정확히 한 건

### 14. 핵심 구문 원문 검증 테스트 2건 실패
- 발견: 2026-11-12 10:41
- 문제: `cases.test.ts`에서 원문에 있는 구절("채무자의 권리를 행사할 수 있다.")을 `findVerbatim`이 버림
- 원인: 최소 길이를 공백 제외 15자로 잡았는데, 판결요지의 핵심 구절은 이보다 짧을 수 있음 (위 구절은 14자)
- 해결: 최소 길이를 10자로 낮춤. "채권자는" 같은 짧은 조각은 여전히 버림

<!--
### N. 제목
- 발견: YYYY-MM-DD HH:MM
- 문제:
- 원인:
- 해결:
-->
