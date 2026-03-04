import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodayKST } from "@/lib/date-utils";
import { CARDIO_TYPES } from "@/lib/constants";

export async function GET() {
  try {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStr = getTodayKST();

  const [profileResult, mealsResult, metricsResult, workoutsResult, reportResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single(),
      supabase
        .from("meal_logs")
        .select("total_calories, total_protein_g, total_carbs_g, total_fat_g")
        .eq("user_id", user.id)
        .eq("meal_date", todayStr),
      supabase
        .from("body_metrics")
        .select("weight_kg, measured_at")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("workout_sessions")
        .select(
          "id, session_name, started_at, duration_seconds, total_volume_kg, total_sets, status, muscle_groups, raw_session_id"
        )
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(3),
      supabase
        .from("daily_reports")
        .select("coaching_highlights")
        .eq("user_id", user.id)
        .order("report_date", { ascending: false })
        .limit(1)
        .single(),
    ]);

  // Aggregate meal totals
  const meals = mealsResult.data;
  const todayMeals =
    meals && meals.length > 0
      ? meals.reduce(
          (acc, m) => ({
            calories: acc.calories + (m.total_calories ?? 0),
            protein: acc.protein + (m.total_protein_g ?? 0),
            carbs: acc.carbs + (m.total_carbs_g ?? 0),
            fat: acc.fat + (m.total_fat_g ?? 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )
      : null;

  // Build recent workouts with cardio metrics
  const sessions = workoutsResult.data ?? [];
  const cardioSessions = sessions.filter((s) => {
    const mg = s.muscle_groups as string[] | null;
    return mg?.some((g) => CARDIO_TYPES.includes(g));
  });
  const rawIds = cardioSessions
    .map((s) => s.raw_session_id)
    .filter(Boolean) as string[];

  let rawMap = new Map<string, Record<string, unknown>>();
  if (rawIds.length > 0) {
    const { data: rawPayloads } = await supabase
      .from("workout_sessions_raw")
      .select("id, raw_payload")
      .in("id", rawIds);
    rawMap = new Map(
      (rawPayloads ?? []).map((r) => [
        r.id,
        r.raw_payload as Record<string, unknown>,
      ])
    );
  }

  const recentWorkouts = sessions.map((s) => {
    const mg = s.muscle_groups as string[] | null;
    const isCardio = mg?.some((g) => CARDIO_TYPES.includes(g)) ?? false;
    const raw = isCardio && s.raw_session_id ? rawMap.get(s.raw_session_id) : undefined;

    return {
      id: s.id,
      session_name: s.session_name,
      started_at: s.started_at,
      duration_seconds: s.duration_seconds,
      total_volume_kg: Number(s.total_volume_kg),
      total_sets: s.total_sets,
      status: s.status,
      muscle_groups: mg,
      isCardio,
      ...(isCardio && raw
        ? {
            cardio: {
              durationMin: Math.round((s.duration_seconds ?? 0) / 60),
              avgHR: Math.round((raw.averageHR as number) ?? 0),
              distance:
                Math.round(
                  (((raw.distance as number) ?? 0) / 1000) * 10
                ) / 10,
              calories: Math.round((raw.calories as number) ?? 0),
            },
          }
        : {}),
    };
  });

  const highlights = reportResult.data?.coaching_highlights as
    | { title: string; body: string }[]
    | null;
  const latestCoachingHighlight =
    highlights && highlights.length > 0 ? highlights[0] : null;

  return NextResponse.json({
    userName:
      profileResult.data?.display_name ?? user.email?.split("@")[0] ?? "사용자",
    todayMeals,
    latestBodyMetric: metricsResult.data
      ? {
          weight_kg: metricsResult.data.weight_kg,
          measured_at: metricsResult.data.measured_at,
        }
      : null,
    recentWorkouts,
    latestCoachingHighlight,
    todayDateString: todayStr,
  });
  } catch {
    return NextResponse.json(
      { error: "대시보드 데이터를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
