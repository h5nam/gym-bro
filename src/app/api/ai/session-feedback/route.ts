import { createClient } from "@/lib/supabase/server";
import { generateSessionFeedback, generateCardioSessionFeedback } from "@/lib/ai/session-feedback";
import { CARDIO_TYPES, extractCardioMetrics, EMPTY_CARDIO_METRICS } from "@/lib/constants";
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

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId가 필요합니다" },
        { status: 400 }
      );
    }

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const muscleGroups = session.muscle_groups as string[] | null;
    const isCardio =
      muscleGroups?.some((g: string) => CARDIO_TYPES.includes(g)) ?? false;

    let feedback: string;

    if (isCardio) {
      let cardioMetrics = { ...EMPTY_CARDIO_METRICS };

      if (session.raw_session_id) {
        const { data: raw } = await supabase
          .from("workout_sessions_raw")
          .select("raw_payload")
          .eq("id", session.raw_session_id)
          .single();

        if (raw?.raw_payload) {
          cardioMetrics = extractCardioMetrics(raw.raw_payload as Record<string, unknown>);
        }
      }

      feedback = await generateCardioSessionFeedback({
        sessionName: session.session_name,
        activityType: muscleGroups?.[0] ?? "unknown",
        durationSeconds: session.duration_seconds,
        ...cardioMetrics,
      });
    } else {
      // Fetch sets for strength
      const { data: sets } = await supabase
        .from("workout_sets")
        .select("*")
        .eq("session_id", sessionId)
        .order("set_order", { ascending: true });

      feedback = await generateSessionFeedback({
        sessionName: session.session_name,
        muscleGroups: muscleGroups ?? [],
        totalVolumeKg: Number(session.total_volume_kg),
        totalSets: session.total_sets,
        sets: (sets ?? []).map((s: Record<string, unknown>) => ({
          exerciseName: s.exercise_name_display as string,
          setNumber: s.set_number as number,
          reps: s.reps as number,
          weightKg: Number(s.weight_kg),
          isWarmup: s.is_warmup as boolean,
        })),
      });
    }

    // Save to session
    await supabase
      .from("workout_sessions")
      .update({ ai_session_feedback: feedback })
      .eq("id", sessionId);

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error("Session feedback error:", error);
    return NextResponse.json(
      { error: "피드백 생성 실패" },
      { status: 500 }
    );
  }
}
