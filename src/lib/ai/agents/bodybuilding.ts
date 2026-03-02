import { generateStructured } from "../gemini";
import { AgentFeedbackSchema } from "../schemas";
import type { Agent, AgentContext, AgentOutput } from "./types";

export const bodybuildingAgent: Agent = {
  name: "bodybuilding",
  displayNameKo: "보디빌딩 코치",

  async analyze(context: AgentContext): Promise<AgentOutput> {
    const prompt = `당신은 보디빌딩 전문 코치입니다.
아래 데이터를 기반으로 사용자의 근력 운동을 분석해주세요.

## 분석 관점
- 부위별 볼륨 분포와 균형
- 점진적 과부하 (이전 기록 대비 중량/반복 변화)
- 운동 종목 선택의 적절성
- 분할 프로그램의 효율성
- 세트 수와 반복 범위의 적절성

## 오늘의 운동
${context.todayWorkout ? JSON.stringify(context.todayWorkout, null, 2) : "없음"}

## 최근 7일 운동 기록
${JSON.stringify(context.recentWorkouts, null, 2)}

## 규칙
- 한국어로 응답하세요
- 구체적인 수치를 근거로 피드백하세요
- "데이터 근거 없는 칭찬/비판" 금지
- 피드백은 2-4개로 제한하세요`;

    const result = await generateStructured(prompt, AgentFeedbackSchema);

    return {
      agentName: "bodybuilding",
      feedbacks: result.feedbacks,
    };
  },
};
