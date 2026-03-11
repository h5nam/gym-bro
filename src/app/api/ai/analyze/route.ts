import { getApiClient } from "@/lib/supabase/api-auth";
import { bodybuildingAgent } from "@/lib/ai/agents/bodybuilding";
import { sportsMedAgent } from "@/lib/ai/agents/sports-med";
import { nutritionAgent } from "@/lib/ai/agents/nutrition";
import { recoveryAgent } from "@/lib/ai/agents/recovery";
import { orchestrate } from "@/lib/ai/agents/orchestrator";
import { getTodayKST } from "@/lib/date-utils";
import type { AgentContext } from "@/lib/ai/agents/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const agents = [bodybuildingAgent, sportsMedAgent, nutritionAgent, recoveryAgent];

export async function POST(request: NextRequest) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { sessionId } = await request.json();

    // Create analysis job
    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .insert({
        user_id: user.id,
        trigger_type: sessionId ? "workout_confirmed" : "manual",
        trigger_session_id: sessionId ?? null,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Build context
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Fetch recent workouts with sets
    const { data: workouts } = await supabase
      .from("workout_sessions")
      .select("*, workout_sets(*)")
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .gte("started_at", sevenDaysAgo)
      .order("started_at", { ascending: false });

    // Fetch recent meals
    const { data: meals } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("meal_date", sevenDaysAgo.split("T")[0])
      .order("meal_date", { ascending: false });

    // Fetch body metrics
    const { data: metrics } = await supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", user.id)
      .gte("measured_at", thirtyDaysAgo.split("T")[0])
      .order("measured_at", { ascending: false });

    // Build trigger workout context
    let todayWorkout: AgentContext["todayWorkout"] = undefined;
    if (sessionId) {
      const triggerSession = workouts?.find((w) => w.id === sessionId);
      if (triggerSession) {
        todayWorkout = {
          sessionName: triggerSession.session_name,
          muscleGroups: triggerSession.muscle_groups,
          totalVolumeKg: Number(triggerSession.total_volume_kg),
          sets: (triggerSession.workout_sets ?? []).map(
            (s: Record<string, unknown>) => ({
              exerciseName: s.exercise_name_display as string,
              setNumber: s.set_number as number,
              reps: s.reps as number,
              weightKg: Number(s.weight_kg),
            })
          ),
        };
      }
    }

    const context: AgentContext = {
      recentWorkouts: (workouts ?? []).map((w) => ({
        sessionName: w.session_name,
        muscleGroups: w.muscle_groups,
        startedAt: w.started_at,
        totalVolumeKg: Number(w.total_volume_kg),
        totalSets: w.total_sets,
        sets: (w.workout_sets ?? []).map((s: Record<string, unknown>) => ({
          exerciseName: s.exercise_name_display as string,
          setNumber: s.set_number as number,
          reps: s.reps as number,
          weightKg: Number(s.weight_kg),
          isWarmup: s.is_warmup as boolean,
        })),
      })),
      recentMeals: (meals ?? []).map((m) => ({
        mealDate: m.meal_date,
        mealType: m.meal_type,
        totalCalories: m.total_calories,
        totalProteinG: Number(m.total_protein_g),
        totalCarbsG: Number(m.total_carbs_g),
        totalFatG: Number(m.total_fat_g),
      })),
      bodyMetrics: (metrics ?? []).map((m) => ({
        measuredAt: m.measured_at,
        weightKg: m.weight_kg ? Number(m.weight_kg) : null,
        bodyFatPct: m.body_fat_pct ? Number(m.body_fat_pct) : null,
        skeletalMuscleMassKg: m.skeletal_muscle_mass_kg
          ? Number(m.skeletal_muscle_mass_kg)
          : null,
      })),
      todayWorkout,
    };

    // Run all 4 agents in parallel
    const agentResults = await Promise.all(
      agents.map((agent) => agent.analyze(context))
    );

    // Save individual agent feedback
    for (const result of agentResults) {
      for (const feedback of result.feedbacks) {
        await supabase.from("agent_feedback").insert({
          job_id: job.id,
          agent_name: result.agentName,
          category: feedback.category,
          priority: feedback.priority,
          title: feedback.title,
          body: feedback.body,
        });
      }
    }

    // Orchestrate final report
    const report = await orchestrate(agentResults, context);

    // Save daily report
    const today = getTodayKST();
    await supabase.from("daily_reports").upsert(
      {
        user_id: user.id,
        job_id: job.id,
        report_date: today,
        workout_summary: report.workoutSummary,
        nutrition_summary: report.nutritionSummary,
        coaching_highlights: report.coachingHighlights,
        action_items: report.actionItems,
        tomorrow_plan: report.tomorrowPlan,
        full_report: report.fullReport,
      },
      { onConflict: "user_id,report_date" }
    );

    // Mark job as completed
    await supabase
      .from("analysis_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      reportDate: today,
      highlights: report.coachingHighlights.length,
      actionItems: report.actionItems,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "분석 실패" },
      { status: 500 }
    );
  }
}
