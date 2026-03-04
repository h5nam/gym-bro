export interface MemoryGenerationContext {
  profile: {
    displayName: string;
    heightCm: number | null;
    birthYear: number | null;
    trainingGoal: string | null;
    experienceLevel: string | null;
  };
  workoutSummaries: Array<{
    date: string;
    sessionName: string;
    muscleGroups: string[];
    totalVolumeKg: number;
    totalSets: number;
    durationSeconds: number;
    feedback: string | null;
  }>;
  dailyMealAverages: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    daysTracked: number;
  };
  bodyMetricsTrend: Array<{
    date: string;
    weightKg: number | null;
    bodyFatPct: number | null;
    skeletalMuscleMassKg: number | null;
  }>;
  latestReport: string | null;
  previousMemory: string | null;
}

export function buildMemoryGenerationPrompt(
  ctx: MemoryGenerationContext
): string {
  const workoutLines =
    ctx.workoutSummaries.length > 0
      ? ctx.workoutSummaries
          .map(
            (w) =>
              `- ${w.date}: ${w.sessionName} | 부위: ${w.muscleGroups.join(",")} | 볼륨: ${w.totalVolumeKg}kg | ${w.totalSets}세트 | ${Math.round(w.durationSeconds / 60)}분${w.feedback ? ` | 피드백: ${w.feedback.slice(0, 100)}` : ""}`
          )
          .join("\n")
      : "최근 30일 운동 기록 없음";

  const mealLine =
    ctx.dailyMealAverages.daysTracked > 0
      ? `${ctx.dailyMealAverages.daysTracked}일 기록 기준 일평균: 칼로리 ${Math.round(ctx.dailyMealAverages.avgCalories)}kcal, 단백질 ${Math.round(ctx.dailyMealAverages.avgProtein)}g, 탄수화물 ${Math.round(ctx.dailyMealAverages.avgCarbs)}g, 지방 ${Math.round(ctx.dailyMealAverages.avgFat)}g`
      : "최근 30일 식단 기록 없음";

  const bodyLines =
    ctx.bodyMetricsTrend.length > 0
      ? ctx.bodyMetricsTrend
          .map(
            (b) =>
              `- ${b.date}: 체중 ${b.weightKg ?? "?"}kg, 체지방 ${b.bodyFatPct ?? "?"}%, 골격근 ${b.skeletalMuscleMassKg ?? "?"}kg`
          )
          .join("\n")
      : "최근 30일 체성분 기록 없음";

  const profileLine = [
    ctx.profile.displayName ? `이름: ${ctx.profile.displayName}` : null,
    ctx.profile.heightCm ? `키: ${ctx.profile.heightCm}cm` : null,
    ctx.profile.birthYear ? `출생: ${ctx.profile.birthYear}년` : null,
    ctx.profile.trainingGoal ? `목표: ${ctx.profile.trainingGoal}` : null,
    ctx.profile.experienceLevel
      ? `경험: ${ctx.profile.experienceLevel}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return `당신은 피트니스 데이터 분석 전문가입니다. 아래 사용자(오야붕)의 최근 30일 피트니스 데이터를 분석하고, AI 코치가 참조할 메모리 문서를 작성해주세요.

## 사용자 프로필
${profileLine}

## 최근 30일 운동 기록
${workoutLines}

## 식단 요약
${mealLine}

## 체성분 변화 추이
${bodyLines}

${ctx.latestReport ? `## 최근 AI 코칭 리포트\n${ctx.latestReport.slice(0, 2000)}` : ""}

${ctx.previousMemory ? `## 기존 메모리 (이전 분석 결과)\n${ctx.previousMemory}` : ""}

---

## 작성 지시

아래 형식으로 오야붕의 코치 메모리 문서를 작성하세요.
${ctx.previousMemory ? "기존 메모리가 있으면 새 데이터를 반영해 업데이트하세요. 누적된 관찰은 보존하되, 더 이상 유효하지 않은 정보는 제거하세요." : "처음 작성하는 메모리입니다. 데이터에서 관찰할 수 있는 모든 패턴을 포착하세요."}

### 필수 섹션:

# 오야붕 코치 메모리

## 신체 프로필
(현재 체중/체지방/골격근 수치와 변화 추세)

## 훈련 패턴
(주당 빈도, 분할 루틴, 선호 운동, 강점/약점 부위, 볼륨 추세)

## 주요 성과
(볼륨 기록, 개선된 점, 칭찬할 만한 성과)

## 영양 패턴
(평균 섭취량, 목표 대비 달성률, 단백질 충분도)

## 주의사항
(과훈련 징후, 부족한 부위, 영양 부족 등)

## 코치 메모
(오야붕의 훈련 성향에 대한 자유 관찰. 좋아하는 운동, 패턴 등)

---

**제약:**
- 3000자 이내
- 마크다운 형식
- 수치와 데이터에 기반한 객관적 분석
- 추측이 아닌 데이터에서 확인할 수 있는 사실만 기록`;
}
