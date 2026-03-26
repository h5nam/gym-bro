import { getApiClient } from "@/lib/supabase/api-auth";
import { generateStructured } from "@/lib/ai/gemini";
import { NormalizedWorkoutSchema } from "@/lib/ai/schemas";
import type { NormalizedSet } from "@/lib/ai/schemas";
import { buildNormalizePrompt } from "@/lib/ai/prompts/normalize";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// ============================================
// 날짜별 운동 이름 보정맵
// ============================================
const EXERCISE_CORRECTIONS: Record<string, string[]> = {
  "2025-02-15": ["랫 풀 다운", "바벨 로우 (리버스 그립)", "밴드 원 암 로우", "업라이트 로우", "페이스 풀", "덤벨 컬", "레그 레이즈"],
  "2025-02-16": ["벤치 프레스", "펙덱 플라이", "벤치 딥스", "바벨 OHP", "래터럴 레이즈", "레그 레이즈"],
  "2025-02-18": ["레그 익스텐션", "스쿼트", "레그 프레스", "펜듈럼 스쿼트", "레그 컬", "레그 익스텐션", "행잉 레그 레이즈"],
  "2025-02-19": ["와이드 풀 다운", "바벨 로우", "머신 원 암 로우", "리어 델토이드 플라이", "덤벨 컬", "레그 레이즈"],
  "2025-02-21": ["레그 익스텐션", "스쿼트", "레그 프레스", "스플릿 스쿼트 머신", "힙 어브덕션", "힙 어덕션"],
  "2025-02-22": ["펙덱 플라이", "벤치 프레스", "인클라인 덤벨 프레스", "와이드 체스트 프레스", "어시스티드 딥", "래터럴 레이즈", "트라이셉스 프레스다운", "레그 레이즈"],
  "2025-02-23": ["랫 풀 다운", "머신 하이 로우", "머신 원 암 로우", "리어 델토이드", "바벨 컬", "레그 레이즈"],
  "2025-02-25": ["바벨 스쿼트", "리버스 V 스쿼트 머신", "불가리안 스플릿 스쿼트"],
  "2025-02-26": ["펙덱 플라이", "인클라인 덤벨 벤치 프레스", "체스트 프레스 머신", "밀리터리 프레스", "래터럴 레이즈", "트라이셉스 프레스다운", "행잉 레그 레이즈"],
  "2025-02-27": ["랫 풀 다운", "하이 로우", "머신 원 암 로우", "리어 델토이드", "해머 컬", "레그 레이즈"],
  "2025-02-28": ["레그 익스텐션", "바벨 스쿼트", "레그 프레스", "리버스 V 스쿼트 머신", "불가리안 스플릿 스쿼트"],
  "2025-03-01": ["펙덱 플라이", "인클라인 덤벨 프레스", "체스트 프레스 머신", "디클라인 체스트 프레스", "밀리터리 프레스", "래터럴 레이즈", "트라이셉스 프레스다운", "레그 레이즈"],
  "2025-03-02": ["어시스티드 풀업", "와이드 풀 다운", "하이 로우", "머신 시티드 원 암 로우", "리어 델토이드", "머신 바이셉스 컬", "레그 레이즈"],
};

// ============================================
// 세션 이름 보정맵
// ============================================
const SESSION_NAMES: Record<string, string> = {
  "2025-02-15": "등/어깨/이두",
  "2025-02-16": "가슴/어깨/복근",
  "2025-02-18": "하체",
  "2025-02-19": "등/어깨/이두",
  "2025-02-21": "하체",
  "2025-02-22": "가슴/어깨/삼두",
  "2025-02-23": "등/어깨/이두",
  "2025-02-25": "하체",
  "2025-02-26": "가슴/어깨/삼두",
  "2025-02-27": "등/어깨/이두",
  "2025-02-28": "하체",
  "2025-03-01": "가슴/어깨/삼두",
  "2025-03-02": "등/어깨/이두",
};

// ============================================
// 인바디 데이터
// ============================================
const BODY_METRICS = [
  { measuredAt: "2025-02-14", weightKg: 81.9, skeletalMuscleMassKg: 35.3, bodyFatPct: 24.3 },
  { measuredAt: "2025-02-21", weightKg: 80.9, skeletalMuscleMassKg: 35.2, bodyFatPct: 23.6 },
  { measuredAt: "2025-02-28", weightKg: 80.7, skeletalMuscleMassKg: 35.7, bodyFatPct: 22.4 },
];

