# HRIS (최종) · React + TypeScript
## 실행

Node.js 20 이상 권장.

```bash
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell은 `Copy-Item .env.example .env`를 사용합니다. 브라우저 주소는 `http://localhost:5173`입니다.

### 백엔드 주소

`.env` 파일:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_BACKEND_ORIGIN=http://localhost:8080
```

Flask가 `5000` 포트에서 실행된다면 `VITE_BACKEND_ORIGIN=http://localhost:5000`으로 변경하세요. **변경 후 Vite를 재시작**해야 프록시 설정이 반영됩니다.

Vite가 `/api/*`를 Flask로 프록시하기 때문에 로컬 개발 중에는 브라우저의 별도 크로스 오리진 요청을 피합니다. 배포(Vercel)에서도 같은 방식으로 `/api/v1/*`를 백엔드로 전달하므로 CORS나 쿠키 설정을 바꿀 필요가 없습니다.

## 배포 (Vercel)

`main`에 병합하면 Vercel이 자동으로 배포하고, PR마다 미리보기 주소가 생깁니다.

- `vercel.json`: Vite 빌드(`npm ci`, `npm run build`, `dist`), 함수 리전 서울(`icn1`), `/api/v1/*`를 `api/proxy.js`로 보내는 설정
- `api/proxy.js`: Vercel Function. 브라우저 요청을 백엔드로 그대로 전달합니다(쿠키, CSRF 헤더, 본문, PDF 파일 포함). 브라우저는 HTTPS인 Vercel 주소만 사용하므로 백엔드가 HTTP여도 혼합 콘텐츠로 막히지 않습니다.
- **환경 변수 `BACKEND_ORIGIN`** (Vercel 프로젝트 Settings → Environment Variables, Production과 Preview): 백엔드 주소. 예: `http://서버주소:8080`. 서버 주소는 저장소에 넣지 않습니다.
  - 설정하지 않으면 API가 `BACKEND_NOT_CONFIGURED`(503), 백엔드에 연결하지 못하면 `BACKEND_UNREACHABLE`(502)로 응답합니다.
  - 값을 바꾼 뒤에는 Deployments에서 Redeploy해야 반영됩니다.

처음 연결하는 방법: vercel.com에 GitHub 계정으로 로그인 → Add New → Project → Import Git Repository에서 `KNU-DB-HRIS/Frontend` 선택(목록에 없으면 GitHub App 권한에서 조직 저장소 허용) → Environment Variables에 `BACKEND_ORIGIN` 입력 → Deploy.

## Figma 디자인 기준

- 대상 Figma 파일: `HRIS(최종)`
- 주요 참조 프레임: 로그인 `1:1244`, 대시보드 `2002:2112`, 인사관리 `1:2`, 급여관리 `3:1996`, 조직관리 `3:785`, 평가관리 `2003:6387`, 전자문서 `7:2435`
- 원본에서 확인한 색상: 사이드바 `#060B1E`, 활성 메뉴 `#15B9DC`, 메인 배경 `#F8FAFD`, 카드 `#FFFFFF`, 검색 영역 `#F1F4F9`, 테두리 `#E7EBF2`, 주요 글자 `#101728`
- 원본 폰트: Noto Sans KR
- 구성: 좌측 네이비 사이드바, 청록색 메뉴 선택, 상단 통합 검색 및 버튼, 사이드바 HR AI, 사용자 카드, 4개 대시보드 지표, 그래프/일정/활동/월간 요약
- 인사/급여: 표 + 오른쪽 상세 패널
- 조직관리: 상단 기능 카드 + 청록색 탭 + 회사 기본정보 편집/미리보기
- 평가관리: 지표 4개 + 평가 진행률 도넛 + 등급 분포 + 평가 대상자 목록
- 전자문서: 청록색 탭 + 결재 문서 목록 + 우측 증명서 발급 바로가기

디자인 오버라이드는 `src/styles/figma.css`에 분리했습니다. 원본의 치수/색상을 최대한 반영하되, 반응형 재배치와 동적 데이터에 따라 일부 배치는 달라질 수 있습니다. 아이콘은 Lucide React로 재현했으므로 원본 Figma SVG와 완전 동일하지는 않습니다.

## 반응형

- 데스크톱: 원본과 유사한 고정 사이드바, 표+상세 패널, 다중열 카드
- 1140px 이하: 대시보드/평가/상세 패널 재배치
- 820px 이하: 사이드바 오버레이/햄버거 메뉴, 상단 검색 축소
- 600px 이하: 주요 카드 2열 또는 단일열, 필터 접힘, 표 가로 스크롤, 모달 하단 시트

