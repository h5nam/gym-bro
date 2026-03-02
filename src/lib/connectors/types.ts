export interface RawWorkoutData {
  sourceId: string;
  sourceName: "garmin" | "manual";
  rawPayload: Record<string, unknown>;
  exerciseSetsPayload?: Record<string, unknown>;
  activityType: string;
  startTime: string;
  durationSeconds: number;
}

export interface Connector {
  name: string;
  fetchRecentWorkouts(since: Date): Promise<RawWorkoutData[]>;
  fetchExerciseSets(activityId: string): Promise<Record<string, unknown> | null>;
}
