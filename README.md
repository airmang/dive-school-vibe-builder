# DIVE Builder

**개발 경험이 없어도, 만들고 싶은 것을 실제로 완성하도록 돕는 Codex 개발 하네스.**

버전 **0.2.0** · 한국어 · MIT · 추가 npm 의존성 없음

범용 개발 도우미 **dive-builder**와 선택형 **dive-webapp**을 함께 제공합니다.
기본은 게임·자동화·파일 처리·봇·분석·웹앱·기존 코드 수정 등 자유로운 개발입니다.
교사 연수에서는 공유 웹앱 모드를 선택해 Next.js → Supabase → GitHub → Vercel 경로를 사용할 수 있습니다.
사용자를 가르치거나 평가하기보다 요구사항·계획·실행·검증·오류 해결·재개를 돕습니다.

> 완성된 웹앱이나 데스크톱 앱이 아닙니다. 별도 프로젝트에서 Codex가 읽고 사용하는 스킬 묶음입니다.
> DIVE 데스크톱의 전용 UI·Pi/Rust 통제·연구 로깅을 포함하지 않습니다. 공식 OpenAI/Supabase/Vercel 제품도 아닙니다.

## 가장 쉬운 시작

이 저장소를 내려받아 압축을 푼 뒤, **이 README가 있는 폴더의 터미널**에서 실행합니다.
Node.js 20 이상이 필요합니다. 앱 개발 환경은 선택한 기술의 현재 요구사항을 별도로 확인합니다.

```text
node scripts/install.mjs --project "../my-project"
```

공통·웹앱·구 이름 호환 스킬을 프로젝트의 `.agents/skills/`에 함께 설치합니다.
기존 설치와 프로젝트 파일은 덮어쓰지 않습니다. 계정 연결·패키지 설치·배포는 하지 않습니다.

그다음 **my-project 폴더를 Codex에서 열고**, 대화창에 입력합니다.

```text
$dive-builder로 시작해줘.
내 컴퓨터에서 여러 파일을 합쳐주는 프로그램을 만들고 싶어.
개발 경험이 없으니 필요한 것부터 정리하고 구현·검증을 도와줘.
```

교사 연수나 URL로 공유할 웹앱은 다음처럼 시작합니다.

```text
$dive-webapp으로 공유 웹앱을 만들고 싶어.
학생들이 신청하고 내가 신청 현황을 확인하는 프로그램이야.
필요한 것부터 질문하고 실제 배포까지 진행을 도와줘.
```

위 `$...` 문장은 **Codex 대화용**이지 PowerShell 명령이 아닙니다.
스킬이 안 보이면 `/skills`를 확인하고 Codex를 재시작합니다.
[첫 실행](START_HERE.md) · [교사 연수 운영](docs/facilitator-guide.md) · [v0.1에서 전환](docs/migration-v0.2.md)

## 두 모드, 하나의 프로젝트 기록

| 구성 | 역할 |
|---|---|
| **dive-builder** | 인터뷰·최소 범위·기술 제안·계획·구현·검증·오류 해결·중단/재개 |
| **dive-webapp** | 선택한 공유 웹앱의 DB·로그인·권한·GitHub·Vercel 연결을 구체적으로 지원 |
| school-vibe-builder | 이전 호출/CLI 경로의 명시적 호환 진입점. 별도 엔진이 아님 |

두 스킬은 같은 Codex가 함께 읽는 지침입니다. 스킬 사이에 자동 도구 호출이나 별도 에이전트 런타임이 생기는 것은 아닙니다.
공통 스킬은 단독 사용 가능합니다. 웹앱 스킬은 공통 스킬과 함께 사용하며, 기본 설치가 이를 보장합니다.

PROJECT.md는 합의한 정의, PLAN.md는 유일한 진행 상태, AGENTS.md는 협업 규칙입니다.
사용자는 문서를 관리할 필요 없이 “다음 단계”, “안 돼”, “오늘 여기까지”라고 말하면 됩니다.
하네스는 이를 실제 파일과 검증 기록으로 이어가도록 안내합니다. 단순 수정에는 전체 인터뷰를 강제하지 않습니다.

