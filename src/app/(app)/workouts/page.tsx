import { createClient } from "@/lib/supabase/server";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import SyncButton from "@/components/workout/SyncButton";
import NormalizeButton from "@/components/workout/NormalizeButton";

const CARDIO_TYPES = [
  "treadmill_running", "street_running", "indoor_cycling", "cycling",
  "stair_climbing", "walking", "hiking", "trail_running", "indoor_running",
  "indoor_cardio", "elliptical",
];

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
    .limit(20);

  // Build cardio metrics map (session_id → metrics)
  const cardioMap = new Map<string, { durationMin: number; avgHR: number; distance: number; calories: number }>();
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
        cardioMap.set(s.id, {
          durationMin: Math.round((s.duration_seconds ?? 0) / 60),
          avgHR: p ? Math.round((p.averageHR as number) ?? 0) : 0,
          distance: p ? Math.round(((p.distance as number) ?? 0) / 1000 * 10) / 10 : 0,
          calories: p ? Math.round((p.calories as number) ?? 0) : 0,
        });
      }
    }
  }

  // Also get unprocessed raw sessions
  const { data: rawSessions } = await supabase
    .from("workout_sessions_raw")
    .select("id, activity_type, started_at, processed")
    .eq("user_id", user?.id ?? "")
    .eq("processed", false)
    .order("started_at", { ascending: false });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">운동 기록</h1>
        <SyncButton />
      </div>

      {/* Unprocessed Raw Sessions */}
      {rawSessions && rawSessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-warning">
            정규화 대기 ({rawSessions.length}건)
          </h2>
          {rawSessions.map((raw) => (
            <div
              key={raw.id}
              className="rounded-lg border border-warning/30 bg-warning/5 p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{raw.activity_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {raw.started_at
                      ? formatDate(raw.started_at)
                      : "날짜 없음"}
                  </p>
                </div>
                <NormalizeButton rawSessionId={raw.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Processed Sessions */}
      {sessions && sessions.length > 0 ? (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/workouts/${session.id}`}
              className="block rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {session.session_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(session.started_at)} ·{" "}
                    {cardioMap.has(session.id) ? (() => {
                      const c = cardioMap.get(session.id)!;
                      const parts = [`${c.durationMin}분`];
                      if (c.avgHR > 0) parts.push(`${c.avgHR}bpm`);
                      if (c.distance > 0) parts.push(`${c.distance}km`);
                      if (c.calories > 0) parts.push(`${c.calories}kcal`);
                      return parts.join(" · ");
                    })() : (
                      `${Number(session.total_volume_kg).toLocaleString()}kg · ${session.total_sets}세트`
                    )}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    session.status === "confirmed"
                      ? "bg-positive/20 text-positive"
                      : "bg-warning/20 text-warning"
                  }`}
                >
                  {session.status === "confirmed" ? "확정" : "초안"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !rawSessions?.length && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
            <Dumbbell className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              운동 기록이 없습니다
            </p>
            <p className="text-xs text-muted-foreground">
              Garmin에서 동기화하거나 직접 입력하세요
            </p>
          </div>
        )
      )}
    </div>
  );
}

