# v0.1 → v0.2 전환

## 먼저 보존

기존 앱의 PROJECT.md/PLAN.md/AGENTS.md와 사용자가 바꾼 파일은 그대로 둡니다.
기존 .agents/skills/school-vibe-builder 폴더는 스킬 검색 경로 밖의 별도 위치에 백업합니다.
프로젝트별 설치 외에 사용자 전역 설치도 있다면 중복 여부를 확인합니다. 설치 도구가 자동 삭제하지 않습니다.

## 새 묶음 설치

새 배포물 폴더에서 실행합니다.

```text
node scripts/install.mjs --project "기존 프로젝트 경로"
```

이미 있는 스킬은 덮어쓰지 않으므로 새 버전 재설치 때도 같은 백업·비교 절차를 따릅니다.
하네스 버전 갱신과 앱 계획 변경은 별개입니다. 설치만으로 앱 코드·DB·계획이 바뀌지 않습니다.

## 기존 계획 이어가기

Codex에 다음처럼 요청합니다.

```text
$dive-builder로 기존 프로젝트를 읽어줘.
v0.1 계획과 완료 근거, 내 파일 수정은 보존하고 v0.2로 이어갈 수 있게 정리해줘.
기존 공유 웹앱은 웹앱 모드로 유지해줘. 처음부터 다시 만들지 마.
```

status는 구 계획을 legacy-or-unknown으로 읽습니다. check는 새 메타데이터가 없으면 명시적 전환을 요구합니다.
웹앱을 계속한다면 PLAN 머리에 DIVE_MODE: webapp, DIVE_DATA, DIVE_AUTH, PLAN_APPROVAL을 현재 사실에 맞게 추가합니다.
데이터는 undecided/none/supabase/other, 인증은 undecided/none/required, 합의는 pending/approved입니다.
기존 완료 근거를 승인되었다고 추정하거나 새 코드의 증거로 자동 재사용하지 않습니다.
공통 가이드에 따라 현재 상태를 대조하고 변경으로 무효가 된 검증을 다시 엽니다.

이전 `$school-vibe-builder` 이름과 scripts/harness.mjs 경로는 새 묶음에서도 호환 진입점으로 남아 있습니다.
구 별칭만 단독 설치하면 공통/웹앱 스킬을 사용할 수 없으므로 묶음 설치를 사용합니다.
