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

4. **aiia-home → Actions → Deploy GitHub Pages → Run workflow**를 실행해 첫 배포를 확인합니다.

## 편집자 추가·삭제

- **글·사진 담당자:** Pages CMS의 `aiia-content / main`에서 **Collaborators** → 이메일 초대. GitHub 계정은 필요 없습니다. 담당자가 바뀌면 같은 화면에서 제거합니다.
- **개발자:** GitHub `aiia-home` → **Settings → Collaborators and teams**에서 Write 권한으로 초대합니다. 실제 콘텐츠를 내려받아야 하는 개발자에게만 `aiia-content` Read 권한도 줍니다.

## 글·사진 수정

1. 홈페이지 하단 **관리자** → 원하는 편집 항목을 선택합니다.
2. 소식은 제목·날짜·요약·원문 주소, 연구자는 사진·소속·연구 분야를 입력합니다.
3. 작업 중에는 **임시저장**, 공개하려면 **게시**를 선택하고 **Save**합니다. 숨기려면 **보관**으로 저장합니다. 임시저장도 비공개 콘텐츠 저장소에는 저장됩니다.
4. 저장 → GitHub 변경 → 자동 배포 완료 후 공개됩니다. 연속 저장은 최신 내용을 묶어 배포할 수 있습니다. 게시된 글 수정도 저장 즉시 배포 대상입니다.

사진은 연구자 4:5 세로형, 소식은 가로형을 권장합니다. 새 항목의 파일명은 영문·숫자·하이픈으로 정하고, 만든 뒤 바꾸지 않습니다. 현재 날짜를 바꿔 미래 날짜로 입력해도 예약 게시되지는 않습니다.

## 저장했는데 반영되지 않을 때

1. 게시 상태가 **게시**인지 확인합니다.
2. `aiia-content`의 **Actions → Update AIIA website**가 성공했는지 확인합니다. 이는 배포 요청 성공이며, 실제 공개 여부는 다음 단계에서 확인합니다.
3. `aiia-home`의 **Actions → Deploy GitHub Pages**를 확인합니다. 토큰 만료·권한 또는 콘텐츠 입력 오류를 고친 뒤 **Run workflow**로 재배포합니다. 빌드 실패 시 기존 홈페이지가 유지됩니다.
4. 잘못 올린 내용은 CMS에서 고쳐 저장합니다. 이전 버전 전체 복구는 개발자가 콘텐츠 저장소의 해당 변경을 revert한 뒤 배포합니다.

## 나중에 도메인을 연결할 때

개발자가 GitHub Pages의 Custom domain·DNS·HTTPS를 설정하고, 사이트 주소와 base 경로를 함께 변경합니다. 자체 서버로 옮기면 배포 대상만 변경하며 CMS와 콘텐츠 저장소는 그대로 사용할 수 있습니다.

공식 안내: [Pages CMS 시작](https://pagescms.org/docs/quick-start/) · [편집자 초대](https://pagescms.org/docs/configuration/collaborators/)
