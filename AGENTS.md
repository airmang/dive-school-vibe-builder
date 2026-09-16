# 이 저장소의 유지보수 지침

이 저장소는 `school-vibe-builder` 스킬 배포물이며 학교 앱 자체가 아니다.
사용자가 별도 앱 개발을 요청하면 별도 앱 폴더에 `scripts/install.mjs`로 설치하도록 한다.
이 저장소 루트에 Next.js 앱을 생성하거나 앱용 PROJECT/PLAN을 만들지 않는다.
앱에 생성할 지침은 `skills/school-vibe-builder/assets/templates/AGENTS.md`다.

스킬 본문은 간결하게 유지하고 상세 절차는 references, 생성할 문서는 assets에 둔다.
Node 도우미에는 외부 패키지, 원격 실행, 자동 승인, 클라우드 API 호출을 추가하지 않는다.
초기화/설치에서 기존 파일을 덮어쓰거나 심볼릭 링크를 따라 쓰지 않는다.
문서/정적 검사를 실제 서비스 보안 검증이라고 부르지 않는다.
변경 후 `npm test`와 `npm run verify`를 실행한다.
미실행 Codex/클라우드 실증을 테스트 결과에 추가하지 않는다.
