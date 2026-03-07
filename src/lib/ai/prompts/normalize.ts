/** Garmin exerciseSets payload에서 정규화에 필요한 필드만 추출 */
function trimExerciseSets(raw: Record<string, unknown>): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = raw as any;

  function mapExercise(ex: Record<string, unknown>) {
    return {
      exerciseType: ex.exerciseType,
      exerciseName: ex.exerciseName ?? ex.exerciseCategory,
      sets: Array.isArray(ex.sets)
        ? ex.sets.map((s: Record<string, unknown>) => ({
            setNumber: s.setNumber,
            weight: s.weight,
            repetitionCount: s.repetitionCount,
            startTime: s.startTime,
          }))
        : undefined,
    };
  }

  const arr = Array.isArray(payload.exerciseSets)
    ? payload.exerciseSets
    : Array.isArray(payload)
      ? payload
      : null;

  return arr ? arr.map(mapExercise) : payload;
}

export function buildNormalizePrompt(
  rawExerciseSets: Record<string, unknown>,
  exerciseCatalog: Array<{ name_ko: string; name_en: string; muscle_group_primary: string }>
): string {
  const catalogStr = exerciseCatalog
    .map((e) => `- ${e.name_ko} (${e.name_en}) [${e.muscle_group_primary}]`)
    .join("\n");

  const trimmed = trimExerciseSets(rawExerciseSets);

  return `당신은 운동 기록 정규화 전문가입니다.

아래는 Garmin에서 수집된 근력 운동 세션의 raw 데이터입니다.
이 데이터를 분석해서 정규화된 운동 기록으로 변환해주세요.

## 규칙
1. 운동 종목명은 아래 카탈로그에서 가장 가까운 것을 매칭하세요.
2. 카탈로그에 없으면 한국어로 적절한 이름을 만드세요.
3. 워밍업 세트는 본 세트 대비 현저히 가벼운 세트로 판단하세요.
4. 세트 순서는 원본 시간 순서를 유지하세요.
5. 총 볼륨 = 각 세트의 (중량 × 반복)의 합
6. 세션 이름은 주요 근육군 기반으로 작성 (예: "가슴/삼두", "등/이두")

## 운동 카탈로그
${catalogStr}

## Raw 데이터
${JSON.stringify(trimmed)}

정규화된 결과를 JSON으로 반환해주세요.`;
}
