import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai/gemini";
import { buildChatSystemPrompt, type ChatContext } from "@/lib/ai/prompts/chat";
import { getTodayKST } from "@/lib/date-utils";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "메시지가 필요합니다" },
        { status: 400 }
      );
    }
    if (message.length > 2000) {
      return NextResponse.json(
        { error: "메시지가 너무 깁니다 (최대 2000자)" },
        { status: 400 }
      );
    }

    const todayStr = getTodayKST();

    // Fetch context data in parallel
    const [workoutsResult, mealsResult, metricsResult, reportResult, profileResult] =
      await Promise.all([
        supabase
          .from("workout_sessions")
          .select("session_name, started_at, total_volume_kg, total_sets")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(7),
        supabase
          .from("meal_logs")
          .select("total_calories, total_protein_g, total_carbs_g, total_fat_g")
          .eq("user_id", user.id)
          .eq("meal_date", todayStr),
        supabase
          .from("body_metrics")
          .select("weight_kg, body_fat_pct, skeletal_muscle_mass_kg")
          .eq("user_id", user.id)
          .order("measured_at", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("daily_reports")
          .select("full_report")
          .eq("user_id", user.id)
          .order("report_date", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("profiles")
          .select("display_name, ai_memory")
          .eq("id", user.id)
          .single(),
      ]);

    // Aggregate today's meals
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

    const context: ChatContext = {
      recentWorkouts: (workoutsResult.data ?? []).map((w) => ({
        sessionName: w.session_name,
        startedAt: w.started_at,
        totalVolumeKg: Number(w.total_volume_kg),
        totalSets: w.total_sets,
      })),
      todayMeals,
      bodyMetrics: metricsResult.data
        ? {
            weightKg: metricsResult.data.weight_kg,
            bodyFatPct: metricsResult.data.body_fat_pct,
            skeletalMuscleMassKg: metricsResult.data.skeletal_muscle_mass_kg,
          }
        : null,
      latestReport: reportResult.data?.full_report ?? null,
      aiMemory: profileResult.data?.ai_memory ?? null,
      userName: profileResult.data?.display_name ?? "사용자",
    };

    const systemPrompt = buildChatSystemPrompt(context);
    const reply = await generateText(message, { systemPrompt });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "AI 응답 생성 실패" },
      { status: 500 }
    );
  }
}
