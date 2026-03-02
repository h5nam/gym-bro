import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, Timer, Flame, Gauge } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import WorkoutSetList from "@/components/workout/WorkoutSetList";
import CorrectionChat from "@/components/workout/CorrectionChat";
import ConfirmButton from "@/components/workout/ConfirmButton";

const CARDIO_TYPES = [
  "treadmill_running", "street_running", "indoor_cycling", "cycling",
  "stair_climbing", "walking", "hiking", "trail_running", "indoor_running",
  "indoor_cardio", "elliptical",
];

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) notFound();

  const muscleGroups = session.muscle_groups as string[] | null;
  const isCardio = muscleGroups?.some((g) => CARDIO_TYPES.includes(g)) ?? false;

  // For cardio sessions, fetch raw payload for detailed metrics
  let cardio: { avgHR: number; maxHR: number; distance: number; calories: number; avgSpeed: number } | null = null;
  if (isCardio && session.raw_session_id) {
    const { data: raw } = await supabase
      .from("workout_sessions_raw")
      .select("raw_payload")
      .eq("id", session.raw_session_id)
      .single();

    if (raw?.raw_payload) {
      const p = raw.raw_payload as Record<string, unknown>;
      cardio = {
        avgHR: Math.round((p.averageHR as number) ?? 0),
        maxHR: Math.round((p.maxHR as number) ?? 0),
        distance: Math.round(((p.distance as number) ?? 0) / 1000 * 10) / 10,
        calories: Math.round((p.calories as number) ?? 0),
        avgSpeed: p.averageSpeed ? Math.round((p.averageSpeed as number) * 3.6 * 10) / 10 : 0,
      };
    }
  }

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("session_id", id)
    .order("set_order", { ascending: true });

  const durationMin = Math.round((session.duration_seconds ?? 0) / 60);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/workouts"
          className="rounded-md p-1 hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{session.session_name}</h1>
          <p className="text-xs text-muted-foreground">
            {formatDate(session.started_at)}
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

      {/* Summary - Cardio */}
      {isCardio && cardio ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                <span className="text-xs">시간</span>
              </div>
              <p className="mt-1 text-lg font-bold">{durationMin}분</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Heart className="h-3.5 w-3.5" />
                <span className="text-xs">평균 심박</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {cardio.avgHR > 0 ? `${cardio.avgHR}` : "-"}
                <span className="text-sm font-normal text-muted-foreground"> bpm</span>
              </p>
              {cardio.maxHR > 0 && (
                <p className="text-xs text-muted-foreground">최대 {cardio.maxHR}bpm</p>
              )}
            </div>
            {cardio.distance > 0 && (
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="text-xs">거리</span>
                </div>
                <p className="mt-1 text-lg font-bold">
                  {cardio.distance}<span className="text-sm font-normal text-muted-foreground"> km</span>
                </p>
                {cardio.avgSpeed > 0 && (
                  <p className="text-xs text-muted-foreground">평균 {cardio.avgSpeed}km/h</p>
                )}
              </div>
            )}
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Flame className="h-3.5 w-3.5" />
                <span className="text-xs">칼로리</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {cardio.calories > 0 ? cardio.calories : "-"}
                <span className="text-sm font-normal text-muted-foreground"> kcal</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Summary - Strength */
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">총 볼륨</p>
            <p className="text-lg font-bold">
              {Number(session.total_volume_kg).toLocaleString()}kg
            </p>
          </div>
          <div className="flex-1 rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">세트 수</p>
            <p className="text-lg font-bold">{session.total_sets}</p>
          </div>
          <div className="flex-1 rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">근육군</p>
            <p className="text-sm font-medium">
              {muscleGroups?.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Sets (strength only) */}
      {!isCardio && <WorkoutSetList sets={sets ?? []} />}

      {/* Correction Chat */}
      {session.status === "draft" && (
        <CorrectionChat sessionId={id} />
      )}

      {/* Confirm Button */}
      {session.status === "draft" && (
        <ConfirmButton sessionId={id} />
      )}
    </div>
  );
}
