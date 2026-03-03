import { generateStructured } from "../gemini";
import { AgentFeedbackSchema } from "../schemas";
import type { Agent, AgentContext, AgentOutput } from "./types";

export const bodybuildingAgent: Agent = {
  name: "bodybuilding",
  displayNameKo: "보디빌딩 코치",

  async analyze(context: AgentContext): Promise<AgentOutput> {
    const prompt = `당신은 보디빌딩 전문 코치입니다.
오늘 수행한 운동을 중심으로 분석하고, 최근 7일 데이터는 비교 맥락으로만 활용하세요.

## [주 분석] 오늘의 운동
${context.todayWorkout ? JSON.stringify(context.todayWorkout, null, 2) : "없음 (휴식일)"}

## 오늘 중심 분석 관점
- 오늘 운동의 총 볼륨과 강도는 적절했는가?
- 오늘 선택한 종목 구성이 타겟 근육군에 효과적이었는가?
- 오늘 세트/반복 범위가 목표(근비대, 근력 등)에 맞는가?
- 최근 7일 대비 오늘의 점진적 과부하가 이루어졌는가? (중량/반복 변화)
- 오늘 부위별 볼륨 분포에 불균형은 없는가?

## [참고 맥락] 최근 7일 운동 기록
${JSON.stringify(context.recentWorkouts, null, 2)}

## 규칙
- 모든 피드백의 주어는 "오늘"이어야 합니다
- 한국어로 응답하세요
- 구체적인 수치를 근거로 피드백하세요
- "데이터 근거 없는 칭찬/비판" 금지
- 오늘 운동이 없으면 휴식일 관점에서 7일 패턴을 기반으로 피드백하세요
- 피드백은 2-4개로 제한하세요`;

    const result = await generateStructured(prompt, AgentFeedbackSchema);

    return {
      agentName: "bodybuilding",
      feedbacks: result.feedbacks,
    };
  },
};