// ============================================
// 유산소 타입명 매핑
// ============================================
const CARDIO_TYPE_NAMES: Record<string, string> = {
  treadmill_running: "트레드밀 러닝",
  street_running: "야외 러닝",
  indoor_cycling: "실내 사이클",
  cycling: "사이클",
  stair_climbing: "계단 오르기",
  walking: "걷기",
  hiking: "하이킹",
  trail_running: "트레일 러닝",
  indoor_running: "실내 러닝",
};

// ============================================
// 연속 그룹화 → 보정 이름 적용
// ============================================
function applyExerciseCorrections(
  sets: NormalizedSet[],
  corrections: string[]
): NormalizedSet[] {
  // 연속된 운동명 기준으로 그룹화 (같은 운동이 다른 위치에서 나올 수 있음)
  const groups: Array<{ originalName: string; sets: NormalizedSet[] }> = [];
  let currentGroup: { originalName: string; sets: NormalizedSet[] } | null = null;

  for (const set of sets) {
    if (!currentGroup || currentGroup.originalName !== set.exerciseName) {
      currentGroup = { originalName: set.exerciseName, sets: [] };
      groups.push(currentGroup);
    }
    currentGroup.sets.push(set);
  }

  if (groups.length !== corrections.length) {
    console.warn(
      `[Rebuild] Exercise count mismatch: ${groups.length} groups vs ${corrections.length} corrections. ` +
      `Groups: [${groups.map(g => g.originalName).join(", ")}] ` +
      `Corrections: [${corrections.join(", ")}]`
    );
  }

  const result: NormalizedSet[] = [];
  for (let i = 0; i < groups.length; i++) {
    const correctedName = i < corrections.length ? corrections[i] : groups[i].originalName;
    for (const set of groups[i].sets) {
      result.push({ ...set, exerciseName: correctedName });
    }
  }

  return result;
}

