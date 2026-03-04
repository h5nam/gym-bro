import { generateText } from "./gemini";
import {
  buildMemoryGenerationPrompt,
  type MemoryGenerationContext,
} from "./prompts/memory";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function generateAndSaveMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; memoryLength: number; error?: string }> {
  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [profileResult, workoutsResult, mealsResult, metricsResult, reportResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name, height_cm, birth_year, training_goal, experience_level, ai_memory"
          )
          .eq("id", userId)
          .single(),
        supabase
          .from("workout_sessions")
          .select(
            "session_name, muscle_groups, started_at, total_volume_kg, total_sets, duration_seconds, ai_session_feedback"
          )
          .eq("user_id", userId)
          .gte("started_at", thirtyDaysAgo)
          .order("started_at", { ascending: true }),
        supabase
          .from("meal_logs")
          .select("meal_date, total_calories, total_protein_g, total_carbs_g, total_fat_g")
          .eq("user_id", userId)
          .gte("meal_date", thirtyDaysAgo.split("T")[0]),
        supabase
          .from("body_metrics")
          .select("measured_at, weight_kg, body_fat_pct, skeletal_muscle_mass_kg")
          .eq("user_id", userId)
          .gte("measured_at", thirtyDaysAgo)
          .order("measured_at", { ascending: true }),
        supabase
          .from("daily_reports")
          .select("full_report")
          .eq("user_id", userId)
          .order("report_date", { ascending: false })
          .limit(1)
          .single(),
      ]);

    const profile = profileResult.data;
    if (!profile) {
      return { success: false, memoryLength: 0, error: "Profile not found" };
    }

    // Aggregate meal data into daily averages
    const meals = mealsResult.data ?? [];
    const dailyTotals = new Map<
      string,
      { calories: number; protein: number; carbs: number; fat: number }
    >();
    for (const m of meals) {
      const existing = dailyTotals.get(m.meal_date) ?? {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      existing.calories += m.total_calories ?? 0;
      existing.protein += m.total_protein_g ?? 0;
      existing.carbs += m.total_carbs_g ?? 0;
      existing.fat += m.total_fat_g ?? 0;
      dailyTotals.set(m.meal_date, existing);
    }

    const daysTracked = dailyTotals.size;
    const dailyMealAverages =
      daysTracked > 0
        ? {
            avgCalories:
              [...dailyTotals.values()].reduce((s, d) => s + d.calories, 0) /
              daysTracked,
            avgProtein:
              [...dailyTotals.values()].reduce((s, d) => s + d.protein, 0) /
              daysTracked,
            avgCarbs:
              [...dailyTotals.values()].reduce((s, d) => s + d.carbs, 0) /
              daysTracked,
            avgFat:
              [...dailyTotals.values()].reduce((s, d) => s + d.fat, 0) /
              daysTracked,
            daysTracked,
          }
        : { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, daysTracked: 0 };

    const context: MemoryGenerationContext = {
      profile: {
        displayName: profile.display_name ?? "사용자",
        heightCm: profile.height_cm,
        birthYear: profile.birth_year,
        trainingGoal: profile.training_goal,
        experienceLevel: profile.experience_level,
      },
      workoutSummaries: (workoutsResult.data ?? []).map((w) => ({
        date: w.started_at.split("T")[0],
        sessionName: w.session_name,
        muscleGroups: w.muscle_groups ?? [],
        totalVolumeKg: Number(w.total_volume_kg),
        totalSets: w.total_sets,
        durationSeconds: w.duration_seconds ?? 0,
        feedback: w.ai_session_feedback,
      })),
      dailyMealAverages,
      bodyMetricsTrend: (metricsResult.data ?? []).map((b) => ({
        date: b.measured_at.split("T")[0],
        weightKg: b.weight_kg,
        bodyFatPct: b.body_fat_pct,
        skeletalMuscleMassKg: b.skeletal_muscle_mass_kg,
      })),
      latestReport: reportResult.data?.full_report ?? null,
      previousMemory: profile.ai_memory,
    };

    const prompt = buildMemoryGenerationPrompt(context);
    const memory = await generateText(prompt, {
      model: "gemini-3.1-pro-preview",
    });

    await supabase
      .from("profiles")
      .update({
        ai_memory: memory,
        ai_memory_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    console.log(
      `[MemoryUpdate] Updated memory for ${userId} (${memory.length} chars)`
    );

    return { success: true, memoryLength: memory.length };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[MemoryUpdate] Failed for ${userId}:`, msg);
    return { success: false, memoryLength: 0, error: msg };
  }
}
