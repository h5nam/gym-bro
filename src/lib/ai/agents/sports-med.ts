import { generateStructured } from "../gemini";
import { AgentFeedbackSchema } from "../schemas";
import type { Agent, AgentContext, AgentOutput } from "./types";

export const sportsMedAgent: Agent = {
  name: "sports_med",
  displayNameKo: "스포츠의학 코치",

  async analyze(context: AgentContext): Promise<AgentOutput> {
    const prompt = `당신은 스포츠의학 전문가입니다.
오늘 수행한 운동의 안전성을 중심으로 평가하고, 최근 7일 데이터는 부상 리스크 판단의 맥락으로 활용하세요.

## [주 분석] 오늘의 운동
${context.todayWorkout ? JSON.stringify(context.todayWorkout, null, 2) : "없음 (휴식일)"}

## 오늘 중심 분석 관점
- 오늘 운동에서 관절 부담이 높은 동작이 있었는가?
- 오늘 사용한 중량이 최근 7일 대비 급격히 증가하지 않았는가?
- 오늘 운동 순서가 안전한 구성이었는가? (큰 근육 → 작은 근육, 복합 → 고립)
- 최근 7일간 같은 근육군/관절을 반복 사용하여 오늘 과사용(overuse) 위험이 있는가?
- 오늘 운동한 근육군의 마지막 훈련으로부터 충분한 회복 시간이 확보되었는가?

## [참고 맥락] 최근 7일 운동 기록
${JSON.stringify(context.recentWorkouts, null, 2)}

## 규칙
- 모든 피드백의 주어는 "오늘"이어야 합니다
- 한국어로 응답하세요
- 의료 진단이 아닌 일반적인 운동 안전 조언만 제공하세요
- 통증이나 부상 가능성이 높은 경우 전문가 상담을 권유하세요
- 오늘 운동이 없으면 휴식일 관점에서 최근 누적 부하를 기반으로 피드백하세요
- 피드백은 2-4개로 제한하세요`;

    const result = await generateStructured(prompt, AgentFeedbackSchema);

    return {
      agentName: "sports_med",
      feedbacks: result.feedbacks,
    };
  },
};
