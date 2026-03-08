import { GarminConnect } from "garmin-connect";
import type { Connector, RawWorkoutData } from "./types";

const GC_API = "https://connectapi.garmin.com";

export class GarminConnector implements Connector {
  name = "garmin" as const;
  private client: InstanceType<typeof GarminConnect>;
  private authenticated = false;

  constructor() {
    this.client = new GarminConnect({
      username: process.env.GARMIN_USERNAME!,
      password: process.env.GARMIN_PASSWORD!,
    });
  }

  private async ensureAuth(): Promise<void> {
    if (this.authenticated) return;
    console.log("[Garmin] Logging in...");
    await this.client.login();
    this.authenticated = true;
    console.log("[Garmin] Login successful");
  }

  async fetchRecentWorkouts(since: Date): Promise<RawWorkoutData[]> {
    await this.ensureAuth();

    const activities = await this.client.getActivities(0, 100);
    console.log(`[Garmin] Fetched ${activities.length} activities`);

    return activities
      .filter((a) => {
        const startTime = a.startTimeLocal;
        if (!startTime) return false;
        return new Date(startTime) >= since;
      })
      .map((a) => ({
        sourceId: String(a.activityId),
        sourceName: "garmin" as const,
        rawPayload: a as unknown as Record<string, unknown>,
        activityType:
          (a.activityType as unknown as Record<string, string>)?.typeKey ??
          "unknown",
        startTime: a.startTimeLocal as string,
        durationSeconds: Math.round((a.duration as number) ?? 0),
      }));
  }

  async fetchExerciseSets(
    activityId: string,
    retries = 2
  ): Promise<Record<string, unknown> | null> {
    await this.ensureAuth();

    const url = `${GC_API}/activity-service/activity/${activityId}/exerciseSets`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Garmin] Retry ${attempt}/${retries} for exerciseSets ${activityId}`);
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
        const data = await this.client.get<Record<string, unknown>>(url);

        // Validate response has actual exercise data
        if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
          console.warn(`[Garmin] Empty exerciseSets response for ${activityId}:`, JSON.stringify(data));
          if (attempt < retries) continue;
          return null;
        }

        console.log(`[Garmin] exerciseSets fetched for ${activityId}, keys: ${Object.keys(data).join(", ")}`);
        return data;
      } catch (error) {
        console.error(
          `[Garmin] Failed to fetch exercise sets for ${activityId} (attempt ${attempt + 1}):`,
          error
        );
        if (attempt === retries) return null;
      }
    }

    return null;
  }
}

// Singleton instance
let instance: GarminConnector | null = null;

export function getGarminConnector(): GarminConnector {
  if (!instance) {
    instance = new GarminConnector();
  }
  return instance;
}
