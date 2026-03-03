import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const { data } = await supabase
      .from("meal_logs")
      .select("meal_date")
      .eq("user_id", user.id);

    const dates = [...new Set((data ?? []).map((d) => d.meal_date))];

    return NextResponse.json({ dates });
  } catch (error) {
    console.error("Meal dates fetch error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
