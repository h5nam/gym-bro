import { fetchWithAuth } from "@/lib/fetch";

// --- Response types ---

export interface DashboardResponse {
  userName: string;
  todayMeals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  latestBodyMetric: { weight_kg: number; measured_at: string } | null;
  recentWorkouts: Array<{
    id: string;
    session_name: string;
    started_at: string;
    duration_seconds: number;
    total_volume_kg: number;
    total_sets: number;
    status: string;
    muscle_groups: string[] | null;
    isCardio: boolean;
    cardio?: {
      durationMin: number;
      avgHR: number;
      distance: number;
      calories: number;
    };
  }>;
  latestCoachingHighlight: { title: string; body: string } | null;
  todayDateString: string;
}

export interface WorkoutsResponse {
  sessions: unknown[];
  rawSessions: unknown[];
  cardioMetrics: Record<
    string,
    { durationMin: number; avgHR: number; distance: number; calories: number }
  >;
}

export interface MealsResponse {
  meals: Array<{
    id: string;
    meal_type: string;
    raw_text: string;
    total_calories: number;
    total_protein_g: number;
    total_carbs_g: number;
    total_fat_g: number;
    parsed_items: Array<{
      name: string;
      amount: string;
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    }>;
    created_at: string;
  }>;
  recentItems: Array<{
    raw_text: string;
    meal_type: string;
    total_calories: number;
  }>;
}

export interface BodyMetricsResponse {
  metrics: Array<{
    id: string;
    measured_at: string;
    weight_kg: number | null;
    body_fat_pct: number | null;
    skeletal_muscle_mass_kg: number | null;
    bmi: number | null;
    notes: string | null;
  }>;
}

export interface DailyReportResponse {
  report: unknown;
  agentFeedback: unknown[];
}

// --- Query key factory ---

export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
  },
  workouts: {
    all: ["workouts"] as const,
  },
  meals: {
    all: ["meals"] as const,
    byDate: (date: string) => ["meals", date] as const,
    dates: () => ["meals", "dates"] as const,
  },
  bodyMetrics: {
    all: ["bodyMetrics"] as const,
  },
  reports: {
    dates: () => ["reports", "dates"] as const,
    daily: (date: string) => ["reports", "daily", date] as const,
  },
} as const;

// --- Typed fetch helpers ---

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetchWithAuth("/api/dashboard");
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export async function fetchWorkouts(): Promise<WorkoutsResponse> {
  const res = await fetchWithAuth("/api/workouts");
  if (!res.ok) throw new Error("Failed to fetch workouts");
  return res.json();
}

export async function fetchMealsByDate(date: string): Promise<MealsResponse> {
  const res = await fetchWithAuth(`/api/meals?date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch meals");
  return res.json();
}

export async function fetchMealDates(): Promise<{ dates: string[] }> {
  const res = await fetchWithAuth("/api/meals/dates");
  if (!res.ok) throw new Error("Failed to fetch meal dates");
  return res.json();
}

export async function fetchBodyMetrics(): Promise<BodyMetricsResponse> {
  const res = await fetchWithAuth("/api/body-metrics");
  if (!res.ok) throw new Error("Failed to fetch body metrics");
  return res.json();
}

export async function fetchReportDates(): Promise<{ dates: string[] }> {
  const res = await fetchWithAuth("/api/ai/report?type=dates");
  if (!res.ok) throw new Error("Failed to fetch report dates");
  return res.json();
}

export async function fetchDailyReport(date: string): Promise<DailyReportResponse> {
  const res = await fetchWithAuth(`/api/ai/report?type=daily&date=${date}`);
  if (!res.ok) throw new Error("Failed to fetch report");
  return res.json();
}
