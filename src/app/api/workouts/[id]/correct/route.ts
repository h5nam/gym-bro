import { getApiClient } from "@/lib/supabase/api-auth";
import { generateStructured } from "@/lib/ai/gemini";
import { CorrectionResultSchema, type NormalizedSet } from "@/lib/ai/schemas";
import { buildCorrectionPrompt } from "@/lib/ai/prompts/correct";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "수정 메시지가 필요합니다" },
        { status: 400 }
      );
    }

    // Fetch current session and sets
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const { data: sets } = await supabase
      .from("workout_sets")
      .select("*")
      .eq("session_id", sessionId)
      .order("set_order", { ascending: true });

    if (!sets?.length) {
      return NextResponse.json(
        { error: "세트 데이터가 없습니다" },
        { status: 400 }
      );
    }

    // Build current sets for prompt
    const currentSets: NormalizedSet[] = sets.map((s, i) => ({
      originalOrder: i,
      exerciseName: s.exercise_name_display,
      exerciseNameEn: s.exercise_name_raw ?? "",
      setNumber: s.set_number,
      reps: s.reps,
      weightKg: Number(s.weight_kg),
      isWarmup: s.is_warmup ?? false,
      muscleGroup: "",
    }));

    // Call Gemini for correction
    const prompt = buildCorrectionPrompt(currentSets, message);
    const result = await generateStructured(prompt, CorrectionResultSchema);

    // Apply corrections: delete old sets and insert updated ones
    await supabase.from("workout_sets").delete().eq("session_id", sessionId);

    const updatedSets = result.updatedSets.map((set, index) => ({
      session_id: sessionId,
      exercise_name_raw: set.exerciseNameEn,
      exercise_name_display: set.exerciseName,
      set_number: set.setNumber,
      reps: set.reps,
      weight_kg: set.weightKg,
      is_warmup: set.isWarmup,
      set_order: index,
    }));

    await supabase.from("workout_sets").insert(updatedSets);

    // Update session totals
    const totalVolume = result.updatedSets.reduce(
      (sum, s) => sum + s.weightKg * s.reps,
      0
    );

    await supabase
      .from("workout_sessions")
      .update({
        total_volume_kg: totalVolume,
        total_sets: result.updatedSets.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Save correction history
    await supabase.from("correction_history").insert({
      session_id: sessionId,
      user_message: message,
      corrections_applied: result.corrections,
    });

    return NextResponse.json({
      success: true,
      summary: result.summary,
      corrections: result.corrections,
      totalSets: result.updatedSets.length,
      totalVolume,
    });
  } catch (error) {
    console.error("Correction error:", error);
    return NextResponse.json(
      {
        error: "보정 실패",
      },
      { status: 500 }
    );
  }
}
