import { generateStructured } from "../gemini";
import { DailyReportSchema } from "../schemas";
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

  const prompt = `당신은 피트니스 코칭 오케스트레이터입니다.
여러 전문 코치의 피드백을 종합하여 사용자에게 최종 코칭 리포트를 작성해주세요.

## 코치별 피드백
${allFeedbacks
  .map(
    (f) =>
      `[${f.agentName}] (${f.category}, 우선순위 ${f.priority}) ${f.title}: ${f.body}`
  )
  .join("\n\n")}

## 오늘의 운동
${context.todayWorkout ? `${context.todayWorkout.sessionName} — 총 볼륨 ${context.todayWorkout.totalVolumeKg}kg` : "휴식일"}

## 최근 식단 요약
${
  context.recentMeals.length > 0
    ? `오늘 총 ${context.recentMeals
        .filter((m) => m.mealDate === new Date().toISOString().split("T")[0])
        .reduce((sum, m) => sum + m.totalCalories, 0)}kcal, 단백질 ${context.recentMeals
        .filter((m) => m.mealDate === new Date().toISOString().split("T")[0])
        .reduce((sum, m) => sum + m.totalProteinG, 0).toFixed(0)}g`
    : "식단 데이터 없음"
}

## 종합 규칙
1. 코치 간 상충되는 의견이 있으면 우선순위를 고려하여 조율하세요.
2. "오늘 핵심 3가지" 중심으로 정리하세요.
3. 장황한 설명보다 행동 가능한 액션 아이템을 제시하세요.
4. 의료적 조언은 제외하세요.
5. 한국어로 작성하세요.
6. fullReport는 마크다운 형식으로, 이모지 없이 작성하세요.
7. actionItems는 구체적이고 실행 가능해야 합니다 (예: "내일 하체 운동 시 스쿼트 5세트 목표")`;

  return generateStructured(prompt, DailyReportSchema, {
    model: "gemini-2.5-pro",
  });
}
