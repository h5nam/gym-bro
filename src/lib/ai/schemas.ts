import { z } from "zod";

// ============================================
// Workout Normalization
// ============================================
export const NormalizedSetSchema = z.object({
  exerciseName: z.string().describe("표준 운동 이름 (한국어)"),
  exerciseNameEn: z.string().describe("Standard exercise name (English)"),
  setNumber: z.number().describe("해당 운동 내 세트 번호"),
  reps: z.number().describe("반복 횟수"),
  weightKg: z.number().describe("중량 (kg)"),
  isWarmup: z.boolean().describe("워밍업 세트 여부"),
  muscleGroup: z.string().describe("주요 근육군"),
  notes: z.string().optional().describe("메모"),
});

export const NormalizedWorkoutSchema = z.object({
  sessionName: z.string().describe("운동 세션 이름 (예: 가슴/삼두)"),
  muscleGroups: z.array(z.string()).describe("운동한 주요 근육군 목록"),
  sets: z.array(NormalizedSetSchema),
  totalVolumeKg: z.number().describe("총 볼륨 (중량 × 반복의 합)"),
});

export type NormalizedWorkout = z.infer<typeof NormalizedWorkoutSchema>;
export type NormalizedSet = z.infer<typeof NormalizedSetSchema>;

// ============================================
// Correction
// ============================================
export const CorrectionSchema = z.object({
  setIndex: z.number().describe("수정할 세트의 인덱스 (0-based)"),
  field: z.string().describe("수정할 필드명"),
  oldValue: z.union([z.string(), z.number()]).describe("기존 값"),
  newValue: z.union([z.string(), z.number()]).describe("새 값"),
  reason: z.string().describe("수정 이유"),
});

export const CorrectionResultSchema = z.object({
  corrections: z.array(CorrectionSchema),
  updatedSets: z.array(NormalizedSetSchema),
  summary: z.string().describe("수정 요약 (한국어)"),
});

export type CorrectionResult = z.infer<typeof CorrectionResultSchema>;

// ============================================
// Meal Parsing
// ============================================
export const MealItemSchema = z.object({
  name: z.string().describe("음식 이름"),
  amount: z.string().describe("분량 (예: 200g, 1공기)"),
  calories: z.number().describe("추정 칼로리 (kcal)"),
  proteinG: z.number().describe("단백질 (g)"),
  carbsG: z.number().describe("탄수화물 (g)"),
  fatG: z.number().describe("지방 (g)"),
});

export const MealParseResultSchema = z.object({
  items: z.array(MealItemSchema),
  totalCalories: z.number(),
  totalProteinG: z.number(),
  totalCarbsG: z.number(),
  totalFatG: z.number(),
});

export type MealParseResult = z.infer<typeof MealParseResultSchema>;

// ============================================
// Agent Feedback
// ============================================
export const AgentFeedbackSchema = z.object({
  feedbacks: z.array(
    z.object({
      category: z
        .enum(["positive", "warning", "suggestion", "concern"])
        .describe("피드백 유형"),
      priority: z.number().min(1).max(10).describe("우선순위 (1=낮음, 10=높음)"),
      title: z.string().describe("피드백 제목 (한국어, 한 줄)"),
      body: z.string().describe("상세 피드백 (한국어, 2-3문장)"),
    })
  ),
});

export type AgentFeedback = z.infer<typeof AgentFeedbackSchema>;

// ============================================
// Orchestrator Report
// ============================================
export const DailyReportSchema = z.object({
  workoutSummary: z.string().describe("오늘의 운동 요약"),
  nutritionSummary: z.string().describe("오늘의 식단 요약"),
  coachingHighlights: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      category: z.enum(["positive", "warning", "suggestion", "concern"]),
    })
  ).describe("핵심 코칭 포인트 3-5개"),
  actionItems: z.array(z.string()).describe("내일의 액션 플랜 3개"),
  fullReport: z.string().describe("전체 리포트 (마크다운)"),
});

export type DailyReport = z.infer<typeof DailyReportSchema>;
