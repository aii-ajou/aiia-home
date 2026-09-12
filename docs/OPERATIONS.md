# 홈페이지 운영 — 관리자용

- 홈페이지: https://aii-ajou.github.io/aiia-home/
- 편집: https://app.pagescms.org/aii-ajou/aiia-content/main
- 코드: `aii-ajou/aiia-home` · 콘텐츠: `aii-ajou/aiia-content` (비공개)

## 최초 연결 (저장소 관리자, 한 번만)

1. [Pages CMS](https://app.pagescms.org/)에 GitHub로 로그인 → `aii-ajou` 조직에 Pages CMS GitHub App 설치 → **aiia-content만** 허용합니다. 저장소 `main`을 열면 한국어 편집 항목이 나옵니다.
2. GitHub **aiia-home → Settings → Pages → Source**를 **GitHub Actions**로 선택합니다.
3. [Fine-grained token](https://github.com/settings/personal-access-tokens/new) 두 개를 만듭니다. Resource owner는 `aii-ajou`, 지정 저장소만 선택하고 아래 권한만 부여합니다. 조직 승인이 표시되면 승인합니다.

   | 토큰                 | 대상 저장소·권한                    | Actions secret을 등록할 곳 |
   | -------------------- | ----------------------------------- | -------------------------- |
   | `CONTENT_READ_TOKEN` | aiia-content · Contents: Read-only  | aiia-home                  |
   | `SITE_DEPLOY_TOKEN`  | aiia-home · Actions: Read and write | aiia-content               |

   등록 위치: 각 저장소 **Settings → Secrets and variables → Actions → New repository secret**. 이름을 위와 동일하게 입력합니다. 토큰은 문서·코드·채팅에 쓰지 않습니다. 만료 전에 같은 secret 값을 교체합니다.

4. 토큰 등록 후 [전환 PR #11](https://github.com/aii-ajou/aiia-home/pull/11)을 `main`에 병합하면 첫 배포가 시작됩니다. 이후 수동 재배포는 **aiia-home → Actions → Deploy GitHub Pages → Run workflow**로 실행합니다.

## 운영자 권한과 관리자 로그인

**이메일로 초대받은 일반 편집자는 다른 편집자를 초대·삭제할 수 없습니다.** 편집자 관리는 **GitHub의 `aiia-content` 저장소에 Write 이상 권한이 있는 계정으로 Pages CMS에 로그인한 사람**이 합니다. Pages CMS 앱에도 해당 저장소 접근이 허용되어 있어야 합니다. 최초 설치자 한 사람에게만 한정되는 권한은 아닙니다. ([공개 구현의 권한 검사](https://github.com/pages-cms/pages-cms/blob/main/lib/authz-server.ts), [초대·삭제 처리](https://github.com/pages-cms/pages-cms/blob/main/lib/actions/collaborator.ts))

운영자로 접속하는 방법:

1. [Pages CMS](https://app.pagescms.org/)를 엽니다. 이미 편집자 이메일로 로그인되어 있다면 먼저 로그아웃합니다.
2. **GitHub 로그인**을 선택하고, `aiia-content`에 Write 이상 권한이 있는 GitHub 계정으로 인증합니다.
3. [aiia-content의 Collaborators 화면](https://app.pagescms.org/aii-ajou/aiia-content/main/collaborators)을 열어 편집자를 초대·삭제합니다.

**운영자를 추가하려면** 저장소 관리자가 GitHub **aiia-content → Settings → Collaborators and teams**에서 해당 GitHub 계정에 Write 이상 권한을 부여합니다. 새 운영자는 위 순서로 로그인합니다. `aiia-home`에만 권한이 있거나, `aiia-content`의 Read 권한만 있는 것으로는 편집자 관리 권한이 충족되지 않습니다.

Collaborators 메뉴가 안 보이거나 접근이 거부되면 **GitHub 로그인 여부 → aiia-content 권한 → Pages CMS 앱의 저장소 접근 허용** 순서로 확인합니다. Pages CMS 서비스 전체를 관리하는 별도 Admin 패널은 홈페이지 편집자 관리에 필요하지 않습니다.

## 편집자 추가·삭제

**글·사진 편집자는 Pages CMS에서 초대합니다. GitHub 저장소의 Settings → Collaborators and teams와는 다른 메뉴입니다.**

| 초대할 사람                      | 초대 위치                                                      | 필요한 계정·권한                |
| -------------------------------- | -------------------------------------------------------------- | ------------------------------- |
| 소식·교수 정보·사진 편집자       | **Pages CMS → aiia-content → main → Collaborators**            | 이메일 초대, GitHub 계정 불필요 |
| 홈페이지 코드 개발자             | **GitHub → aiia-home → Settings → Collaborators and teams**    | GitHub 계정, Write 권한         |
| 편집자 초대·삭제를 담당할 운영자 | **GitHub → aiia-content → Settings → Collaborators and teams** | GitHub 계정, Write 이상 권한    |

편집자 초대 순서:

1. 관리자가 [Pages CMS 편집자 관리](https://app.pagescms.org/aii-ajou/aiia-content/main/collaborators)에 접속합니다. 주소가 **app.pagescms.org**인지 확인합니다.
2. 편집자의 **이메일 주소**로 초대하고, 아래 안내 문구를 함께 전달합니다. 편집자는 받은 초대 메일을 통해 접속합니다.
3. 담당자가 바뀌면 같은 Pages CMS 화면에서 기존 편집자를 제거하고 새 담당자를 초대합니다.

콘텐츠 편집만 하는 사람을 GitHub 협업자로 추가할 필요는 없습니다. 실제 콘텐츠를 내려받아야 하는 **개발자에게만** GitHub `aiia-content`의 Read 권한도 부여합니다.

## 편집자에게 보낼 안내 문구

초대 후 아래 문구를 복사해 이메일이나 메신저로 전달합니다.

> 아주대학교 인공지능연구원 홈페이지 편집자로 초대했습니다. Pages CMS에서 받은 초대 메일을 열어 인증을 완료해 주세요.
>
> **인증 후 콘텐츠 편집 주소:** https://app.pagescms.org/aii-ajou/aiia-content/main
>
> 이후에도 위 주소로 접속해 **초대받은 이메일 주소로 로그인**하면 됩니다. GitHub 계정은 필요하지 않습니다. 주소를 즐겨찾기에 등록해 주세요.
>
> 소식·연구자 정보·페이지 문구·사진을 수정한 뒤 **Save**를 누르세요. 소식과 연구자 항목은 작업 중에는 **임시저장**, 공개하려면 **게시** 상태로 저장합니다. 이미 게시된 내용의 수정도 저장하면 자동 배포 대상이 되며, 배포가 완료된 뒤 홈페이지에 반영됩니다.
>
> 홈페이지(https://aii-ajou.github.io/aiia-home/) 맨 아래 **관리자** 링크를 통해서도 편집 화면으로 이동할 수 있습니다. 접속 권한이 없다고 나오면 초대받은 이메일로 로그인했는지 확인하고, 계속 안 되면 초대한 관리자에게 문의해 주세요.

## 글·사진 수정

1. 홈페이지 하단 **관리자** → 원하는 편집 항목을 선택합니다.
2. 소식은 제목·날짜·요약·원문 주소, 연구자는 사진·소속·연구 분야를 입력합니다.
3. 작업 중에는 **임시저장**, 공개하려면 **게시**를 선택하고 **Save**합니다. 숨기려면 **보관**으로 저장합니다. 임시저장도 비공개 콘텐츠 저장소에는 저장됩니다.
4. 저장 → GitHub 변경 → 자동 배포 완료 후 공개됩니다. 연속 저장은 최신 내용을 묶어 배포할 수 있습니다. 게시된 글 수정도 저장 즉시 배포 대상입니다.

사진은 연구자 4:5 세로형, 소식은 가로형을 권장합니다. 새 항목의 파일명은 영문·숫자·하이픈으로 정하고, 만든 뒤 바꾸지 않습니다. 현재 날짜를 바꿔 미래 날짜로 입력해도 예약 게시되지는 않습니다.

**협력 문의 설명 수정:** Pages CMS → **협력 문의 → 협력 유형**에서 각 항목의 **유형**(제목)과 **협력 방식 설명**을 수정하고 **Save**합니다. 홈페이지에서 항목을 누르면 설명이 펼쳐지며 줄바꿈도 유지됩니다. 설명을 비우면 제목만 표시합니다. 항목 추가·삭제·순서 변경도 이 목록에서 할 수 있습니다.

## 저장했는데 반영되지 않을 때

1. 게시 상태가 **게시**인지 확인합니다.
2. `aiia-content`의 **Actions → Update AIIA website**가 성공했는지 확인합니다. 이는 배포 요청 성공이며, 실제 공개 여부는 다음 단계에서 확인합니다.
3. `aiia-home`의 **Actions → Deploy GitHub Pages**를 확인합니다. 토큰 만료·권한 또는 콘텐츠 입력 오류를 고친 뒤 **Run workflow**로 재배포합니다. 빌드 실패 시 기존 홈페이지가 유지됩니다.
4. 잘못 올린 내용은 CMS에서 고쳐 저장합니다. 이전 버전 전체 복구는 개발자가 콘텐츠 저장소의 해당 변경을 revert한 뒤 배포합니다.

연속 저장 중 이전 실행이 **cancelled**로 표시되는 것은 최신 배포로 교체된 정상 동작입니다. 가장 최근 실행의 결과를 확인하세요. **failure**는 실제 실패이며, 실패한 단계의 로그를 개발자에게 전달하면 됩니다. 저장된 콘텐츠는 유지되므로 같은 내용을 다시 입력할 필요는 없습니다.

## 나중에 도메인을 연결할 때

개발자가 GitHub Pages의 Custom domain·DNS·HTTPS를 설정하고, 사이트 주소와 base 경로를 함께 변경합니다. 자체 서버로 옮기면 배포 대상만 변경하며 CMS와 콘텐츠 저장소는 그대로 사용할 수 있습니다.

공식 안내: [Pages CMS 시작](https://pagescms.org/docs/quick-start/) · [편집자 초대](https://pagescms.org/docs/configuration/collaborators/)
