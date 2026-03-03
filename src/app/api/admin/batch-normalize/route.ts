import { createClient } from "@/lib/supabase/server";
import { generateStructured } from "@/lib/ai/gemini";
import { NormalizedWorkoutSchema } from "@/lib/ai/schemas";
import { buildNormalizePrompt } from "@/lib/ai/prompts/normalize";
import { CARDIO_TYPE_NAMES } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function toKSTDate(dateStr: string): string {
  const d = new Date(dateStr);
  return new Date(d.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

export async function POST(request: NextRequest) {
  try {
    // Admin authorization: require CRON_SECRET
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    // ========== Step 1: 기존 draft 세션 전부 확정 ==========
    const { data: drafts } = await supabase
      .from("workout_sessions")
      .update({
        status: "confirmed",
        user_confirmed_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("status", "draft")
      .select("id");

    const draftsConfirmed = drafts?.length ?? 0;

    // ========== Step 2: 미처리 raw 세션 전부 가져오기 ==========
    const { data: rawSessions } = await supabase
      .from("workout_sessions_raw")
      .select("*")
      .eq("user_id", user.id)
      .eq("processed", false)
      .order("started_at", { ascending: true });

    const { data: catalog } = await supabase
      .from("exercise_catalog")
      .select("name_ko, name_en, muscle_group_primary");

    console.log(
      `[BatchNorm] Processing ${rawSessions?.length ?? 0} unprocessed sessions, confirmed ${draftsConfirmed} drafts`
    );

    // ========== Step 3: 각 세션 정규화 ==========
    const results: Array<{
      date: string;
      type: string;
      sessionName: string;
      success: boolean;
      sets?: number;
      error?: string;
    }> = [];

    for (const raw of rawSessions ?? []) {
      const kstDate = toKSTDate(raw.started_at);

      try {
        if (!raw.exercise_sets_payload) {
          // ---- 유산소 ----
          const activityType = raw.activity_type ?? "unknown";
          const p = raw.raw_payload as Record<string, unknown>;
          const activityName = (p.activityName as string) ?? activityType;
          const durationMin = Math.round((raw.duration_seconds ?? 0) / 60);
          const displayName = CARDIO_TYPE_NAMES[activityType] ?? activityName;
          const sessionName = `${displayName} ${durationMin}분`;

          await supabase.from("workout_sessions").insert({
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

          await supabase
            .from("workout_sessions_raw")
            .update({ processed: true })
            .eq("id", raw.id);

          results.push({
            date: kstDate,
            type: activityType,
            sessionName,
            success: true,
            sets: 0,
          });
          console.log(`[BatchNorm] ✓ Cardio: ${sessionName} (${kstDate})`);
        } else {
          // ---- 근력 ----
          const prompt = buildNormalizePrompt(
            raw.exercise_sets_payload,
            catalog ?? []
          );
          const normalized = await generateStructured(
            prompt,
            NormalizedWorkoutSchema
          );

          const finalSets = normalized.sets;
          const sessionName = normalized.sessionName;
          const muscleGroups = normalized.muscleGroups;
          const totalVolume = finalSets.reduce(
            (sum, s) => sum + s.weightKg * s.reps,
            0
          );

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

          await supabase.from("workout_sets").insert(setsToInsert);

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
          console.log(
            `[BatchNorm] ✓ Strength: ${sessionName} (${kstDate}) - ${finalSets.length} sets`
          );
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
        console.error(`[BatchNorm] ✗ Failed ${kstDate}:`, msg);
      }
    }

    // ========== 결과 반환 ==========
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      total: results.length,
      succeeded,
      failed,
      draftsConfirmed,
      details: results,
    });
  } catch (error) {
    console.error("[BatchNorm] Fatal error:", error);
    return NextResponse.json(
      { error: "Batch normalize failed" },
      { status: 500 }
    );
  }
}
