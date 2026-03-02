import { GarminConnect } from "garmin-connect";
import type { Connector, RawWorkoutData } from "./types";

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
    await this.client.login();
    this.authenticated = true;
  }

  async fetchRecentWorkouts(since: Date): Promise<RawWorkoutData[]> {
    await this.ensureAuth();

    // Fetch recent activities (up to 20)
    const activities = await this.client.getActivities(0, 20);

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
        durationSeconds: (a.duration as number) ?? 0,
      }));
  }

  async fetchExerciseSets(
    activityId: string
  ): Promise<Record<string, unknown> | null> {
    await this.ensureAuth();

    try {
      // Use the undocumented but well-known Garmin endpoint for exercise sets
      const url = `/activity-service/activity/${activityId}/exerciseSets`;
      const data = await (this.client as unknown as {
        get: <T>(url: string) => Promise<T>;
      }).get<Record<string, unknown>>(url);
      return data;
    } catch (error) {
      console.error(
        `Failed to fetch exercise sets for activity ${activityId}:`,
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
