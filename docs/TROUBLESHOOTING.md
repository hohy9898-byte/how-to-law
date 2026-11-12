# 트러블슈팅

[← README](../README.md)

개발하면서 막혔던 것들 기록.

### GitHub 첫 push 후 README 깨짐
- 날짜: 2026-11-12
- 문제: GitHub 안내 명령을 두 번 실행했더니 `remote origin already exists` 오류가 남. push는 됐는데 GitHub에서 README 끝이 `#   h o w - t o - l a w`처럼 깨져 보이고 git은 README를 바이너리로 취급함
- 원인: PowerShell 5.1의 `echo "..." >> README.md`가 UTF-16으로 씀. UTF-8 파일 끝에 UTF-16 글자가 붙어 NUL 바이트가 생김. 두 번째 `git remote add`는 origin이 이미 있어서 실패
- 해결: README 끝의 UTF-16 부분을 잘라냄. PowerShell에서 파일에 쓸 땐 `Add-Content -Encoding utf8`을 쓰거나 Git Bash 사용. remote 오류는 무시해도 됨 (주소를 바꾸려면 `git remote set-url origin <url>`)

<!--
### 제목
- 날짜:
- 문제:
- 원인:
- 해결:
-->
