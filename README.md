# AIIA 홈페이지

Astro 정적 홈페이지. 코드는 **aii-ajou/aiia-home**, 운영 콘텐츠·사진은 별도 비공개 **aii-ajou/aiia-content** 저장소에서 관리합니다. 홈페이지 `/admin/`은 Pages CMS 편집 화면으로 연결합니다.

**관리자:** [간단 운영 안내](docs/OPERATIONS.md) — 최초 연결, 편집자 초대, 저장·배포, 장애 대응.

## 개발 시작

Node.js 22.12 이상을 사용합니다 (`nvm use`).

```bash
npm ci
npm run dev
```

새 clone에서는 샘플 콘텐츠로 실행됩니다. GitHub 인증이나 운영 콘텐츠 접근 권한이 필요 없습니다. 생성되는 `src/content/`, `public/uploads/`는 Git에서 제외됩니다. 기존 Git 이력의 콘텐츠는 보존하며, 이후 운영 변경은 코드 저장소로 동기화하지 않습니다.

## 실제 콘텐츠로 확인 (권한이 있는 개발자만)

```bash
npm run content:fetch  # gh + Git 인증 필요: 별도 저장소 clone/pull 후 선택
npm run dev
```

직접 clone한 콘텐츠 폴더는 `npm run content:use -- /path/to/aiia-content`로 선택할 수 있습니다. `npm run content:sample`로 샘플로 돌아갑니다. 선택은 이 컴퓨터에만 저장되며, 바꾼 뒤 개발 서버를 다시 시작합니다. 원본 콘텐츠 변경 후에도 dev 서버를 다시 시작해 다시 복사합니다. 생성 폴더를 직접 수정하지 않습니다.

## 검증

```bash
npm run test:content
npm run check
npm run test:e2e       # 빌드·내부 링크·브라우저 검사
npm run test:pages     # /aiia-home/ 경로에서 같은 검사
```

브라우저 최초 설치: `npx playwright install --with-deps chromium`.
PR 검사는 샘플만 사용합니다. 운영 배포는 `AIIA_CONTENT_SOURCE=.content-repository`, `AIIA_REQUIRE_CONTENT=true`로 실행하며 운영 콘텐츠가 없거나 형식이 틀리면 중단합니다. 샘플로 자동 대체해 배포하지 않습니다.

## 주요 파일

| 파일                           | 역할                                        |
| ------------------------------ | ------------------------------------------- |
| `content-source.json`          | 콘텐츠 저장소·브랜치·형식 버전              |
| `src/content.config.ts`        | 콘텐츠 형식 검사                            |
| `fixtures/`                    | 개발용 샘플과 그림                          |
| `cms/pages.yml`                | 콘텐츠 저장소 `.pages.yml`의 기준 설정      |
| `cms/publish-site.yml`         | 콘텐츠 저장소의 배포 요청 workflow 기준     |
| `scripts/prepare-content.mjs`  | 선택한 원본을 작업 폴더로 복사              |
| `.github/workflows/deploy.yml` | 운영 콘텐츠 결합 → 검사 → GitHub Pages 배포 |

필드를 바꾸면 스키마, 샘플, CMS 설정을 함께 수정하고 **콘텐츠 저장소의 `.pages.yml`에도 반영**합니다. 기존 콘텐츠와 호환되지 않는 변경은 양쪽의 `content-manifest.json`/`content-source.json` 형식 버전과 데이터를 함께 이전합니다. JSON 문법·누락 파일은 준비 단계, 상세 필드는 Astro 빌드가 검사합니다.

Pages CMS의 두 가지 연결용 token은 운영 문서의 최소 권한으로만 발급합니다. PR에서 비공개 콘텐츠나 해당 token을 사용하지 않습니다. 배포 결과에는 콘텐츠 JSON 원본과 인증정보를 포함하지 않습니다.
