import { createClient } from "@/lib/supabase/server";
import { getGarminConnector } from "@/lib/connectors/garmin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // Get or create data source for Garmin
    let { data: dataSource } = await supabase
      .from("data_sources")
      .select("*")
      .eq("user_id", user.id)
      .eq("source_type", "garmin")
      .single();

    if (!dataSource) {
      const { data: newSource, error: createError } = await supabase
        .from("data_sources")
        .insert({
          user_id: user.id,
          source_type: "garmin",
          sync_status: "idle",
        })
        .select()
        .single();

      if (createError) throw createError;
      dataSource = newSource;
    }

    // Update sync status
    await supabase
      .from("data_sources")
      .update({ sync_status: "syncing", error_message: null })
      .eq("id", dataSource.id);

    // Determine since date (last sync or 7 days ago)
    const since = dataSource.last_sync_at
      ? new Date(dataSource.last_sync_at)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch workouts from Garmin
    const connector = getGarminConnector();
    const workouts = await connector.fetchRecentWorkouts(since);

    let synced = 0;
    let skipped = 0;

    for (const workout of workouts) {
      // Check for duplicate
      const { data: existing } = await supabase
        .from("workout_sessions_raw")
        .select("id")
        .eq("data_source_id", dataSource.id)
        .eq("source_activity_id", workout.sourceId)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Fetch exercise sets for strength training activities
      let exerciseSetsPayload = null;
      if (
        workout.activityType === "strength_training" ||
        workout.activityType === "STRENGTH_TRAINING"
      ) {
        exerciseSetsPayload = await connector.fetchExerciseSets(
          workout.sourceId
        );
      }

      // Store raw data
      const { error: insertError } = await supabase
        .from("workout_sessions_raw")
        .insert({
          user_id: user.id,
          data_source_id: dataSource.id,
          source_activity_id: workout.sourceId,
          raw_payload: workout.rawPayload,
          exercise_sets_payload: exerciseSetsPayload,
          activity_type: workout.activityType,
          started_at: workout.startTime,
          duration_seconds: workout.durationSeconds,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        continue;
      }

      synced++;
    }

    // Update last sync time
    await supabase
      .from("data_sources")
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: "idle",
      })
      .eq("id", dataSource.id);

    return NextResponse.json({
      success: true,
      total: workouts.length,
      synced,
      skipped,
    });
  } catch (error) {
    console.error("Garmin sync error:", error);

    // Try to update sync status to error
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("data_sources")
          .update({
            sync_status: "error",
            error_message: error instanceof Error ? error.message : "Unknown",
          })
          .eq("user_id", user.id)
          .eq("source_type", "garmin");
      }
    } catch {
      // ignore
    }

    return NextResponse.json(
      {
        error: "동기화 실패",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
