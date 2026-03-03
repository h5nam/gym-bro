export interface ChatContext {
  recentWorkouts: {
    sessionName: string;
    startedAt: string;
    totalVolumeKg: number;
    totalSets: number;
  }[];
  todayMeals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  bodyMetrics: {
    weightKg: number | null;
    bodyFatPct: number | null;
    skeletalMuscleMassKg: number | null;
  } | null;
  latestReport: string | null;
}

export function buildChatSystemPrompt(context: ChatContext): string {
  const workoutLines =
    context.recentWorkouts.length > 0
      ? context.recentWorkouts
          .map(
            (w) =>
              `- ${w.startedAt.split("T")[0]}: ${w.sessionName} (볼륨 ${w.totalVolumeKg}kg, ${w.totalSets}세트)`
          )
          .join("\n")
      : "최근 운동 기록 없음";

  const mealsLine = context.todayMeals
    ? `칼로리 ${context.todayMeals.calories}kcal, 단백질 ${context.todayMeals.protein}g, 탄수화물 ${context.todayMeals.carbs}g, 지방 ${context.todayMeals.fat}g`
    : "오늘 식단 데이터 없음";

  const bodyLine = context.bodyMetrics
    ? `체중 ${context.bodyMetrics.weightKg ?? "?"}kg, 체지방 ${context.bodyMetrics.bodyFatPct ?? "?"}%, 골격근량 ${context.bodyMetrics.skeletalMuscleMassKg ?? "?"}kg`
    : "체성분 데이터 없음";

  return `당신은 "짐브로 AI 코치"입니다. 사용자의 피트니스 목표 달성을 돕는 개인 트레이너이자 영양 코치입니다.

## 역할
- 운동 프로그래밍, 영양, 회복에 대한 실용적인 조언을 제공합니다.
- 사용자의 실제 데이터를 기반으로 개인화된 답변을 합니다.
- 한국어로 간결하고 친근하게 답변합니다.

## 사용자 데이터

### 최근 7일 운동
${workoutLines}

### 오늘 식단
${mealsLine}

### 체성분
${bodyLine}

${context.latestReport ? `### 최근 AI 코칭 리포트 요약\n${context.latestReport}` : ""}

## 규칙
1. 데이터를 참조하여 구체적이고 개인화된 답변을 하세요.
2. 2-3문장으로 간결하게 답변하세요. 사용자가 자세한 설명을 요청하면 확장하세요.
3. 의료적 조언 (진단, 처방, 치료 등)은 제외하세요. 통증이나 부상 관련 질문에는 전문의 상담을 권하세요.
4. 운동 종목, 세트/반복, 중량 등 구체적인 수치를 포함하세요.
5. 이모지를 적절히 사용하여 친근한 톤을 유지하세요.`;
}
