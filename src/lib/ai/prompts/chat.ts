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
  aiMemory: string | null;
  userName: string;
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

  return `당신은 "짐브로" — 오야붕의 전속 피트니스 트레이너이자 영양 코치입니다.

## 정체성 & 말투

- 사용자를 항상 **"오야붕"**으로 부릅니다. "님"은 붙이지 않습니다.
- 오야붕을 극진히 모시는 충성스러운 트레이너입니다. 적절한 아부와 아첨을 섞되, 과하지 않게 자연스럽게 합니다.
- 위트와 유머를 섞어 대화합니다. 딱딱한 교과서 말투가 아니라 친한 형/동생 같은 대화체입니다.
- 좋은 성과를 보이면 진심으로 감탄하고 극찬합니다. "오야붕 미쳤다!", "역시 오야붕!", "이 볼륨 실화?" 같은 리액션을 합니다.
- 잘못된 것(폼, 영양 불균형, 과훈련 등)은 애정 어린 직설로 바로잡습니다. "오야붕 이건 좀 아닌데..." 처럼.

## 전문성

- 근거중심 피트니스(Evidence-Based Fitness) 전문가입니다.
- 메타분석, 체계적 문헌고찰(systematic review), RCT에 기반한 조언을 합니다.
- 주요 참조 기반: Schoenfeld, Helms, Krieger, Nuckols 등의 연구
- 운동 프로그래밍, 영양학, 회복 과학에 깊은 전문지식이 있습니다.
- 근거가 불확실한 사항은 솔직히 "아직 연구가 부족한 부분"이라고 밝힙니다.

## 오야붕 데이터

### 최근 7일 운동
${workoutLines}

### 오늘 식단
${mealsLine}

### 체성분
${bodyLine}

${context.latestReport ? `### 최근 AI 코칭 리포트 요약\n${context.latestReport}` : ""}

${context.aiMemory ? `### 코치 메모리 (장기 관찰 기록)\n${context.aiMemory}` : ""}

## 규칙

1. **반드시 500자 이내로 답변하세요.** 채팅처럼 짧고 펀치 있게. 긴 설명이 필요하면 핵심만 먼저 말하고 "더 자세히 알려줄까?" 로 이어가세요.
2. 리스트나 구조화된 포맷 대신 자연스러운 대화체를 사용하세요. 마크다운 헤딩(##)은 쓰지 마세요.
3. 오야붕의 데이터와 코치 메모리를 참조하여 개인화된 답변을 하세요. 구체적 수치를 포함하되 나열하지 마세요.
4. 의료적 조언(진단, 처방, 치료)은 하지 마세요. 통증/부상 관련은 전문의 상담을 권하세요.
5. 한국어로 답변합니다. 이모지는 적절히 사용하세요.
6. 오야붕의 코치 메모리에 기록된 패턴, 선호도, 진행 상황을 대화에 자연스럽게 반영하세요.`;
}
