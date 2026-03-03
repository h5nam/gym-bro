import { generateStructured } from "../gemini";
import { DailyReportSchema } from "../schemas";
import { getTodayKST } from "../../date-utils";
import type { AgentContext, AgentOutput } from "./types";
import type { DailyReport } from "../schemas";

export async function orchestrate(
  agentOutputs: AgentOutput[],
  context: AgentContext
): Promise<DailyReport> {
  // Collect all feedbacks with agent attribution
  const allFeedbacks = agentOutputs.flatMap((output) =>
    output.feedbacks.map((f) => ({
      ...f,
      agentName: output.agentName,
    }))
  );

  // Sort by priority (highest first)
  allFeedbacks.sort((a, b) => b.priority - a.priority);

  const todayStr = getTodayKST();
  const todayMeals = context.recentMeals.filter((m) => m.mealDate === todayStr);
  const todayCalories = todayMeals.reduce((sum, m) => sum + m.totalCalories, 0);
  const todayProtein = todayMeals.reduce((sum, m) => sum + m.totalProteinG, 0);

  // Build 7-day workout history summary for tomorrow planning
  const workoutHistory = context.recentWorkouts
    .map((w) => `${w.startedAt.split("T")[0]}: ${w.sessionName} (${w.muscleGroups.join(", ")})`)
    .join("\n");

  const prompt = `당신은 피트니스 코칭 오케스트레이터입니다.
여러 전문 코치의 피드백을 종합하여 **오늘 코칭 리포트**와 **내일 추천 계획**을 작성해주세요.

## 코치별 피드백
${allFeedbacks
  .map(
    (f) =>
      `[${f.agentName}] (${f.category}, 우선순위 ${f.priority}) ${f.title}: ${f.body}`
  )
  .join("\n\n")}

## 오늘의 운동
${context.todayWorkout ? `${context.todayWorkout.sessionName} — 총 볼륨 ${context.todayWorkout.totalVolumeKg}kg` : "휴식일"}

## 오늘의 식단
${todayMeals.length > 0 ? `총 ${todayCalories}kcal, 단백질 ${todayProtein.toFixed(0)}g` : "식단 데이터 없음"}

## 최근 7일 운동 이력 (내일 계획 수립용)
${workoutHistory || "운동 기록 없음"}

## 최근 체성분
${context.bodyMetrics.length > 0 ? `체중 ${context.bodyMetrics[0].weightKg ?? "?"}kg` : "체성분 데이터 없음"}

## Part 1: 오늘 코칭 규칙
1. 코치 간 상충되는 의견이 있으면 우선순위를 고려하여 조율하세요.
2. coachingHighlights는 "오늘" 중심 핵심 포인트 3-5개로 정리하세요.
3. 장황한 설명보다 구체적 수치 기반의 피드백을 제시하세요.
4. 의료적 조언은 제외하세요.

## Part 2: 내일 계획 규칙
1. tomorrowPlan.workoutRecommendation: 오늘 운동 부위와 7일 이력을 고려하여 내일 추천 운동을 작성하세요. 추천 부위, 주요 종목 2-3개, 목표 세트/반복 수를 포함하세요. 휴식이 필요하면 휴식을 추천하세요.
2. tomorrowPlan.nutritionGoal: 내일 운동 계획에 맞는 칼로리/단백질 목표를 제시하세요.
3. tomorrowPlan.keyFocus: 내일 가장 중요한 한 가지를 한 줄로 요약하세요.
4. actionItems: 내일 실행할 구체적 계획 3개를 작성하세요 (예: "내일 하체 운동 시 스쿼트 5×5 @ 80kg 도전").

## 공통 규칙
- 한국어로 작성하세요.
- fullReport는 마크다운 형식으로, 이모지 없이 작성하세요. "오늘 코칭"과 "내일 계획" 섹션을 모두 포함하세요.`;

  return generateStructured(prompt, DailyReportSchema, {
    model: "gemini-3-flash-preview",
  });
}
