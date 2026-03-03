import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CARDIO_TYPES } from "@/lib/constants";
import WorkoutDetailView, {
  type SessionDetailData,
  type SetData,
  type CardioData,
} from "@/components/workout/WorkoutDetailView";

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
  const isCardio =
    muscleGroups?.some((g) => CARDIO_TYPES.includes(g)) ?? false;

  // Cardio metrics from raw payload
  let cardio: CardioData | null = null;
  if (isCardio && session.raw_session_id) {
    const { data: raw } = await supabase
      .from("workout_sessions_raw")
      .select("raw_payload")
      .eq("id", session.raw_session_id)
      .single();

    if (raw?.raw_payload) {
      const p = raw.raw_payload as Record<string, unknown>;
      const rawStride = Number(p.avgStrideLength) || 0;
      const rawMoving = Number(p.movingDuration) || 0;
      cardio = {
        avgHR: Math.round((p.averageHR as number) ?? 0),
        maxHR: Math.round((p.maxHR as number) ?? 0),
        distance:
          Math.round((((p.distance as number) ?? 0) / 1000) * 10) / 10,
        calories: Math.round((p.calories as number) ?? 0),
        avgSpeed: p.averageSpeed
          ? Math.round((p.averageSpeed as number) * 3.6 * 10) / 10
          : 0,
        maxSpeed: p.maxSpeed
          ? Math.round((p.maxSpeed as number) * 3.6 * 10) / 10
          : 0,
        elevationGain: Math.round(Number(p.elevationGain) || 0),
        elevationLoss: Math.round(Number(p.elevationLoss) || 0),
        avgCadence: Math.round(
          Number(p.averageRunningCadenceInStepsPerMinute) || 0
        ),
        maxCadence: Math.round(
          Number(p.maxRunningCadenceInStepsPerMinute) || 0
        ),
        aerobicTE:
          Math.round((Number(p.aerobicTrainingEffect) || 0) * 10) / 10,
        anaerobicTE:
          Math.round((Number(p.anaerobicTrainingEffect) || 0) * 10) / 10,
        vO2Max: Math.round(Number(p.vO2MaxValue) || 0),
        avgStrideLength:
          rawStride > 5
            ? Math.round((rawStride / 100) * 100) / 100
            : Math.round(rawStride * 100) / 100,
        steps: Math.round(Number(p.steps) || 0),
        movingDuration:
          rawMoving > 86400 ? Math.round(rawMoving / 1000) : Math.round(rawMoving),
        lapCount: Math.round(Number(p.lapCount) || 0),
      };
    }
  }

  // Workout sets (strength)
  const { data: sets } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("session_id", id)
    .order("set_order", { ascending: true });

  return (
    <WorkoutDetailView
      session={session as unknown as SessionDetailData}
      sets={(sets ?? []) as SetData[]}
      cardio={cardio}
      isCardio={isCardio}
    />
  );
}
