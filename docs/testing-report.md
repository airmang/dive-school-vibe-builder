# 검증 범위

## 0.2.1 — 설치부터 시작하기

2026-10-05 · macOS 26.5.1 arm64 · Node.js v22.22.2 · Git 2.50.1 · Codex CLI 0.159.3.

기존 Node/Git을 삭제하거나 다시 설치하지 않고, 독립된 실행 경로의 가짜 네이티브 명령으로 도구 누락·버전 부족·실행 실패를 시험했다.
Node 없이 실행하는 POSIX sh 도우미, 설치된 core-only 스킬의 도우미, macOS 시스템 임시 경로와 CLI 실제 실행을 확인했다.
선택 기능의 N/A를 허용하면서 필수 RLS/접근 검증 제외는 계속 차단하는 회귀 시험도 통과했다.

PowerShell 7.6.6의 공식 macOS arm64 배포물을 임시 폴더에서 실행해 doctor.ps1을 추가 검증했다.
Node/npm/Git 누락, 실제 네이티브 명령 호출과 npm.cmd 선택, Node 20.8/20.9 기준 차이, 잘못된 버전, 명령 실패를 시험했다.
이 검증은 실제 Windows PowerShell 5.1·WinGet·설치 화면·UAC·Windows PATH 재시작 시험을 대신하지 않는다.

추가 PowerShell 시험을 활성화한 `npm test`: **93개 중 92개 통과, 실패 없음, Windows 전용 junction 시험 1개는 macOS에서 건너뜀**.
활성화 방법은 기존 PowerShell 실행 파일의 경로를 DIVE_TEST_PWSH에 지정하는 것이다. 테스트가 PowerShell을 설치하거나 실행 정책을 변경하지 않는다.
`npm run verify`, 두 스킬의 quick_validate, sh 문법 검사, 실제 로컬 환경 doctor --webapp, diff 공백 검사를 통과했다.

실제 Windows 설치·학교망·참가자의 새 Codex 대화·Supabase/Vercel 연결과 배포는 미검증이다.
[Windows 리허설](windows-rehearsal.md)에 설치 전·후·재시작·첫 앱 실행 결과를 기록한다.

## 0.2.0 — 기존 검증 기록

2026-09-16 · 로컬 Linux · Node.js v22.16.0 · Git 2.47.3.

`npm test`: 68개 테스트 통과, 실패/건너뛰기 없음.
범용/웹앱 초안, 자유로운 작업 ID, 4개 웹앱 예시, 설치·기존 파일 보존·심볼릭 링크 거부,
모드/기록 형식, 최신 FAIL과 근거 누락, 적용 제외, DB 없는 웹앱, RLS 필수 유지,
클라우드/Git 없는 범용 완료, prepush와 실제 Git 추적 파일, 키 값 비표시, 두 스킬 묶음과 core-only,
설치된 복사본에서 실행, 구 CLI 경로를 자동 테스트했다.

`npm run verify`: 스킬 메타데이터·버전·필수 자산·웹앱 작업 ID·중립 템플릿·로컬 링크·코드펜스를 점검한다.

업로드된 main의 Git tree SHA와 제공된 원본 ZIP(누락된 숨김 파일 제외)로 재구성한 tree SHA가
9bf9c7a50c89fbc04b365981876e1c148891447d로 일치함을 확인하고 변경을 시작했다.

실제 Codex 대화에서의 스킬 선택/작업 행동, Windows/macOS 노트북, 학교망,
Supabase·Vercel 계정과 실제 배포 URL을 연결한 종단간 시험은 **실행하지 않았다**.
[리허설 시나리오](skill-evaluation-cases.md)는 향후 실행용이며 통과 목록이 아니다.

문서 PASS는 실제 검증/승인 진위의 증명이 아니다. 일반 모드의 작업 삭제를 자동 탐지하지 않고,
파일 변경과 과거 근거를 자동 연결하지 않으므로 에이전트의 diff 검토와 실제 재시험이 필요하다.
