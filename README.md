# Gym Bro — AI 피트니스 코치

Garmin 웨어러블 데이터를 기반으로 한 개인 맞춤형 AI 피트니스 코칭 플랫폼.

## 주요 기능

- **Garmin 동기화** — Garmin Connect에서 운동 데이터 자동 수집
- **AI 운동 정규화** — Gemini AI가 raw 데이터를 구조화된 운동 기록으로 변환
- **자연어 수정** — 채팅으로 운동 기록을 자유롭게 보정 ("벤치프레스 3세트 무게 80kg으로 수정해줘")
- **멀티에이전트 분석** — 4명의 AI 전문 코치가 병렬 분석 후 종합 리포트 생성
  - 보디빌딩 (볼륨, 점진적 과부하)
  - 스포츠 의학 (관절 스트레스, 부상 위험)
  - 영양 (에너지/단백질 적정성)
  - 회복 (빈도, 휴식, 피로도)
- **식단 관리** — 텍스트/사진으로 식단 입력, AI 영양소 자동 분석
- **체성분 추적** — InBody 등 체성분 데이터 기록 및 트렌드 시각화
- **일일/주간 리포트** — AI 코칭 하이라이트 + 내일 추천 플랜

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript, React 19 |
| Database | Supabase (Postgres + Auth + RLS) |
| AI | Google Gemini (Flash 2.5 / Pro) |
| Data Fetching | TanStack Query v5 |
| Styling | Tailwind CSS v4 (Dark theme only) |
| Wearable | Garmin Connect API (garmin-connect npm) |
| Deploy | Vercel |
| Package Manager | pnpm |

## 아키텍처

### 데이터 파이프라인 (3-tier 분리)

```
Garmin Forerunner 965
    → garmin-connect npm
    → workout_sessions_raw (불변 원본 JSON)

    → Gemini AI 정규화 (trimmed payload → compact JSON)
    → workout_sessions + workout_sets (사용자 확정)

    → 4 전문 에이전트 병렬 분석 + 오케스트레이터 종합
    → agent_feedback + daily_reports (재생성 가능)
```

### 프로젝트 구조

```
src/
├── app/
│   ├── (app)/           # 인증된 페이지 (dashboard, workouts, meals, ...)
│   ├── api/             # API 라우트 (15+ endpoints)
│   └── login/           # 공개 인증 페이지
├── components/
│   ├── dashboard/       # 메인 대시보드
│   ├── workout/         # 운동 관련 (목록, 상세, 정규화, 수정 채팅)
│   ├── meal/            # 식단 관련
│   ├── body-metrics/    # 체성분 관련
│   ├── report/          # 일일/주간 리포트
│   ├── profile/         # 프로필 관리
│   └── layout/          # BottomNav 등 레이아웃
├── lib/
│   ├── ai/
│   │   ├── agents/      # 멀티에이전트 (bodybuilding, sports-med, nutrition, recovery, orchestrator)
│   │   ├── prompts/     # Gemini 프롬프트 빌더
│   │   ├── gemini.ts    # Gemini 래퍼 (lazy init)
│   │   └── schemas.ts   # Zod 스키마
│   ├── connectors/      # Garmin 커넥터
│   ├── supabase/        # Supabase 클라이언트 (browser + server)
│   ├── date-utils.ts    # KST 날짜 유틸리티
│   ├── constants.ts     # 공통 상수
│   └── queries.ts       # TanStack Query 키 + fetch 함수
└── supabase/
    └── migrations/      # DB 마이그레이션 (5개)
```

## 시작하기

### 사전 요구사항

- Node.js 20+
- pnpm
- Supabase 프로젝트
- Google Gemini API 키
- Garmin Connect 계정

### 설치

```bash
pnpm install
```

### 환경 변수

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GARMIN_EMAIL=
GARMIN_PASSWORD=
CRON_SECRET=
```

### 개발 서버

```bash
pnpm dev
```

### 빌드

```bash
pnpm build
```

## 배포

Vercel에 배포됩니다. `main` 브랜치 push 시 자동 배포.

- Vercel Hobby 플랜 (Serverless Function 최대 60초)
- Vercel Cron: 매일 21:00 UTC 자동 동기화 (`vercel.json`)

## 라이선스

Private — 개인 프로젝트
