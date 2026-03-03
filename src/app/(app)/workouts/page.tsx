import { createClient } from "@/lib/supabase/server";
import { CARDIO_TYPES } from "@/lib/constants";
import WorkoutListView, {
  type SessionData,
  type RawSessionData,
  type CardioMetrics,
} from "@/components/workout/WorkoutListView";

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("started_at", { ascending: false })
    .limit(50);

  // Build cardio metrics
  const cardioMetrics: Record<string, CardioMetrics> = {};
  if (sessions) {
    const cardioSessions = sessions.filter((s) => {
      const mg = s.muscle_groups as string[] | null;
      return mg?.some((g) => CARDIO_TYPES.includes(g));
    });
    const rawIds = cardioSessions
      .map((s) => s.raw_session_id)
      .filter(Boolean) as string[];

    if (rawIds.length > 0) {
      const { data: rawPayloads } = await supabase
        .from("workout_sessions_raw")
        .select("id, raw_payload")
        .in("id", rawIds);

      const rawMap = new Map(
        (rawPayloads ?? []).map((r) => [r.id, r.raw_payload as Record<string, unknown>])
      );

      for (const s of cardioSessions) {
        const p = rawMap.get(s.raw_session_id);
        cardioMetrics[s.id] = {
          durationMin: Math.round((s.duration_seconds ?? 0) / 60),
          avgHR: p ? Math.round((p.averageHR as number) ?? 0) : 0,
          distance: p ? Math.round(((p.distance as number) ?? 0) / 1000 * 10) / 10 : 0,
          calories: p ? Math.round((p.calories as number) ?? 0) : 0,
        };
      }
    }
  }

  // Unprocessed raw sessions
  const { data: rawSessions } = await supabase
    .from("workout_sessions_raw")
    .select("id, activity_type, started_at, processed")
    .eq("user_id", user?.id ?? "")
    .eq("processed", false)
    .order("started_at", { ascending: false });

  return (
    <WorkoutListView
      sessions={(sessions ?? []) as SessionData[]}
      rawSessions={(rawSessions ?? []) as RawSessionData[]}
      cardioMetrics={cardioMetrics}
    />
  );
}
