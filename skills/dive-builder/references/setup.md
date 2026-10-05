# Node.js·npm·Git 준비부터 돕기

설치를 사용자의 숙제로 넘기지 않는다. 이 문서는 스킬 설치 전 배포물의 SETUP.md에서도 읽는다.
도구 설치를 요청한 사용자의 승인 범위에서 직접 할 수 있는 준비를 이어서 수행한다.
새 기획 인터뷰는 환경 준비가 끝난 뒤 한다. 기존 앱 수정에는 필요한 도구만 확인한다.

## 1. 현재 환경 확인

현재 작업 폴더, OS, 셸, CPU 아키텍처와 기존 앱의 런타임 요구사항을 확인한다.
Windows PowerShell과 WSL/Linux는 서로 다른 설치 환경이다. 현재 Codex 셸과 앱을 실행할 환경을 맞추고 둘을 혼용하지 않는다.

읽기 전용 도우미는 Node.js/Git 없이도 실행할 수 있다. 실제 스킬/배포물 경로로 치환한다.

```powershell
& "CORE_SKILL_DIR/scripts/doctor.ps1" -Webapp
```

```sh
sh "CORE_SKILL_DIR/scripts/doctor.sh" --webapp
```

일반 개발 준비에는 Webapp 옵션을 생략한다. Git은 공유 웹앱/원격 업로드에 필요하며 로컬 범용 도구에는 강요하지 않는다.
도우미 종료 0은 현재 셸의 도구 준비, 1은 설치/버전 확인 필요다. 그 밖의 실행/인자 오류는 출력과 종료 코드를 함께 읽는다. 실제 앱·계정 검증은 아니다.
PowerShell 스크립트 실행 정책으로 도우미가 차단되면 정책을 바꾸지 말고 아래 네이티브 명령을 직접 실행한다.

Windows: `Get-Command node.exe, npm.cmd, git.exe -ErrorAction SilentlyContinue`와 각 실행 파일의 `--version`.
macOS/Linux: `command -v node`, `command -v npm`, `command -v git`와 각 명령의 `--version`.
설치 확인 실패와 PATH에서 못 찾는 경우를 구분한다. 알려진 설치 경로·기존 버전 관리자를 확인하고 중복 설치를 피한다.