// ============================================
// 메인 엔드포인트
// ============================================
export async function POST(request: NextRequest) {
  // Auth: CRON_SECRET 헤더 체크
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await getApiClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    console.log("[Rebuild] Starting rebuild for user:", user.id);

    // ========== Step 1: 기존 데이터 삭제 ==========
    // FK 순서: agent_feedback → daily/weekly_reports → analysis_jobs → workout_sessions → body_metrics
    const { data: jobs } = await supabase
      .from("analysis_jobs")
      .select("id")
      .eq("user_id", user.id);
    const jobIds = (jobs ?? []).map((j: { id: string }) => j.id);

    if (jobIds.length > 0) {
      await supabase.from("agent_feedback").delete().in("job_id", jobIds);
    }
    await supabase.from("daily_reports").delete().eq("user_id", user.id);
    await supabase.from("weekly_reports").delete().eq("user_id", user.id);
    await supabase.from("analysis_jobs").delete().eq("user_id", user.id);
    await supabase.from("workout_sessions").delete().eq("user_id", user.id);
    await supabase.from("body_metrics").delete().eq("user_id", user.id);

    // Reset processed flag
    await supabase
      .from("workout_sessions_raw")
      .update({ processed: false })
      .eq("user_id", user.id);

    console.log("[Rebuild] Existing data cleared");

    // ========== Step 2: Raw 세션 전부 가져오기 ==========
    const { data: rawSessions } = await supabase
      .from("workout_sessions_raw")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: true });

    const { data: catalog } = await supabase
      .from("exercise_catalog")
      .select("name_ko, name_en, muscle_group_primary");

    console.log(`[Rebuild] Processing ${rawSessions?.length ?? 0} raw sessions`);

    // ========== Step 3: 각 세션 처리 ==========
    const results: Array<{
      date: string;
      type: string;
      sessionName: string;
      success: boolean;
      sets?: number;
      error?: string;
    }> = [];

    for (const raw of rawSessions ?? []) {
      // KST 날짜 계산
      const startedAt = new Date(raw.started_at);
      const kstDate = new Date(startedAt.getTime() + 9 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      try {
        if (!raw.exercise_sets_payload) {
          // ---- 유산소 ----
          const activityType = raw.activity_type ?? "unknown";
          const p = raw.raw_payload as Record<string, unknown>;
          const activityName = (p.activityName as string) ?? activityType;
          const durationMin = Math.round((raw.duration_seconds ?? 0) / 60);
          const displayName = CARDIO_TYPE_NAMES[activityType] ?? activityName;
          const sessionName = `${displayName} ${durationMin}분`;

          const { error: sessionError } = await supabase
            .from("workout_sessions")
            .insert({
              user_id: user.id,
              raw_session_id: raw.id,
              session_name: sessionName,
              muscle_groups: [activityType],
              started_at: raw.started_at,
              duration_seconds: raw.duration_seconds,
              total_volume_kg: 0,
              total_sets: 0,
              status: "confirmed",
              ai_normalized_at: new Date().toISOString(),
              user_confirmed_at: new Date().toISOString(),
            });

          if (sessionError) throw sessionError;

          await supabase
            .from("workout_sessions_raw")
            .update({ processed: true })
            .eq("id", raw.id);

          results.push({ date: kstDate, type: activityType, sessionName, success: true, sets: 0 });
          console.log(`[Rebuild] ✓ Cardio: ${sessionName} (${kstDate})`);

        } else {
          // ---- 근력 ----
          const prompt = buildNormalizePrompt(raw.exercise_sets_payload, catalog ?? []);
          const normalized = await generateStructured(prompt, NormalizedWorkoutSchema);

          // originalOrder로 정렬하여 Garmin 원본 순서 보장
          const sortedSets = [...normalized.sets].sort(
            (a, b) => a.originalOrder - b.originalOrder
          );

          // 보정맵 적용
          const corrections = EXERCISE_CORRECTIONS[kstDate];
          const sessionNameOverride = SESSION_NAMES[kstDate];
          let finalSets = sortedSets;

          if (corrections) {
            finalSets = applyExerciseCorrections(normalized.sets, corrections);
            console.log(`[Rebuild] Applied corrections for ${kstDate}: ${corrections.join(", ")}`);
          }

          const sessionName = sessionNameOverride ?? normalized.sessionName;
          const muscleGroups = sessionNameOverride
            ? sessionNameOverride.split("/")
            : normalized.muscleGroups;

          const totalVolume = finalSets.reduce(
            (sum, s) => sum + s.weightKg * s.reps, 0
          );

          // 세션 삽입
          const { data: session, error: sessionError } = await supabase
            .from("workout_sessions")
            .insert({
              user_id: user.id,
              raw_session_id: raw.id,
              session_name: sessionName,
              muscle_groups: muscleGroups,
              started_at: raw.started_at,
              duration_seconds: raw.duration_seconds,
              total_volume_kg: totalVolume,
              total_sets: finalSets.length,
              status: "confirmed",
              ai_normalized_at: new Date().toISOString(),
              user_confirmed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (sessionError) throw sessionError;

          // 세트 삽입
          const setsToInsert = finalSets.map((set, index) => ({
            session_id: session.id,
            exercise_name_raw: set.exerciseNameEn,
            exercise_name_display: set.exerciseName,
            set_number: set.setNumber,
            reps: set.reps,
            weight_kg: set.weightKg,
            is_warmup: set.isWarmup,
            set_order: index,
          }));

          const { error: setsError } = await supabase
            .from("workout_sets")
            .insert(setsToInsert);

          if (setsError) throw setsError;

          await supabase
            .from("workout_sessions_raw")
            .update({ processed: true })
            .eq("id", raw.id);

          results.push({
            date: kstDate,
            type: "strength_training",
            sessionName,
            success: true,
            sets: finalSets.length,
          });
          console.log(`[Rebuild] ✓ Strength: ${sessionName} (${kstDate}) - ${finalSets.length} sets`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown";
        results.push({
          date: kstDate,
          type: raw.activity_type ?? "unknown",
          sessionName: "FAILED",
          success: false,
          error: msg,
        });
        console.error(`[Rebuild] ✗ Failed ${kstDate}:`, msg);
      }
    }

    // ========== Step 4: 인바디 삽입 ==========
    for (const metric of BODY_METRICS) {
      await supabase.from("body_metrics").insert({
        user_id: user.id,
        measured_at: metric.measuredAt,
        weight_kg: metric.weightKg,
        skeletal_muscle_mass_kg: metric.skeletalMuscleMassKg,
        body_fat_pct: metric.bodyFatPct,
        source: "inbody",
      });
    }
    console.log(`[Rebuild] ✓ Inserted ${BODY_METRICS.length} body metrics`);

    // ========== 결과 반환 ==========
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      total: results.length,
      succeeded,
      failed,
      bodyMetrics: BODY_METRICS.length,
      details: results,
    });

  } catch (error) {
    console.error("[Rebuild] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Rebuild failed",
      },
      { status: 500 }
    );
  }
}
