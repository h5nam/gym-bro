import { getApiClient } from "@/lib/supabase/api-auth";
import { generateStructured } from "@/lib/ai/gemini";
import { MealParseResultSchema } from "@/lib/ai/schemas";
import { buildMealParsePrompt } from "@/lib/ai/prompts/meal-parse";
import { getTodayKST } from "@/lib/date-utils";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { text, mealType, date, parsedData } = await request.json();

    if (!mealType) {
      return NextResponse.json(
        { error: "mealType이 필요합니다" },
        { status: 400 }
      );
    }

    let parsed;
    if (parsedData) {
      // Already analyzed (from image or text preview) — use directly
      parsed = MealParseResultSchema.parse(parsedData);
    } else if (text) {
      // Parse meal with Gemini (retry once on failure)
      const prompt = buildMealParsePrompt(text);
      try {
        parsed = await generateStructured(prompt, MealParseResultSchema);
      } catch (firstErr) {
        console.warn("Gemini first attempt failed, retrying in 2s:", firstErr);
        await new Promise((r) => setTimeout(r, 2000));
        parsed = await generateStructured(prompt, MealParseResultSchema);
      }
    } else {
      return NextResponse.json(
        { error: "text 또는 parsedData가 필요합니다" },
        { status: 400 }
      );
    }

    const mealDate = date ?? getTodayKST();

    // Store in DB
    const { data: meal, error: insertError } = await supabase
      .from("meal_logs")
      .insert({
        user_id: user.id,
        meal_type: mealType,
        meal_date: mealDate,
        raw_text: text ?? parsed.items.map((i: { name: string }) => i.name).join(", ") + " (사진 분석)",
        parsed_items: parsed.items,
        total_calories: Math.round(parsed.totalCalories),
        total_protein_g: Math.round(parsed.totalProteinG * 10) / 10,
        total_carbs_g: Math.round(parsed.totalCarbsG * 10) / 10,
        total_fat_g: Math.round(parsed.totalFatG * 10) / 10,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, meal });
  } catch (error) {
    console.error("Meal parse error:", error);
    const message = error instanceof Error ? error.message : "Unknown";
    const isRateLimit =
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("rate");
    return NextResponse.json(
      {
        error: isRateLimit
          ? "AI 요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요."
          : "식단 파싱 실패",
      },
      { status: isRateLimit ? 429 : 500 }
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? getTodayKST();

    const { data: meals } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("meal_date", date)
      .order("created_at", { ascending: true });

    // Fetch recent distinct meals for quick-add
    const { data: recentMeals } = await supabase
      .from("meal_logs")
      .select("raw_text, meal_type, total_calories")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const seen = new Set<string>();
    const recentItems = (recentMeals ?? [])
      .filter((m) => {
        if (seen.has(m.raw_text)) return false;
        seen.add(m.raw_text);
        return true;
      })
      .slice(0, 10);

    return NextResponse.json({ meals: meals ?? [], recentItems });
  } catch (error) {
    console.error("Meal fetch error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
