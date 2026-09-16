# School Vibe Builder

**교사의 업무 아이디어를 질문으로 구체화하고, 작은 웹앱의 구현·검증·배포를 관리하는 Codex 스킬 하네스.**

`Grill Me → PROJECT.md / PLAN.md → 화면 → 로컬 실행 → Supabase → 로그인·권한 → GitHub → Vercel → 공유`

버전 **0.1.0** · 한국어 교사 연수용 · MIT License · 추가 npm 의존성 없음

> 이것은 완성된 캘린더/상담 앱이 아니라 **그 앱을 Codex와 만드는 방법을 담은 패키지**입니다.
> 이 저장소 자체에서 `npm run dev`를 실행하는 제품이 아닙니다. 별도 앱 폴더에 스킬을 설치합니다.
> OpenAI·Supabase·Vercel 공식 제품이나 공식 인증 배포물이 아닙니다.

## 가장 빠른 시작 — 프로젝트별 설치

이 저장소를 내려받아 압축을 푼 다음, **이 README가 있는 폴더**에서 터미널을 엽니다.
Node.js가 필요합니다. 설치 여부는 `node --version`으로 확인합니다. 도우미의 문법 하한은 Node 20이지만, 실제 앱 개발에는 현재 지원되는 LTS와 Next.js 요구 사항을 확인해 사용합니다.

```text
node scripts/install.mjs --project "../my-class-app"
```

설치 도구는 지정한 앱 폴더에 `.agents/skills/school-vibe-builder/`만 복사합니다.
기존 프로젝트 파일이나 Codex 전역 설정을 덮어쓰지 않습니다. 인터넷 연결이나 `npm install`은 필요 없습니다.

그다음 **my-class-app 폴더를 Codex의 작업 폴더로 열고**, 대화에 다음을 입력합니다.

```text
$school-vibe-builder로 새 프로젝트를 시작해줘.
학급 일정 공유 앱을 만들고 싶어.
먼저 내 계획에서 빠진 부분을 한 번에 하나씩 질문하고,
범위를 확정하면 PROJECT.md와 PLAN.md를 만들어줘.
```

이 문장은 **Codex 대화창**에 넣습니다. PowerShell 명령이 아닙니다.
스킬이 안 보이면 `/skills`를 확인하고 새 대화 또는 Codex 재시작 후 다시 시도합니다.

[교사용 첫 실행 안내](START_HERE.md) · [강사용 운영 안내](docs/facilitator-guide.md)

## Codex가 하는 일

| 요청 | 처리 |
|---|---|
| “Grill me / 새로 시작하자” | 사용자·업무·데이터·권한·제외 범위를 한 질문씩 구체화 |
| “계획대로 시작해” | 합의안을 세 문서로 남기고 작은 작업 묶음부터 구현 |
| “다음 단계 진행해” | 다음 미완료 단계 수행, 실행·검증 근거와 진행 상태 갱신 |
| “지금 어디까지 했어?” | 문서상 진행·차단·다음 행동 보고 |
| “학생도 입력하게 바꾸자” | 권한·데이터·일정 영향을 반영하고 관련 검증 다시 열기 |
| “배포해도 되는지 점검해” | 기록·정적 점검 + 실제 인증/RLS/배포 확인 절차 수행 |
| “오늘 여기까지” | 다음 세션의 재개 지점과 막힌 일을 PLAN에 기록 |

## 교사가 확인할 파일은 세 개

| 파일 | 역할 |
|---|---|
| `AGENTS.md` | AI가 일하는 규칙 |
| `PROJECT.md` | 목적, MVP, 데이터, 권한, 완료 조건 |
| `PLAN.md` | 진행 상태, 검증 근거, 차단 사항, 재개 지점 |

진행을 별도 JSON·여러 체크리스트로 중복 관리하지 않습니다.
완료 표시는 실제 실행 또는 사용자의 확인 근거가 있어야 합니다. 코드를 만든 것과 서비스를 확인한 것은 다릅니다.

## 들어 있는 시작 프로필

**calendar**는 교사 입력·학생 조회 학급 일정, **admissions**는 학생별 면접/실기/논술 일정,
**counseling**은 상담카드, **custom**은 다른 학교 업무입니다.
프로필은 인터뷰 출발안일 뿐입니다. 학생 입력 여부와 공개 범위는 각 교사의 요구대로 확정합니다.
가상 데이터로 시작하며, 개인별 진학/상담 정보는 공개 캘린더에 섞지 않습니다.

## 안전하게 8단계를 유지하는 방법

```text
1 화면 → 2 로컬 실행 → 3 테이블/RLS → 4 DB 연결
→ 5 로그인·역할별 권한 검증 → 6 GitHub → 7 Vercel → 8 공유·운영
```

권한 설계는 인터뷰에서, RLS는 테이블을 만들 때 시작합니다.
4단계 DB 시험에 필요하면 최소 테스트 로그인을 먼저 붙입니다. 5단계는 최종 로그인·권한 검증입니다.
순서를 지키려고 RLS를 끄거나 모든 사람에게 쓰기 권한을 주지 않습니다.

