export interface AgentContext {
  // Recent workout data (last 7 days)
  recentWorkouts: Array<{
    sessionName: string;
    muscleGroups: string[];
    startedAt: string;
    totalVolumeKg: number;
    totalSets: number;
    sets: Array<{
      exerciseName: string;
      setNumber: number;
      reps: number;
      weightKg: number;
      isWarmup: boolean;
    }>;
  }>;

  // Recent meals (last 7 days)
  recentMeals: Array<{
    mealDate: string;
    mealType: string;
    totalCalories: number;
    totalProteinG: number;
    totalCarbsG: number;
    totalFatG: number;
  }>;

  // Body metrics (last 30 days)
  bodyMetrics: Array<{
    measuredAt: string;
    weightKg: number | null;
    bodyFatPct: number | null;
    skeletalMuscleMassKg: number | null;
  }>;

  // Today's trigger workout (if applicable)
  todayWorkout?: {
    sessionName: string;
    muscleGroups: string[];
    totalVolumeKg: number;
    sets: Array<{
      exerciseName: string;
      setNumber: number;
      reps: number;
      weightKg: number;
    }>;
  };
}

export interface AgentOutput {
  agentName: string;
  feedbacks: Array<{
    category: "positive" | "warning" | "suggestion" | "concern";
    priority: number;
    title: string;
    body: string;
  }>;
}

export interface Agent {
  name: string;
  displayNameKo: string;
  analyze(context: AgentContext): Promise<AgentOutput>;
}
