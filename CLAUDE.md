# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — dev server (Turbopack)
- `pnpm build` — production build
- `pnpm lint` — ESLint

## Architecture

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres + Auth + RLS), Google Gemini (`@google/genai`), Tailwind CSS v4, pnpm

### Route Groups

- `src/app/(app)/` — authenticated pages (dashboard, workouts, meals, body-metrics, reports)
- `src/app/login/` — public auth page
- `src/app/api/` — API routes (sync, AI, CRUD, cron)
- Middleware at root handles Supabase session refresh; guards for missing env vars during build

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
- Migrations in `supabase/migrations/` (3 files: core schema, exercise catalog seed, agent tables)
- `profiles` table auto-created on signup via DB trigger

## Conventions

- **Primary language**: Korean (UI, AI prompts, coaching output)
- **Font**: Pretendard Variable (Korean-first stack)
- **Dark theme only**: defined in `src/app/globals.css` via `@theme`
- **Mobile-first**: designed for phone use with BottomNav
- Client components use `"use client"` directive; pages are Server Components by default
- Zod schemas for all AI outputs live in `src/lib/ai/schemas.ts`
- AI prompts are builder functions in `src/lib/ai/prompts/`

## Known Patterns

- Login page calls `createClient()` inside event handler (not at render) to avoid SSR build errors
- Supabase middleware has guard: `if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return` for prerender safety
- `zod-to-json-schema` requires `as any` cast with Zod v4 due to type mismatch
- Garmin `IActivity` needs `as unknown as Record<string, unknown>` casts for raw payload storage
- Vercel Cron configured in `vercel.json` (daily 21:00 UTC), protected by `CRON_SECRET` header
