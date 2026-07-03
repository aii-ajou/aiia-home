# aiia-home

**아주대학교 인공지능연구원(AIIA) 홈페이지** — 완전 정적(Astro SSG) 사이트.
콘텐츠는 저장소 안 `src/content/`(git)에 있고, 편집은 `/admin`(Decap CMS, 한국어 UI)에서
폼으로 한다. **저장 = 커밋 → CI 빌드 → 배포**이며, 공개 서빙에 필요한 것은 정적 파일과
웹서버(nginx)뿐이다. 상세 설계는 `docs/PRD.md`, 미룬 작업은 `docs/BACKLOG.md`.

## 로컬 개발

```bash
nvm use            # Node 22
npm install
npm run dev        # http://localhost:4321
```

관리 UI 까지 로컬에서 써보려면 (로그인 없이 로컬 파일 직접 편집):

```bash
npm run admin:local   # decap-server (별도 터미널)
# 브라우저: http://localhost:4321/admin/index.html
```

품질 게이트: `npm run check`(0 errors) · `npm run build`(green) · `npm audit`(0) —
CI(`.github/workflows/ci.yml`)가 PR 마다 강제한다.

## 콘텐츠 편집 (편집자)

- 운영: `사이트주소/admin` → GitHub 로그인 → 폼 편집 → 저장하면 몇 분 내 사이트 반영.
- 모든 변경은 편집자 명의의 git 커밋으로 기록된다 — 이력·롤백은 git 이 담당(별도 백업 불필요).
- 강조색은 디자인 토큰 드롭다운만 제공된다(원시 색상 입력 불가 — 다크모드/브랜드 규정 유지).

## 배포

- `main` push → `.github/workflows/deploy.yml` 이 검증(astro check)·빌드 후 배포.
  빌드가 실패하면 배포가 생략되고 사이트는 이전 버전을 유지한다.
- 현재 대상: **GitHub Pages**(임시 공개 호스팅). 리포 Settings → Pages → Source 를
  "GitHub Actions" 로 설정(1회).
- 대학 서버 전환: deploy 잡을 rsync 로 교체(워크플로 주석 참조) + 편집자 로그인용 OAuth
  릴레이 배치(`infra/oauth-relay/README.md`).

## 저장소 구조

| 경로 | 역할 |
|---|---|
| `src/content/` | 콘텐츠 정본(싱글톤 JSON 6 + 목록 폴더 5) |
| `src/content.config.ts` | 콘텐츠 zod 스키마(빌드 타임 검증) — `public/admin/config.yml` 과 동기 유지 |
| `src/lib/content/` | 데이터 접근 계층(view 정규화, accent 키→CSS 토큰 브리지) |
| `src/components/`, `src/layouts/` | 섹션 컴포넌트/페이지 셸 — 디자인 시스템 **동결** |
| `src/styles/` | 디자인 토큰(`aiia-tokens.css`) + 전역 스타일(`global.css`) — **동결** |
| `public/admin/` | Decap CMS 관리 UI(정적) |
| `public/uploads/` | 편집자 업로드 미디어(커밋됨) |
| `infra/oauth-relay/` | 편집자 GitHub 로그인 릴레이(의존성 0) |
| `docs/` | PRD(v2)·백로그 |
