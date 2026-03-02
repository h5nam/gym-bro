import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "daily";
    const date = searchParams.get("date");

    if (type === "daily") {
      const reportDate = date ?? new Date().toISOString().split("T")[0];

      const { data: report } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("report_date", reportDate)
        .single();

      return NextResponse.json({ report: report ?? null });
    }

    if (type === "weekly") {
      const { data: reports } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(4);

      return NextResponse.json({ reports: reports ?? [] });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
