import { createClient } from "@/lib/supabase/server";
import { generateStructured } from "@/lib/ai/gemini";
import { NormalizedWorkoutSchema } from "@/lib/ai/schemas";
import { buildNormalizePrompt } from "@/lib/ai/prompts/normalize";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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

    if (!rawSession.exercise_sets_payload) {
      return NextResponse.json(
        { error: "운동 세트 데이터가 없습니다" },
        { status: 400 }
      );
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

    // Insert sets
    const setsToInsert = normalized.sets.map((set, index) => ({
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
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
