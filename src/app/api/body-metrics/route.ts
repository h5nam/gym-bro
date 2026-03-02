import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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
        measured_at: body.measuredAt ?? new Date().toISOString().split("T")[0],
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
      {
        error: "저장 실패",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { data: metrics } = await supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(30);

    return NextResponse.json({ metrics: metrics ?? [] });
  } catch (error) {
    console.error("Body metrics fetch error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