## 웹앱 모드

화면 → 로컬 실행 → 필요한 DB·권한 → 저장 연결 → 로그인·권한 검증 → GitHub → Vercel → 실제 URL 확인·공유.

DB 없는 계산기나 소개 페이지에 Supabase를 억지로 붙이지 않습니다.
필요 없는 항목은 이유와 사용자 합의를 기록해 적용 제외하며, 완료와 별도로 집계합니다.
Supabase를 사용하면서 RLS/접근 검증을 생략하는 것은 허용하지 않습니다.
학교 일정·진학 일정·상담카드는 선택적 출발 예시일 뿐이며, 만들 수 있는 프로그램을 제한하지 않습니다.

## 설치 선택

```text
node scripts/install.mjs --user
node scripts/install.mjs --project "../my-project" --core-only
node scripts/install.mjs --project "../my-project" --dry-run
```

--user는 개인의 ~/.agents/skills, --core-only는 범용 스킬만 설치합니다.
전역과 프로젝트 범위에 같은 이름을 중복 설치하지 않습니다. 기존 버전은 [이관 안내](docs/migration-v0.2.md)를 따릅니다.
GitHub 경로별 skill-installer를 쓰는 경우에는 **dive-builder와 dive-webapp을 같은 스킬 상위 폴더에 모두 설치**해야 합니다.
이 저장소의 설치 도구가 두 스킬을 묶어 설치하는 기본 방법입니다. 플러그인 마켓 등록은 포함하지 않습니다.

## 선택적 로컬 도우미

아래는 앱 폴더 기준이며 보통 Codex가 실행합니다. 웹앱 초안은 init에 --mode webapp을 붙입니다.

```text
node .agents/skills/dive-builder/scripts/harness.mjs init --project "." --name "내 프로젝트"
node .agents/skills/dive-builder/scripts/harness.mjs status --project "."
node .agents/skills/dive-builder/scripts/harness.mjs check --project "." --gate draft
node .agents/skills/dive-builder/scripts/harness.mjs check --project "." --gate prepush
node .agents/skills/dive-builder/scripts/harness.mjs check --project "." --gate release
```

init은 초안만 만듭니다. 기존 PROJECT/PLAN에는 쓰지 않으며 기존 AGENTS에는 제안 파일을 따로 만듭니다.
status/check는 읽기 전용입니다. 일반 모드의 작업 ID/개수는 자유롭고 웹앱 모드에만 해당 체크 지점이 적용됩니다.
prepush는 Git 추적/제외 상태를 확인합니다. release는 기록상 완료 준비 점검이며 일반 로컬 도구에 Git·클라우드를 요구하지 않습니다.
**PASS는 실제 동작·보안·승인 인증이 아닙니다.** 비밀 탐지는 일부 패턴이며 실제 권한·실행·배포를 별도로 시험해야 합니다.

## 유지보수와 검증

```text
npm test
npm run verify
```

[설계 결정](docs/architecture.md) · [검증 범위](docs/testing-report.md) · [실제 Codex 리허설](docs/skill-evaluation-cases.md) · [보안](SECURITY.md) · [변경 기록](CHANGELOG.md)

## 구조

```text
skills/dive-builder/          공통 지침·중립 템플릿·로컬 점검 도구
skills/dive-webapp/           선택형 웹앱 절차·예시·권한/배포 가이드
skills/school-vibe-builder/   기존 이름의 얇은 호환 진입점
scripts/                     묶음 설치·패키지 검사
tests/                       로컬 자동 테스트
docs/                        사용자·연수·이관·설계·검증 안내
```

템플릿의 gitignore.txt/env-example.txt는 초기화 시 .gitignore/.env.example로 생성됩니다.
숨김 템플릿을 빠뜨리기 쉬운 수동 업로드도 고려했습니다. [GitHub 게시 안내](docs/publishing-guide.md)를 참고하세요.
