import { generateStructured } from "../gemini";
import { AgentFeedbackSchema } from "../schemas";
import type { Agent, AgentContext, AgentOutput } from "./types";

export const recoveryAgent: Agent = {
  name: "recovery",
  displayNameKo: "회복 코치",

  async analyze(context: AgentContext): Promise<AgentOutput> {
    const prompt = `당신은 회복 및 컨디셔닝 전문가입니다.
오늘의 운동이 회복 관점에서 적절했는지 중심으로 평가하고, 최근 7일 데이터는 누적 피로도 판단의 맥락으로 활용하세요.

## [주 분석] 오늘의 운동
${context.todayWorkout ? JSON.stringify(context.todayWorkout, null, 2) : "없음 (휴식일)"}

## 오늘 중심 분석 관점
- 오늘 운동한 근육군의 마지막 훈련일로부터 충분한 회복 시간(최소 48시간)이 확보되었는가?
- 오늘까지 연속 운동일이 며칠인가? 탈진(burnout) 위험은?
- 오늘의 훈련 볼륨이 최근 7일 평균 대비 과도하지 않은가?
- 이번 주 전체 훈련 부하(볼륨 × 빈도)가 지속 가능한 수준인가?
- 최근 추세를 고려했을 때 디로드(deload) 시점이 필요한가?

## [참고 맥락] 최근 7일 운동 기록
${JSON.stringify(context.recentWorkouts, null, 2)}

## [참고 맥락] 최근 체성분 추이
${JSON.stringify(context.bodyMetrics, null, 2)}

## 규칙
- 모든 피드백의 주어는 "오늘"이어야 합니다
- 한국어로 응답하세요
- 수면, 스트레스 데이터가 없는 경우 해당 한계를 언급하세요
- 오늘 운동이 없으면 휴식일의 회복 효과와 복귀 타이밍 관점에서 피드백하세요
- 피드백은 2-4개로 제한하세요`;

    const result = await generateStructured(prompt, AgentFeedbackSchema);

    return {
      agentName: "recovery",
      feedbacks: result.feedbacks,
    };
  },
};