## 로컬 도우미 — 교사가 직접 외우지 않아도 됩니다

Codex가 필요할 때 다음 명령을 실행할 수 있습니다. **앱 폴더** 기준 경로입니다.

```text
node .agents/skills/school-vibe-builder/scripts/harness.mjs init --project "." --name "우리 반 일정" --profile calendar
node .agents/skills/school-vibe-builder/scripts/harness.mjs status --project "."
node .agents/skills/school-vibe-builder/scripts/harness.mjs check --project "." --gate draft
node .agents/skills/school-vibe-builder/scripts/harness.mjs check --project "." --gate prepush
node .agents/skills/school-vibe-builder/scripts/harness.mjs check --project "." --gate release
```

`init`은 초안만 만듭니다. 인터뷰 내용을 AI가 반영해야 합니다. 기존 PROJECT/PLAN이 있으면 중단합니다.
기존 AGENTS가 있으면 별도 제안 파일을 만들고 원본을 보존합니다. 기존 .gitignore/.env.example도 보존합니다.
`status`/`check`는 파일을 수정하지 않습니다. 모든 도우미는 외부 서비스에 접속하거나 배포하지 않습니다.

| 게이트 | 검사하는 범위 |
|---|---|
| `draft` | 문서/작업 ID/완료 근거 형식, 일부 비밀 패턴 |
| `prepush` | 위 검사 + 인터뷰~5단계 완료 기록 + 실제 Git 제외/추적 상태 |
| `release` | 위 검사 + 공유 직전까지 완료 기록. 아직 실행하지 않은 S8.4 공유는 제외 |

**PASS는 보안 인증이 아닙니다.** 비밀 탐지는 일부 패턴뿐이며 Git 전체 과거 이력이나 개인정보를 완전히 탐지하지 않습니다.
RLS 정책의 실제 효과, 인증, 브라우저, 배포 URL은 별도로 시험해야 합니다. 거짓 근거를 식별하는 판정기도 아닙니다.
Node 도우미를 건너뛰지 못하게 강제하는 백그라운드 실행기·Codex 훅은 포함하지 않습니다.

## 설치 방식의 다른 선택

모든 개인 프로젝트에서 쓰려는 경우 이 저장소 루트에서 다음을 실행합니다.

```text
node scripts/install.mjs --user
```

이는 `~/.agents/skills/school-vibe-builder`에 복사합니다. 프로젝트 설치와 중복해서 하지 않습니다.
기존 설치를 덮어쓰지 않습니다. 업데이트는 기존 폴더를 별도 위치에 백업하고 차이를 검토한 뒤 교체합니다.

GitHub에 공개한 뒤에는 Codex 대화에서 다음처럼 설치할 수도 있습니다.
`OWNER/REPO`는 실제로 게시한 저장소로 바꿉니다. 아직 존재하지 않는 주소를 그대로 쓰지 않습니다.

```text
$skill-installer를 사용해 아래 GitHub 경로의 school-vibe-builder 스킬을 설치해줘.
https://github.com/OWNER/REPO/tree/main/skills/school-vibe-builder
```

프로젝트별 설치는 Codex의 `.agents/skills` 로컬 발견 방식을 사용합니다.
공식 형식과 설치 근거는 [출처 문서](skills/school-vibe-builder/references/sources.md)에 정리했습니다.
별도 플러그인 마켓 등록이나 Supabase/Vercel MCP 연결이 필수는 아닙니다.

## GitHub에 배포하기

**ZIP 파일만 올리지 말고 압축을 푼 폴더의 내용을 저장소 루트에 올립니다.**
`README.md`, `scripts/`, `skills/`가 첫 화면에 보여야 합니다.
자세한 게시·버전 태그 절차는 [게시 안내](docs/publishing-guide.md)를 봅니다.

## 패키지 검사

이 하네스 저장소 루트에서 실행합니다. 의존성 설치는 필요 없습니다.

```text
npm test
npm run verify
```

[검증 결과·한계](docs/testing-report.md) · [Codex 리허설 사례](docs/skill-evaluation-cases.md) · [보안 정책](SECURITY.md) · [변경 기록](CHANGELOG.md)

## 배포물 구조

```text
school-vibe-builder/
├── README.md / START_HERE.md / LICENSE
├── AGENTS.md                  # 이 하네스 저장소의 유지보수 지침
├── docs/                      # 강사·게시·검증 안내
├── scripts/                   # 설치·패키지 검사
├── tests/                     # 로컬 자동 테스트
└── skills/school-vibe-builder/
    ├── SKILL.md
    ├── agents/openai.yaml
    ├── scripts/harness.mjs
    ├── references/            # 인터뷰·8단계·보안·문제 해결
    └── assets/                # 앱용 3문서 템플릿과 4개 프로필
```

이 저장소 루트의 AGENTS는 하네스 유지보수용입니다. 앱에 들어갈 AGENTS는 `assets/templates/AGENTS.md`입니다.
실서비스 계정 생성/인증/결제, 학교 데이터 처리 검토, 실제 URL 공유는 사람이 확인해야 합니다.
