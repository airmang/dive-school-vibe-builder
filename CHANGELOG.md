# 변경 기록

## 0.3.0 — 2026-10-17

- Codex와 Claude Code에서 함께 쓰도록 변경. 기본 설치가 같은 스킬을 `.agents/skills/`(Codex)와 `.claude/skills/`(Claude Code)에 함께 복사한다. `--agent codex|claude`로 한쪽만 설치할 수 있다.
- init이 `@AGENTS.md`를 가져오는 CLAUDE.md를 만든다. 규칙은 AGENTS.md 한 곳에서 관리한다. 기존 CLAUDE.md는 덮어쓰지 않고, 가져오기 줄이 없으면 init과 check가 알린다.
- GitHub 없이 Vercel CLI로 직접 배포하는 경로를 허용. S6.2·S6.3(GitHub 업로드)은 합의한 N/A로 둘 수 있고, 업로드 대상 점검 S6.1은 계속 필수다. 이전에는 draft 점검이 항상 막혔다.
- 브라우저 로그인을 기다리는 `vercel login`이 AI 도구 안에서 멈출 때 터미널 창에서 직접 실행하도록 안내.
- 점검 도구가 `.claude/` 폴더를 프로젝트 파일 검사에서 제외한다.
- 안내 문서와 스킬 본문을 도구 중립으로 정리. 호출 형식은 Codex `$dive-webapp`, Claude Code `/dive-webapp`으로 함께 표기.
- Claude Code 2.1.301에서 `.claude/skills` 발견, `.agents/skills` 미발견(중복 없음), CLAUDE.md의 `@AGENTS.md` 가져오기를 확인. 데스크톱 앱 Code 탭에서의 전체 흐름은 별도 리허설로 남김.

## 0.2.1 — 2026-10-05

- GitHub 링크+설치 요청만으로 시작하는 SETUP 진입점과 설치 전 AGENTS 라우팅 추가. 배포물 다운로드·압축 해제도 Codex가 지원.
- Windows WinGet/공식 설치 파일, macOS/Linux 환경별 설치 지원·PATH 재확인·npm.cmd/npx.cmd 안내.
- Node 없이 실행하는 읽기 전용 환경 점검 도우미(Windows PowerShell/POSIX sh) 추가. 자동 설치·권한/정책 변경은 하지 않음.
- 첫 Next.js 앱을 별도 빈 폴더에 생성해 기존 스킬·계획·환경 파일과 충돌하지 않는 절차 추가.
- macOS의 고정된 /tmp·/var·/etc 시스템 링크만 정규화하고 사용자 링크 차단 유지.
- 웹앱에 추가한 선택 작업의 합의된 N/A 허용. 기존 필수 작업·RLS 점검 제외 제한은 유지.
- 실제 Windows 설치·학교망·클라우드 종단간 검증은 별도 리허설로 남김.

## 0.2.0 — 2026-09-16

- 범용 dive-builder와 선택형 dive-webapp을 분리. 하나의 PROJECT/PLAN을 공유.
- 일반 모드는 고정 웹 기술·29개 작업 ID·클라우드 완료 의무를 제거.
- 웹앱에는 기존 8단계, 보안/연결 안내, 선택적 학교 예시를 보존.
- 합의된 적용 제외(N/A)와 최신 검증 결과, 구 계획 감지, 재개·모드 전환 지침 추가.
- 기본 묶음 설치, core-only, 기존 이름/CLI 호환. 기존 파일 덮어쓰기 금지.
- 수동 업로드에서 누락된 루트 숨김 파일 복원, 숨김 템플릿을 일반 파일명으로 포장.
- 새 자동 테스트와 패키지 검사, 실제 Codex 리허설 시나리오 추가.
- 원격 클라우드/실제 Codex 대화 검증은 별도이며 자동 테스트로 주장하지 않음.

## 0.1.0 — 2026-09-16

- 한국어 교사 대상 Grill Me 인터뷰와 8단계 구현·공유 워크플로우.
- AGENTS/PROJECT/PLAN 세 문서 체제와 검증 근거 기반 진행 기록.
- calendar/admissions/counseling/custom 시작 프로필.
- Node.js 표준 라이브러리만 사용하는 안전한 설치·초안 생성·상태·정적 점검 도우미.
- 프로젝트별 `.agents/skills` 설치와 선택적 사용자 범위 설치.
- 기존 파일 보존, 심볼릭 링크 경로 거부, 문서 작업 누락/허위 완료 표시 위험 점검.
- 강사 안내, GitHub 게시 안내, 공식 기술 출처, 로컬 자동 테스트.

이 버전은 실제 Codex/클라우드 계정을 연결한 종단간 테스트 완료를 주장하지 않습니다.
