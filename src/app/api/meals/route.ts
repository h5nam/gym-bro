import { createClient } from "@/lib/supabase/server";
import { generateStructured } from "@/lib/ai/gemini";
import { MealParseResultSchema } from "@/lib/ai/schemas";
import { buildMealParsePrompt } from "@/lib/ai/prompts/meal-parse";
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

    const { text, mealType } = await request.json();

    if (!text || !mealType) {
      return NextResponse.json(
        { error: "text와 mealType이 필요합니다" },
        { status: 400 }
      );
    }

    // Parse meal with Gemini
    const prompt = buildMealParsePrompt(text);
    const parsed = await generateStructured(prompt, MealParseResultSchema);

    // Store in DB
    const { data: meal, error: insertError } = await supabase
      .from("meal_logs")
      .insert({
        user_id: user.id,
        meal_type: mealType,
        raw_text: text,
        parsed_items: parsed.items,
        total_calories: parsed.totalCalories,
        total_protein_g: parsed.totalProteinG,
        total_carbs_g: parsed.totalCarbsG,
        total_fat_g: parsed.totalFatG,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, meal });
  } catch (error) {
    console.error("Meal parse error:", error);
    return NextResponse.json(
      {
        error: "식단 파싱 실패",
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

    const today = new Date().toISOString().split("T")[0];

    const { data: meals } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("meal_date", today)
      .order("created_at", { ascending: true });

    return NextResponse.json({ meals: meals ?? [] });
  } catch (error) {
    console.error("Meal fetch error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
