import { generateStructured } from "../gemini";
import { AgentFeedbackSchema } from "../schemas";
import type { Agent, AgentContext, AgentOutput } from "./types";

export const nutritionAgent: Agent = {
  name: "nutrition",
  displayNameKo: "영양 코치",

  async analyze(context: AgentContext): Promise<AgentOutput> {
    const prompt = `당신은 스포츠 영양 전문가입니다.
아래 데이터를 기반으로 사용자의 식단을 운동량과 연계하여 분석해주세요.

## 분석 관점
- 운동일/휴식일 기준 에너지 섭취 적절성
- 단백질 섭취량 적정성 (체중 대비 g/kg 기준)
- 탄수화물 섭취와 운동 수행 능력의 관계
- 식사 타이밍과 운동의 관계
- 일일 매크로 균형

## 오늘의 운동
${context.todayWorkout ? JSON.stringify(context.todayWorkout, null, 2) : "없음 (휴식일)"}

## 최근 7일 식단
${JSON.stringify(context.recentMeals, null, 2)}

## 최근 체성분
${JSON.stringify(context.bodyMetrics, null, 2)}

## 규칙
- 한국어로 응답하세요
- 극단적인 식단(극저탄, 극저칼 등)을 권장하지 마세요
- 구체적인 수치 기반으로 피드백하세요
- 피드백은 2-4개로 제한하세요`;

    const result = await generateStructured(prompt, AgentFeedbackSchema);

    return {
      agentName: "nutrition",
      feedbacks: result.feedbacks,
    };
  },
};
