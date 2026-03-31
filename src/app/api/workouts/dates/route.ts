import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "@/lib/supabase/api-auth";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [sessionsResult, rawResult] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select("id, started_at, status, session_name, duration_seconds, total_volume_kg, muscle_groups")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false }),
      supabase
        .from("workout_sessions_raw")
        .select("id, started_at")
        .eq("user_id", user.id)
        .eq("processed", false)
        .order("started_at", { ascending: false }),
    ]);

    return NextResponse.json({
      sessions: sessionsResult.data ?? [],
      rawDates: (rawResult.data ?? []).map((r) => r.started_at),
    });
  } catch {
    return NextResponse.json(
      { error: "운동 날짜를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
