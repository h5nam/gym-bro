import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "@/lib/supabase/api-auth";
import { CARDIO_TYPES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
  const supabase = await getApiClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse month filter (e.g. ?month=2026-03)
  const monthParam = request.nextUrl.searchParams.get("month");
  let rangeStart: string | undefined;
  let rangeEnd: string | undefined;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    rangeStart = new Date(y, m - 1, 1).toISOString();
    rangeEnd = new Date(y, m, 1).toISOString();
  }

  // Fetch sessions and raw sessions in parallel
  let sessionsQuery = supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  let rawQuery = supabase
    .from("workout_sessions_raw")
    .select("id, activity_type, started_at, processed")
    .eq("user_id", user.id)
    .eq("processed", false)
    .order("started_at", { ascending: false });

  if (rangeStart && rangeEnd) {
    sessionsQuery = sessionsQuery.gte("started_at", rangeStart).lt("started_at", rangeEnd);
    rawQuery = rawQuery.gte("started_at", rangeStart).lt("started_at", rangeEnd);
  } else {
    sessionsQuery = sessionsQuery.limit(50);
  }

  const [sessionsResult, rawSessionsResult] = await Promise.all([
    sessionsQuery,
    rawQuery,
  ]);

  const sessions = sessionsResult.data ?? [];

  // Build cardio metrics
  const cardioMetrics: Record<
    string,
    { durationMin: number; avgHR: number; distance: number; calories: number }
  > = {};

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
      (rawPayloads ?? []).map((r) => [
        r.id,
        r.raw_payload as Record<string, unknown>,
      ])
    );

    for (const s of cardioSessions) {
      const p = rawMap.get(s.raw_session_id);
      cardioMetrics[s.id] = {
        durationMin: Math.round((s.duration_seconds ?? 0) / 60),
        avgHR: p ? Math.round((p.averageHR as number) ?? 0) : 0,
        distance: p
          ? Math.round((((p.distance as number) ?? 0) / 1000) * 10) / 10
          : 0,
        calories: p ? Math.round((p.calories as number) ?? 0) : 0,
      };
    }
  }

  return NextResponse.json({
    sessions,
    rawSessions: rawSessionsResult.data ?? [],
    cardioMetrics,
  });
  } catch {
    return NextResponse.json(
      { error: "운동 데이터를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
