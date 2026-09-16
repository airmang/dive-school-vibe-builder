# GitHub 게시·배포 안내

## 이 ZIP을 저장소로 올리기

압축을 풀고 `README.md`가 있는 폴더를 저장소 루트로 사용한다.
ZIP 파일 하나만 업로드하면 스킬 경로를 직접 설치할 수 없다.
숨김 파일인 `.gitignore`와 `.gitattributes`도 포함한다.

GitHub에서 새 빈 저장소를 만든 다음 로컬에서 다음 순서로 진행할 수 있다.
`OWNER/REPO`는 본인의 실제 주소로 바꾼다. 이미 Git이 있으면 `git init`/remote 추가를 반복하지 말고 먼저 상태를 확인한다.

```text
git init
git add .
git status
```

커밋 대상에 의도한 패키지 파일만 있는지 확인한 뒤 진행한다.

```text
git commit -m "Release School Vibe Builder 0.1.0"
git branch -M main
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
```

이 명령은 사용자가 실행한다. 패키지의 설치/점검 도우미는 자동으로 GitHub에 접속하거나 push하지 않는다.
`package.json`의 `private: true`는 npm 게시를 막는 설정이며 GitHub 공개 여부와 다르다.

## 연수 참가자에게 공유할 안내

```text
저장소의 Code → Download ZIP으로 받거나 Git으로 복제하세요.
README가 있는 폴더에서 아래를 실행하세요.
node scripts/install.mjs --project "../my-class-app"
그다음 my-class-app을 Codex 작업 폴더로 열고 $school-vibe-builder를 호출하세요.
```

각자의 앱은 **별도 저장소**에 만든다. 참가자의 앱/학생 자료를 이 하네스 저장소에 커밋하지 않는다.
Codex에 기본 skill-installer가 있는 환경에서는 대화로 설치할 수 있다.

```text
$skill-installer를 사용해서 아래 경로의 스킬을 설치해줘.
https://github.com/OWNER/REPO/tree/main/skills/school-vibe-builder
```

이것은 PowerShell 명령이 아니다. 설치 뒤 `/skills`에서 확인하고, 안 보이면 새 대화/재시작으로 확인한다.
CLI 설치 경로와 프로젝트 복사를 중복 사용하지 않는다.

## 버전 고정

연수 도중 main이 바뀌는 문제를 줄이려면 테스트한 커밋에 태그를 붙인다.

```text
git tag v0.1.0
git push origin v0.1.0
```

태그를 실제 게시한 후에는 설치 경로의 `main` 대신 `v0.1.0`을 쓸 수 있다.
태그/게시를 도구가 이미 수행했다고 간주하지 않는다.

## 사용자 맞춤 수정 지점

| 목적 | 수정할 파일 |
|---|---|
| 인터뷰 질문/수업 흐름 | `skills/school-vibe-builder/SKILL.md`, `references/interview.md` |
| 세 문서 서식 | `skills/school-vibe-builder/assets/templates/` |
| 다른 학교 업무 예제 | `skills/school-vibe-builder/assets/profiles/`, `references/profiles.md` |
| 새 필수 단계 | PLAN 템플릿과 `scripts/harness.mjs`의 REQUIRED_TASKS를 함께 수정 |
| 강사 안내 | `START_HERE.md`, `docs/facilitator-guide.md` |

새 프로필 코드를 추가하면 harness.mjs의 프로필 허용 목록과 테스트도 수정한다.
이름/스킬 ID를 바꾸면 SKILL.md·폴더명·UI 메타데이터·설치 경로·테스트를 함께 바꾼다.
라이선스는 MIT다. 저작권 표기는 배포 주체에 맞게 검토해 유지한다.

## 배포 전 검사

```text
npm test
npm run verify
```

실제 Codex에서 새 앱 폴더 하나를 만들어 인터뷰→문서 생성→이어하기까지 연수 전 리허설한다.
상담카드 실운영은 별도의 개인정보/보안 검토가 끝난 뒤 진행한다.