## 연동 기능

| 영역 | API 및 동작 |
|---|---|
| 인증 | `/auth/login`, `/auth/me`, `/auth/logout`, 쿠키 세션, CSRF |
| 대시보드 | `/dashboard`, `/events`, `/activities`의 원본 집계 표시 |
| 통합 검색 | `/search` |
| 인사관리 | `/employees`, 등록/상세/수정/삭제, 인사 발령 및 퇴사 |
| 급여관리 | `/salaries`, 현재 급여 구성, 급여 변경 이력 |
| 조직관리 | `/company`, `/company/logo`, `/departments`, `/positions`, `/jobs`, `/job-titles`, `/organization/headcounts` |
| 평가관리 | `/evaluation-periods`, `/evaluation-periods/{id}/summary`, `/evaluation-periods/{id}/participants` |
| 전자결재 | `/approvals`, `/approvals/summary`, 상세, 작성/임시저장/상신/승인/반려 |
| 문서 발급 | `/certificates`, `/certificates/payslip`, `/certificates/withholding`, PDF 다운로드 |
| HR AI | `/ai/queries` 응답 출력. 생성 SQL은 프론트에서 실행하지 않음 |

노션에서 **보류** 상태인 SAL-04 급여 변경 등록, EVAL-04 평가 제출 기능은 구현하지 않았습니다. Figma의 **Invite 및 알림 벨** 역시 API가 없어 실행할 수 없는 시각 요소로만 표시했습니다. 권한 검사는 메뉴 노출만이 아니라 **Flask 백엔드에서도 반드시** 수행해야 합니다.

## HTTP 500 / 502 오류

최초 `GET /api/v1/auth/me`는 미로그인 상태에서 **401**을 반환해야 로그인 화면으로 이동합니다.

```bash
curl -i http://localhost:8080/api/v1/auth/me
```

- `401`: 정상적인 비로그인 상태
- `500`: Flask 또는 DB 처리 중 오류 — Flask 터미널의 스택 트레이스 확인
- `502 BACKEND_UNREACHABLE`: Vite 프록시가 Flask에 연결하지 못함 — 포트/주소 확인
- `404`: API prefix 또는 백엔드 라우트 미구현

프론트는 API 결과가 없을 때 임의 숫자나 데이터를 채우지 않습니다.

## 구조

```text
src/
  App.tsx
  main.tsx
  components/
    Shell.tsx
    UI.tsx
  pages/
    Dashboard.tsx
    Employees.tsx
    Payroll.tsx
    Organization.tsx
    Evaluation.tsx
    Approvals.tsx
    Documents.tsx
    HrAi.tsx
  lib/
    api.ts
    format.ts
    hooks.ts
    types.ts
  styles/
    global.css
    figma.css
```

## 검증 범위

TypeScript/TSX 구문 파싱과 CSS 파싱을 수행합니다. 현재 작업 환경에서는 npm 패키지 레지스트리에 접속할 수 없어 Vite 프로덕션 빌드와 실행 중 Flask 백엔드 통합 테스트를 수행하지 못했습니다. 패키지 설치가 가능한 환경에서 `npm run build`로 최종 검증하세요.

## 구현 대상 (HRIS 최종 Figma)

