import { getApiClient } from "@/lib/supabase/api-auth";
import { getTodayKST } from "@/lib/date-utils";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();

    const { data: metric, error } = await supabase
      .from("body_metrics")
      .insert({
        user_id: user.id,
        measured_at: body.measuredAt ?? getTodayKST(),
        weight_kg: body.weightKg,
        body_fat_pct: body.bodyFatPct,
        muscle_mass_kg: body.muscleMassKg,
        bmi: body.bmi,
        skeletal_muscle_mass_kg: body.skeletalMuscleMassKg,
        body_water_pct: body.bodyWaterPct,
        source: body.source ?? "manual",
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, metric });
  } catch (error) {
    console.error("Body metrics error:", error);
    return NextResponse.json(
      { error: "저장 실패" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // Fetch newest 30 records in DESC order, then reverse for chronological display
    const { data: metrics } = await supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(30);

    // Reverse to ascending order for client-side charts
    metrics?.reverse();

    return NextResponse.json({ metrics: metrics ?? [] });
  } catch (error) {
    console.error("Body metrics fetch error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