스킬 설치 도구의 최소는 Node.js 20이다. 웹앱의 기본 Next.js 경로는 현재 공식 요구사항도 확인한다.
도우미의 웹앱 최소 기준은 20.9이며, 이는 최신 LTS 여부나 모든 프레임워크 호환성을 보장하지 않는다.
새 설치는 [Node.js 공식 다운로드](https://nodejs.org/en/download)의 현재 LTS를 권한다. 특정 패치 버전을 고정하지 않는다.
기존 프로젝트가 특정 버전을 요구하면 그것을 보존한다. 호환되는 기존 Node를 최신이라는 이유만으로 교체하지 않는다.
npm은 Node 설치에 포함된다. npx는 앱 생성 때 같은 설치의 실행 파일을 확인한다.

## 2. Windows 설치 지원

먼저 `Get-Command winget -ErrorAction SilentlyContinue`로 WinGet을 확인한다.
있으면 패키지 ID·발행자·설치 위치·아키텍처를 `winget show`로 확인한다.
실제 필요한 패키지만 하나씩 설치하고 각 종료 코드·출력을 확인한다. 기존 설치가 있으면 업그레이드 정책을 별도로 판단한다.

```powershell
winget show --id OpenJS.NodeJS.LTS --exact --source winget
winget install --id OpenJS.NodeJS.LTS --exact --source winget --interactive --no-upgrade
winget show --id Git.Git --exact --source winget
winget install --id Git.Git --exact --source winget --interactive --no-upgrade
```

설치 대상과 이유를 짧게 알리고 이미 받은 설치 요청 범위에서 진행한다.
설치 프로그램의 약관 동의·관리자 인증은 사용자에게 맡긴다. 약관 자동 수락, 보안 해제, 강제 설치 옵션을 붙이지 않는다.
도구/호스트 정책 때문에 사람이 실행해야 하면 PowerShell 위치 → 필요한 한 명령 → 정상 결과를 알려준다.
권한 오류는 관리자 인증이 가능한지 확인하고, 학교 관리 기기면 담당자가 제공하는 설치 경로를 따른다.

WinGet이 없거나 학교망에서 실패하면 WinGet부터 의무 설치하지 않는다.
Node는 공식 다운로드 페이지에서 **현재 LTS의 Windows Installer**, Git은 [공식 Windows 설치](https://git-scm.com/install/windows)에서 현재 아키텍처의 설치 파일을 선택하도록 돕는다.
Git 설치에서 명령줄·다른 프로그램에서도 Git을 쓸 수 있는 PATH 선택을 확인한다.
Node 설치의 npm/PATH를 유지한다. 첫 웹앱을 위해 별도의 네이티브 빌드 도구·Visual Studio·Python을 추가 설치할 필요는 없다.
다운로드·실행 가능한 단계는 도구로 돕고 설치 화면에서는 어디를 누르는지 한 단계씩 안내한다.

## 3. macOS/Linux 설치 지원

macOS: 이미 사용하는 nvm/fnm/Volta/Homebrew가 있으면 그 경로를 우선한다. 없으면 Node 공식 macOS Installer로 현재 LTS 설치를 돕는다.
Homebrew가 있을 때 Node가 없으면 `brew install node@24` 같은 명령은 현재 LTS·패키지 존재를 다시 확인한 뒤 제안한다.
버전 패키지가 keg-only면 설치 성공과 PATH 연결을 구분한다. 기존 버전 관리자를 덮어쓰는 전역 링크/셸 설정은 자동 적용하지 않는다.
Git이 없으면 [Git 공식 macOS 안내](https://git-scm.com/install/mac)에 따라 기존 Homebrew의 `brew install git` 또는 `xcode-select --install`을 사용한다.
Command Line Tools 설치 창은 사람이 완료하고 다시 확인한다. Homebrew를 설치 전제조건으로 늘리지 않는다.

Linux/WSL: 배포판·기존 버전 관리자와 공식 설치 경로를 확인해 호환 Node와 Git 설치를 돕는다.
배포판의 오래된 Node 패키지가 기준을 충족한다고 가정하지 않는다. 원격 스크립트의 무검토 파이프 실행을 기본값으로 삼지 않는다.
Windows에만 설치된 Node/Git이 WSL에서 준비됐다고 기록하지 않는다.

## 4. 설치 후 PATH·버전 재확인

설치 명령의 종료 0만으로 준비 완료라 하지 않는다. 새 터미널/새 Codex 프로세스에서 node·npm·git 버전과 실행 경로를 확인한다.
이미 켜진 Codex는 설치 전 PATH를 계속 사용할 수 있다. 아직 못 찾으면 Codex를 완전히 종료하고 다시 열도록 안내한다.
같은 폴더·대화에서 “설치했어. 다시 확인하고 이어서 진행해줘”로 재개하게 한다. 다시 설치하는 단계부터 반복하지 않는다.
Windows는 필요하면 프로세스의 PATH를 사용자/머신 PATH에서 다시 읽거나 확인된 설치 경로를 현재 프로세스에만 더할 수 있다.
기존 PATH를 보존한다. 영구 설정을 통째로 교체하거나 `setx PATH`로 잘라 쓰지 않는다.
현재 프로세스에서만 정상이라면 재시작 후 정상도 따로 확인하며, 아직 확인하지 못했으면 완료로 쓰지 않는다.

PowerShell에서 npm.ps1/npx.ps1이 차단되면 같은 설치의 `npm.cmd`/`npx.cmd`를 사용한다.
실행 정책을 완화하거나 관리자 권한으로 Codex를 다시 띄우는 것을 기본 해결책으로 삼지 않는다.
git은 버전만 확인하면 된다. GitHub 로그인·토큰·커밋 작성자 설정은 실제 업로드 단계에서 필요한 만큼 다룬다.

## 5. 스킬 설치와 앱 시작으로 연결

환경이 확인되면 배포물 폴더에서 `node scripts/install.mjs --project "별도 앱 폴더"`를 실행한다.
Git 없이 ZIP으로 받은 배포물에서도 가능하다. 작업 경로는 공백·한글을 고려해 인용하고 임의의 폴더를 지우지 않는다.
이미 스킬이 있으면 [이관 안내](https://github.com/airmang/dive-school-vibe-builder/blob/main/docs/migration-v0.2.md)에 따라 설치된 파일을 백업·비교하도록 안내한다.
앱 폴더를 Codex에서 열도록 안내하고 `$dive-webapp` 또는 `$dive-builder` 시작 문장을 전달한다.
아직 스킬이 발견되지 않으면 경로와 목록을 확인한 뒤 새 대화/재시작으로 이어간다. 설치 완료를 앱 제작 완료로 표시하지 않는다.

웹앱은 `.agents/skills`와 PROJECT/PLAN이 이미 있는 폴더에 create-next-app을 직접 실행하지 않는다.
웹앱 스킬의 첫 앱 생성 절차에 따라 별도 임시 scaffold에서 앱 파일을 검토·병합하거나 현재 폴더에 최소 설정을 직접 작성한다.

## 공식 출처

- [Node.js 다운로드](https://nodejs.org/en/download): 현재 LTS, OS·아키텍처별 설치 파일.
- [Git Windows 설치](https://git-scm.com/install/windows), [Git macOS 설치](https://git-scm.com/install/mac).
- [WinGet install](https://learn.microsoft.com/en-us/windows/package-manager/winget/install), [Node LTS 패키지 매니페스트](https://github.com/microsoft/winget-pkgs/tree/master/manifests/o/OpenJS/NodeJS/LTS).
- [Next.js 설치 요구사항](https://nextjs.org/docs/app/getting-started/installation).

제품의 현재 설치 파일·버전·화면은 실행 시 공식 출처로 다시 확인한다.
