# 공식 출처와 적용 범위

확인일: 2026-09-16. 아래는 기술 구조의 근거다. 메뉴 위치·플랜·SDK API는 실행 시 재확인한다.
이 패키지는 OpenAI, Supabase, Vercel의 공식 제품 또는 공식 검증 배포물이 아니다.
문서 본문·코드는 독자적으로 작성했다. 특정 외부 스킬 코드를 복사한 패키지가 아니다.

| ID | 공식 자료 | 이 패키지에서 확인한 내용 |
|---|---|---|
| S1 | [OpenAI — Build skills](https://learn.chatgpt.com/docs/build-skills) | SKILL.md, `.agents/skills`, 사용자 범위, 호출, optional metadata |
| S2 | [OpenAI — AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | 프로젝트 지침 발견과 병합 범위 |
| S3 | [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | 행 정책, grants, 역할별 테스트, 관리자 권한 구분 |
| S4 | [Supabase — API keys](https://supabase.com/docs/guides/getting-started/api-keys) | 공개용 키와 서버 전용 키의 역할 구분 |
| S5 | [Supabase — SSR client](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) | Next.js 연결, 환경변수, 인증 검증과 캐시 주의 |
| S6 | [Supabase — Google login](https://supabase.com/docs/guides/auth/social-login/auth-google) | OAuth 설정 흐름 |
| S7 | [Supabase — Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) | Site URL과 허용 리다이렉트 |
| S8 | [Vercel — Git deployments](https://vercel.com/docs/git) | 연결 저장소 변경과 자동 배포 |
| S9 | [Vercel — Environment variables](https://vercel.com/docs/environment-variables) | 환경별 변수 관리 |
| S10 | [Next.js — Installation](https://nextjs.org/docs/app/getting-started/installation) | 현재 실행 환경과 초기 구성 |
| S11 | [OpenAI — skill-installer](https://github.com/openai/skills/blob/main/skills/.system/skill-installer/SKILL.md) | 저장소/경로 기반 스킬 설치 |
| S12 | [OpenAI — skill-creator](https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md) | 스킬과 references/assets/scripts의 분리 |

## 호환성 선택

기본 설치는 S1의 프로젝트별 `.agents/skills/`를 사용한다.
S11의 설치기는 환경에 따라 `$CODEX_HOME/skills`에 설치할 수 있다. 이 패키지는 두 경로를 혼합해 복제 설치하지 않는다.
`$skill-installer`는 Codex 대화에서 쓰는 지시이며 PowerShell 명령이 아니다.
사용자 폴더 전체 설정을 수정하거나 승인 정책을 자동 변경하지 않는다.

## 검증의 한계

패키지의 Node 도우미는 로컬에서 테스트한다. 호스팅 계정·실제 Codex 세션·학교 네트워크·학생 계정·클라우드 DB를 연결한 전체 실증은 별도다.
학교 개인정보 처리의 법적 적합성은 이 자료로 판단하지 않는다. 실제 운영은 학교의 해당 절차를 따른다.
