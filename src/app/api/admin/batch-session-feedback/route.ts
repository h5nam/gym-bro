import { createClient } from "@/lib/supabase/server";
import { generateSessionFeedback, generateCardioSessionFeedback } from "@/lib/ai/session-feedback";
import { CARDIO_TYPES, extractCardioMetrics, EMPTY_CARDIO_METRICS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

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

    // Fetch all sessions without feedback (strength + cardio)
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("*, workout_sets(*)")
      .eq("user_id", user.id)
      .is("ai_session_feedback", null)
      .order("started_at", { ascending: true });

    const allSessions = sessions ?? [];

    console.log(
      `[BatchFeedback] Processing ${allSessions.length} sessions`
    );

    let succeeded = 0;
    let failed = 0;
    const details: Array<{
      date: string;
      name: string;
      type: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const session of allSessions) {
      try {
        const muscleGroups = (session.muscle_groups as string[]) ?? [];
        const isCardio = muscleGroups.some((g: string) => CARDIO_TYPES.includes(g));

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
            activityType: muscleGroups[0] ?? "unknown",
            durationSeconds: session.duration_seconds,
            ...cardioMetrics,
          });
        } else {
          // Strength
          const sets = (session.workout_sets ?? []) as Array<Record<string, unknown>>;

          if (sets.length === 0) {
            details.push({
              date: session.started_at,
              name: session.session_name,
              type: "strength",
              success: false,
              error: "세트 데이터 없음",
            });
            failed++;
            continue;
          }

          feedback = await generateSessionFeedback({
            sessionName: session.session_name,
            muscleGroups,
            totalVolumeKg: Number(session.total_volume_kg),
            totalSets: session.total_sets,
            sets: sets.map((s) => ({
              exerciseName: s.exercise_name_display as string,
              setNumber: s.set_number as number,
              reps: s.reps as number,
              weightKg: Number(s.weight_kg),
              isWarmup: s.is_warmup as boolean,
            })),
          });
        }

        await supabase
          .from("workout_sessions")
          .update({ ai_session_feedback: feedback })
          .eq("id", session.id);

        succeeded++;
        details.push({
          date: session.started_at,
          name: session.session_name,
          type: isCardio ? "cardio" : "strength",
          success: true,
        });
        console.log(
          `[BatchFeedback] ✓ ${session.session_name} (${session.started_at}) [${isCardio ? "cardio" : "strength"}]`
        );
      } catch (error) {
        failed++;
        const msg = error instanceof Error ? error.message : "Unknown";
        details.push({
          date: session.started_at,
          name: session.session_name,
          type: "unknown",
          success: false,
          error: msg,
        });
        console.error(
          `[BatchFeedback] ✗ ${session.session_name}: ${msg}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      total: allSessions.length,
      succeeded,
      failed,
      details,
    });
  } catch (error) {
    console.error("[BatchFeedback] Fatal error:", error);
    return NextResponse.json(
      { error: "Batch feedback failed" },
      { status: 500 }
    );
  }
}