[HRIS(최종) — #전체적인 흐름](https://www.figma.com/design/jpcDN9e1nKpYYTTynqMWRZ/HRIS--%EC%B5%9C%EC%A2%85-?node-id=1-1238)

- **구현:** 로그인, 대시보드, 인사관리, 급여관리, 조직관리, 평가관리, 전자문서와 이 화면들에서 열리는 실제 세부 뷰/모달.
- **세부 뷰:** 직원 등록, 인사발령/퇴사/상세, 급여 상세 및 추이, 조직의 부서·직급·직책·직무 좌측 목록/우측 편집, 조직별 인원조회, 결재 단계 현황, 문서 발급 및 접근 권한 안내.
- **제외:** Figma 캔버스에서 시안 위에 놓인 **1920×50의 제목/구분용 프레임**과 흐름을 설명하는 화살표·주석. 실제 웹의 상단 검색 헤더는 화면 디자인의 일부이므로 유지합니다.
- **API:** 모든 수치와 목록 및 쓰기 요청은 Flask `/api/v1/*`를 호출합니다. `localStorage` 더미 데이터나 가짜 성공 응답을 사용하지 않습니다. 명세에서 보류된 SAL-04/EVAL-04는 구현된 API인 것처럼 사용하지 않습니다. `Invite`·알림은 연결 API가 없어 비활성화했습니다.
- **디자인:** Figma 색상 `#060B1E`(네이비), `#15B9DC`(청록), `#F8FAFD`(캔버스), `#F1F4F9`(검색), `#E7EBF2`(구분선) 사용. 고정 가로 캔버스/상단 시안 라벨/화살표는 웹에 렌더링하지 않습니다.

## 반응형 및 브라우저 확대·축소

`src/styles/responsive.css`는 기존 Figma CSS 다음에 로드됩니다.

- PC: 사이드바 + 목록/우측 상세 2열, 대시보드 여러 열
- 폭이 줄어들거나 확대된 상태: 콘텐츠 너비 기반 **CSS Container Query**로 2열을 1열로, 지표 4개를 2개/1개 열로 변경
- 820px 이하: 사이드바를 오버레이 메뉴로 변경
- 600px 이하: 직원 등록·수정 등 모달을 스크롤 가능한 하단 시트로 표시
- 긴 테이블: 문서 전체가 아니라 표 영역 안에서 가로 스크롤
- 320px~1920px의 **CSS 뷰포트 폭**에서 로그인·인사 레이아웃의 불필요한 문서 가로 넘침을 브라우저 테스트로 점검했습니다. CSS 뷰포트 변화는 확대·축소 상태를 근사하지만 실제 배율별 모든 브라우저/모든 화면의 시각적 일치를 입증하는 검증은 아닙니다.

### 검증 안내

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Chrome/Firefox에서 75%, 100%, 125%, 150%, 200% 확대/축소를 확인하세요. 앱 서버가 구동 중이어야 사용자 로그인이 가능하고 실제 데이터 화면이 표시됩니다. 현재 제공 환경에서는 npm 설치가 지연되어 전체 프로덕션 빌드 및 Flask 통합 테스트는 실행하지 못했습니다. 작성한 TS/TSX 16개 파일의 구문 검사, CSS 파싱, 로그인·인사 레이아웃의 뷰포트 가로 넘침 검사를 수행했습니다.


## 2026-11-09 화면 상단 줄 및 브라우저 확대·축소 수정

- 로그인 페이지의 청록·회색 상단 장식 줄(`login-top-stripe`)을 **마크업과 CSS에서 삭제**했습니다. 로그인 화면은 브라우저 맨 위부터 어두운 네이비 배경으로 시작합니다.
- 로그인 원형 배경을 입력창과 분리된 장식 레이어로 변경하고, 전체 페이지를 기준으로 중앙 정렬했습니다. 폭이 줄어들면 로그인 폼을 단일 열 레이아웃의 중앙에 배치합니다.
- 기존 로그인 스타일과의 충돌을 제거하기 위해 `.login-art`에 남아 있던 보라색 테두리·배경을 초기화했습니다.
- CSS 뷰포트 1100px 이하에서는 앱의 고정 사이드바를 접이식 메뉴로 바꾸어, 높은 브라우저 확대 배율에서 본문이 눌리지 않게 했습니다.
- 기존 `responsive.css` 뒤에 `src/styles/zoom-fixes.css`를 추가 적용했습니다. 기존 Flask API 호출, 인증, 데이터 처리 및 비즈니스 기능은 변경하지 않았습니다.

### 검증

- Chromium에서 로그인 DOM/CSS를 사용해 **320, 375, 600, 768, 875, 960, 1100, 1280, 1600, 1920, 2560px** 폭의 입력창/로그인 버튼 가시성과 가로 넘침 여부를 검사했습니다. 상단 줄 부재를 확인했습니다.
- 공통 앱 레이아웃은 320~2560px CSS 뷰포트에서 사이드바 전환 및 본문 넘침 여부를 별도로 검사했습니다.
- TSX 파싱 및 CSS 파싱을 검사했습니다. **실제 브라우저 배율별 모든 페이지와 Flask 서버 통합 동작, 패키지 설치가 필요한 전체 빌드는 검증하지 않았습니다.**
- 브라우저 확대·축소는 CSS 뷰포트 폭을 변경하므로, 배율에 따라 레이아웃이 전환되는 것은 정상 동작입니다. 글자·버튼의 물리적 크기가 배율과 관계없이 일정할 수는 없습니다.

### 적용 방법

기존 프로젝트의 `.env`는 별도로 보관한 다음, 이 압축파일의 프로젝트로 교체하고 `.env`를 다시 추가하세요. 설치된 `node_modules`는 그대로 사용하는 것보다 `npm install`로 재설치하는 편이 안전합니다. `npm run dev`를 재시작하고 브라우저에서 강력 새로고침(Ctrl+Shift+R)을 해주세요.
