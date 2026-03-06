# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — dev server (Turbopack)
- `pnpm build` — production build
- `pnpm lint` — ESLint

## Architecture

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres + Auth + RLS), Google Gemini (`@google/genai`), TanStack Query v5, Tailwind CSS v4, pnpm

### Route Groups

- `src/app/(app)/` — authenticated pages (dashboard, workouts, meals, body-metrics, profile, reports/daily, reports/weekly)
- `src/app/login/` — public auth page
- `src/app/api/` — API routes (sync, AI, meals, body-metrics, profile, admin, cron)
- Middleware at root handles Supabase session refresh; guards for missing env vars during build

### API Routes

- `api/sync/garmin/` — Garmin 데이터 동기화
- `api/ai/normalize/` — raw → structured 운동 정규화
- `api/ai/analyze/` — 멀티에이전트 분석 + 리포트 생성
- `api/ai/chat/` — AI 코치 대화 (correction chat 등)
- `api/ai/session-feedback/` — 개별 세션 피드백 생성
- `api/ai/report/` — 일일/주간 리포트 조회 (type=dates | type=daily&date=)
- `api/dashboard/` — 대시보드 집계 데이터
- `api/workouts/` — 운동 세션 목록 조회
- `api/meals/` — 식단 CRUD
- `api/meals/analyze-image/` — 식단 이미지 AI 분석
- `api/meals/dates/` — 식단 기록 날짜 목록
- `api/body-metrics/` — 체성분 CRUD
- `api/profile/` — 사용자 프로필 관리
- `api/workouts/[id]/correct/` — 운동 데이터 수정
- `api/admin/rebuild/` — 데이터 재구축
- `api/admin/batch-normalize/` — 일괄 정규화 (CRON_SECRET Bearer 인증)
- `api/admin/batch-session-feedback/` — 일괄 세션 피드백 (CRON_SECRET Bearer 인증)
- `api/cron/daily-sync/` — Vercel Cron 일일 동기화

### Data Pipeline (3-tier separation)

```
Garmin Forerunner → garmin-connect npm → workout_sessions_raw (immutable JSON)
    → Gemini normalize → workout_sessions + workout_sets (user-confirmed)
    → 4 agents parallel + orchestrator → agent_feedback + daily_reports (regenerable)
```

### Multi-Agent AI

Four specialist agents (Gemini Flash) run in parallel via `Promise.all`, then an orchestrator (Gemini Pro) synthesizes a final Korean report:
- `src/lib/ai/agents/bodybuilding.ts` — volume, progressive overload, split
- `src/lib/ai/agents/sports-med.ts` — joint stress, injury risk
- `src/lib/ai/agents/nutrition.ts` — energy/protein adequacy
- `src/lib/ai/agents/recovery.ts` — frequency, rest, fatigue
- `src/lib/ai/agents/orchestrator.ts` — conflict resolution, final report
- `src/lib/ai/session-feedback.ts` — 개별 세션 즉시 피드백

### AI Prompts (`src/lib/ai/prompts/`)

Builder functions for Gemini prompts:
- `normalize.ts` — raw Garmin → structured workout
- `correct.ts` — 사용자 수정 요청 처리
- `chat.ts` — AI 코치 대화
- `meal-parse.ts` — 텍스트 식단 파싱
- `meal-image-parse.ts` — 식단 이미지 분석

### Gemini Wrapper (`src/lib/ai/gemini.ts`)

- Uses **lazy initialization** (`getAI()`) to avoid build-time errors when `GEMINI_API_KEY` is missing
- `generateStructured<T>()` — Zod schema → `zod-to-json-schema` → Gemini `responseSchema`
- Schema parameter typed as `{ parse: (data: unknown) => T }` to work around Zod v4 type incompatibility

### Garmin Connector (`src/lib/connectors/garmin.ts`)

