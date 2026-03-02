import { generateStructured } from "../gemini";
import { AgentFeedbackSchema } from "../schemas";
import type { Agent, AgentContext, AgentOutput } from "./types";

export const recoveryAgent: Agent = {
  name: "recovery",
  displayNameKo: "회복 코치",

  async analyze(context: AgentContext): Promise<AgentOutput> {
    const prompt = `당신은 회복 및 컨디셔닝 전문가입니다.
아래 데이터를 기반으로 사용자의 회복 상태를 분석해주세요.

## 분석 관점
- 주간 운동 빈도와 부위별 휴식일 적절성
- 같은 근육군 운동 간 최소 48시간 간격 확보 여부
- 전체적인 훈련 부하(볼륨 × 빈도)의 지속 가능성
- 연속 운동일 수와 탈진(burnout) 위험
- 디로드(deload) 필요 시점 제안

## 오늘의 운동
${context.todayWorkout ? JSON.stringify(context.todayWorkout, null, 2) : "없음"}

## 최근 7일 운동 기록
${JSON.stringify(context.recentWorkouts, null, 2)}

## 최근 체성분 추이
${JSON.stringify(context.bodyMetrics, null, 2)}

## 규칙
- 한국어로 응답하세요
- 수면, 스트레스 데이터가 없는 경우 해당 한계를 언급하세요
- 피드백은 2-4개로 제한하세요`;

    const result = await generateStructured(prompt, AgentFeedbackSchema);

    return {
      agentName: "recovery",
      feedbacks: result.feedbacks,
    };
  },
};
