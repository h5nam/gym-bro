import { generateStructured } from "../gemini";
import { AgentFeedbackSchema } from "../schemas";
import type { Agent, AgentContext, AgentOutput } from "./types";

export const sportsMedAgent: Agent = {
  name: "sports_med",
  displayNameKo: "스포츠의학 코치",

  async analyze(context: AgentContext): Promise<AgentOutput> {
    const prompt = `당신은 스포츠의학 전문가입니다.
아래 데이터를 기반으로 사용자의 운동 안전성을 평가해주세요.

## 분석 관점
- 관절 부담 패턴 (같은 관절을 사용하는 운동의 빈도와 볼륨)
- 과사용(overuse) 위험 징후
- 급격한 중량 증가의 부상 리스크
- 근육군별 회복 시간 적절성
- 운동 순서의 안전성

## 오늘의 운동
${context.todayWorkout ? JSON.stringify(context.todayWorkout, null, 2) : "없음"}

## 최근 7일 운동 기록
${JSON.stringify(context.recentWorkouts, null, 2)}

## 규칙
- 한국어로 응답하세요
- 의료 진단이 아닌 일반적인 운동 안전 조언만 제공하세요
- 통증이나 부상 가능성이 높은 경우 전문가 상담을 권유하세요
- 피드백은 2-4개로 제한하세요`;

    const result = await generateStructured(prompt, AgentFeedbackSchema);

    return {
      agentName: "sports_med",
      feedbacks: result.feedbacks,
    };
  },
};