- Singleton via `getGarminConnector()`
- Uses undocumented `/activity-service/activity/{id}/exerciseSets` endpoint for set-level data
- `InstanceType<typeof GarminConnect>` for typing (class default export can't be used as type directly)

### Supabase

- Browser client: `src/lib/supabase/client.ts` (SSR-aware `createBrowserClient`)
- Server client: `src/lib/supabase/server.ts` (cookie-based `createServerClient`)
- All tables have RLS policies; users only access their own data
- Migrations in `supabase/migrations/` (5 files):
  - `00001_initial_schema.sql` — core schema (users, workouts, meals, body-metrics)
  - `00002_exercise_catalog.sql` — exercise catalog seed data
  - `00003_agent_tables.sql` — agent_feedback + daily_reports
  - `00004_tomorrow_plan.sql` — tomorrow plan feature
  - `00005_session_feedback.sql` — session feedback table
- `profiles` table auto-created on signup via DB trigger

### Components (`src/components/`)

- `dashboard/HomeDashboard.tsx` — 메인 대시보드
- `workout/` — SyncButton, NormalizeButton, ConfirmButton, WorkoutListView, WorkoutDetailView, WorkoutSetList, CorrectionChat
- `meal/` — MealInput, MealList, MealsDashboard
- `body-metrics/` — BodyMetricsDashboard, BodyMetricsForm, BodyMetricsList
- `report/DailyReport.tsx` — 일일 리포트
- `profile/ProfilePage.tsx` — 프로필 관리
- `layout/BottomNav.tsx` — 하단 네비게이션

### Utilities

- `src/lib/date-utils.ts` — 날짜 유틸리티 (`getTodayKST()` 등 KST 변환, 전체 서버 라우트에서 사용)
- `src/lib/constants.ts` — 공통 상수 (`CARDIO_TYPES`, `CARDIO_TYPE_NAMES`, `extractCardioMetrics()`)
- `src/lib/utils.ts` — cn() 등 공통 유틸리티

## Conventions

- **Primary language**: Korean (UI, AI prompts, coaching output)
- **Font**: Pretendard Variable (Korean-first stack)
- **Dark theme only**: defined in `src/app/globals.css` via `@theme`
- **Mobile-first**: designed for phone use with BottomNav
- Client components use `"use client"` directive; pages are Server Components by default
- Zod schemas for all AI outputs live in `src/lib/ai/schemas.ts` (TomorrowPlan 등 공유 인터페이스 포함)
- AI prompts are builder functions in `src/lib/ai/prompts/`
- Tailwind v4 CSS-first config (no `tailwind.config.js` — `@theme` in `globals.css`)

## Security Patterns

- **Admin 라우트 인증**: `batch-normalize`, `batch-session-feedback`는 `CRON_SECRET` Bearer 토큰 검증 필수
- **API 에러 응답**: 내부 에러 메시지(`error.message`) 클라이언트에 노출 금지 — 일반적인 에러 메시지만 반환
- **입력 검증**: Profile PUT은 Zod `ProfileUpdateSchema`, Chat 메시지는 2000자 제한
- **이미지 업로드**: base64 크기 5MB 제한 + MIME 타입 화이트리스트 (`image/jpeg`, `image/png`, `image/webp`)
- **타임존**: 서버 사이드에서 날짜 처리 시 반드시 `getTodayKST()` 사용 (UTC 직접 사용 금지)
- **Hardcoded 개인 데이터 금지**: 운동 보정맵, InBody 수치 등 개인정보를 코드에 직접 포함하지 않음

## Known Patterns

- Login page calls `createClient()` inside event handler (not at render) to avoid SSR build errors
- Supabase middleware has guard: `if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return` for prerender safety
- `zod-to-json-schema` requires `as any` cast with Zod v4 due to type mismatch
- Garmin `IActivity` needs `as unknown as Record<string, unknown>` casts for raw payload storage
- Vercel Cron configured in `vercel.json` (daily 21:00 UTC), protected by `CRON_SECRET` header
- body-metrics API: DESC 정렬 + limit(30) → reverse()로 최신 30건을 시간순 반환
- 유산소 관련 상수/유틸은 `constants.ts`에서 import (각 파일에 중복 정의 금지)
