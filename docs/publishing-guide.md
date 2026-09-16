# GitHub 게시와 버전 배포

저장소 이름은 dive-school-vibe-builder로 유지해도 됩니다. 제품 이름과 주 스킬은 DIVE Builder/dive-builder입니다.
변경 PR을 검토한 뒤 main에 병합합니다. 브랜치만 생성한 상태는 기본 배포물 업데이트가 아닙니다.

## 게시 전

```text
npm test
npm run verify
```

README.md, scripts/, skills/가 저장소 루트에 있어야 합니다. ZIP 하나만 올리지 않습니다.
숨김 파일 누락을 피하려면 Git으로 커밋하거나 모든 파일을 포함한 패키지로 배포합니다.
템플릿의 gitignore.txt/env-example.txt는 일반 파일로 배포되고 실행 시 숨김 설정 파일로 생성됩니다.
루트 .gitignore/.gitattributes는 그대로 포함해야 합니다.

## 배포

main 병합 후 확인된 커밋에 버전 태그를 붙이고 해당 소스 ZIP을 참가자에게 제공합니다.
이 변경은 태그 생성·릴리스 게시·학교별 앱 배포를 자동 수행하지 않습니다.
참가자는 압축을 풀고 설치 도구로 두 스킬을 함께 설치합니다. 업데이트는 기존 설치를 백업·비교한 뒤 교체합니다.
공식 skill-installer를 사용할 때는 skills/dive-builder와 skills/dive-webapp을 같은 스킬 상위 폴더에 모두 설치합니다.
이전 경로 skills/school-vibe-builder만 설치하는 방식은 더 이상 전체 묶음 설치가 아닙니다.
