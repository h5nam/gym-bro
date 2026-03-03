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
    activityId: string
  ): Promise<Record<string, unknown> | null> {
    await this.ensureAuth();

    try {
      const url = `${GC_API}/activity-service/activity/${activityId}/exerciseSets`;
      const data = await this.client.get<Record<string, unknown>>(url);
      return data;
    } catch (error) {
      console.error(
        `[Garmin] Failed to fetch exercise sets for ${activityId}:`,
        error
      );
      return null;
    }
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
