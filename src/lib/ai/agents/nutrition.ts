import { generateStructured } from "../gemini";
import { AgentFeedbackSchema } from "../schemas";
import { getTodayKST } from "../../date-utils";
import type { Agent, AgentContext, AgentOutput } from "./types";

export const nutritionAgent: Agent = {
  name: "nutrition",
  displayNameKo: "영양 코치",

  async analyze(context: AgentContext): Promise<AgentOutput> {
    const todayStr = getTodayKST();
    const todayMeals = context.recentMeals.filter((m) => m.mealDate === todayStr);
    const pastMeals = context.recentMeals.filter((m) => m.mealDate !== todayStr);

    const prompt = `당신은 스포츠 영양 전문가입니다.
오늘의 식단을 오늘의 운동량과 연계하여 중점 분석하고, 최근 7일 식단은 비교 맥락으로 활용하세요.

## [주 분석] 오늘의 운동
${context.todayWorkout ? JSON.stringify(context.todayWorkout, null, 2) : "없음 (휴식일)"}

## [주 분석] 오늘의 식단
${todayMeals.length > 0 ? JSON.stringify(todayMeals, null, 2) : "아직 기록된 식사 없음"}

## 오늘 중심 분석 관점
- 오늘 운동량 대비 오늘 칼로리 섭취가 적절한가?
- 오늘 단백질 섭취가 체중 대비 목표(1.6-2.2g/kg)에 부합하는가?
- 오늘 운동 전후 식사 타이밍이 적절한가?
- 오늘 매크로(단/탄/지) 비율이 운동 목표에 맞는가?
- 최근 7일 평균 대비 오늘 섭취량이 어떤 위치인가? (과다/적정/부족)

## [참고 맥락] 최근 7일 식단
${pastMeals.length > 0 ? JSON.stringify(pastMeals, null, 2) : "이전 기록 없음"}

## [참고 맥락] 최근 체성분
${JSON.stringify(context.bodyMetrics, null, 2)}

## 규칙
- 모든 피드백의 주어는 "오늘"이어야 합니다
- 한국어로 응답하세요
- 극단적인 식단(극저탄, 극저칼 등)을 권장하지 마세요
- 구체적인 수치 기반으로 피드백하세요
- 오늘 식단 기록이 없으면 "기록 독려" 피드백을 포함하세요
- 피드백은 2-4개로 제한하세요`;

    const result = await generateStructured(prompt, AgentFeedbackSchema);

    return {
      agentName: "nutrition",
      feedbacks: result.feedbacks,
    };
  },
};
