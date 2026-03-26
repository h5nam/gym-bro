import { getApiClient } from "@/lib/supabase/api-auth";
import { generateStructured } from "@/lib/ai/gemini";
import { NormalizedWorkoutSchema } from "@/lib/ai/schemas";
import { buildNormalizePrompt } from "@/lib/ai/prompts/normalize";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { rawSessionId } = await request.json();
    if (!rawSessionId) {
      return NextResponse.json(
        { error: "rawSessionId가 필요합니다" },
        { status: 400 }
      );
    }

    // Fetch raw session
    const { data: rawSession, error: fetchError } = await supabase
      .from("workout_sessions_raw")
      .select("*")
      .eq("id", rawSessionId)
      .single();

    if (fetchError || !rawSession) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // For non-strength activities without exercise sets, create a simple session
    if (!rawSession.exercise_sets_payload) {
      const activityType = rawSession.activity_type ?? "unknown";
      const raw = rawSession.raw_payload as Record<string, unknown>;
      const activityName = (raw.activityName as string) ?? activityType;
      const calories = Math.round((raw.calories as number) ?? 0);
      const distance = Math.round(((raw.distance as number) ?? 0) / 1000 * 10) / 10; // km
      const durationMin = Math.round((rawSession.duration_seconds ?? 0) / 60);
      const avgHR = Math.round((raw.averageHR as number) ?? 0);
      const maxHR = Math.round((raw.maxHR as number) ?? 0);
      const avgSpeed = raw.averageSpeed ? Math.round((raw.averageSpeed as number) * 3.6 * 10) / 10 : 0; // m/s → km/h

      // Build descriptive session name
      const typeNames: Record<string, string> = {
        running: "러닝",
        treadmill_running: "트레드밀 러닝",
        street_running: "야외 러닝",
        indoor_cycling: "실내 사이클",
        cycling: "사이클",
        stair_climbing: "계단 오르기",
        walking: "걷기",
        hiking: "하이킹",
      };
      const displayName = typeNames[activityType] ?? activityName;
      const sessionName = `${displayName} ${durationMin}분`;

      // Build summary note
      const parts = [];
      if (distance > 0) parts.push(`${distance}km`);
      parts.push(`${durationMin}분`);
      if (avgHR > 0) parts.push(`평균 심박 ${avgHR}bpm`);
      if (maxHR > 0) parts.push(`최대 심박 ${maxHR}bpm`);
      if (avgSpeed > 0) parts.push(`평균 속도 ${avgSpeed}km/h`);
      if (calories > 0) parts.push(`${calories}kcal`);

      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          raw_session_id: rawSessionId,
          session_name: sessionName,
          muscle_groups: [activityType],
          started_at: rawSession.started_at,
          duration_seconds: rawSession.duration_seconds,
          total_volume_kg: 0,
          total_sets: 0,
          status: "confirmed",
          ai_normalized_at: new Date().toISOString(),
          user_confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      await supabase
        .from("workout_sessions_raw")
        .update({ processed: true })
        .eq("id", rawSessionId);


      return NextResponse.json({
        success: true,
        sessionId: session.id,
        sessionName,
        setCount: 0,
        totalVolume: 0,
        cardioSummary: {
          distance,
          durationMin,
          avgHR,
          maxHR,
          avgSpeed,
          calories,
        },
        note: parts.join(" · "),
      });
    }

    // Fetch exercise catalog for matching
    const { data: catalog } = await supabase
      .from("exercise_catalog")
      .select("name_ko, name_en, muscle_group_primary");

    // Call Gemini to normalize
    const prompt = buildNormalizePrompt(
      rawSession.exercise_sets_payload,
      catalog ?? []
    );

    const normalized = await generateStructured(
      prompt,
      NormalizedWorkoutSchema
    );

    // Create workout session
    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user.id,
        raw_session_id: rawSessionId,
        session_name: normalized.sessionName,
        muscle_groups: normalized.muscleGroups,
        started_at: rawSession.started_at,
        duration_seconds: rawSession.duration_seconds,
        total_volume_kg: normalized.totalVolumeKg,
        total_sets: normalized.sets.length,
        status: "draft",
        ai_normalized_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Sort by originalOrder to guarantee Garmin 원본 순서 보존 (AI가 재배열해도 복원)
    const sortedSets = [...normalized.sets].sort(
      (a, b) => a.originalOrder - b.originalOrder
    );

    // Insert sets
    const setsToInsert = sortedSets.map((set, index) => ({
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

    // Mark raw session as processed
    await supabase
      .from("workout_sessions_raw")
      .update({ processed: true })
      .eq("id", rawSessionId);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionName: normalized.sessionName,
      setCount: normalized.sets.length,
      totalVolume: normalized.totalVolumeKg,
    });
  } catch (error) {
    console.error("Normalize error:", error);
    return NextResponse.json(
      {
        error: "정규화 실패",
      },
      { status: 500 }
    );
  }
}
