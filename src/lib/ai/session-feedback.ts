import { generateStructured } from "./gemini";
import { SessionFeedbackSchema } from "./schemas";

interface SessionInput {
  sessionName: string;
  muscleGroups: string[];
  totalVolumeKg: number;
  totalSets: number;
  sets: Array<{
    exerciseName: string;
    setNumber: number;
    reps: number;
    weightKg: number;
    isWarmup: boolean;
  }>;
}

export async function generateSessionFeedback(
  session: SessionInput
): Promise<string> {
  const prompt = `당신은 보디빌딩 전문 코치입니다.
아래 운동 세션 데이터만을 기반으로 간결한 피드백을 작성하세요.

## 세션 정보
- 세션명: ${session.sessionName}
- 근육군: ${session.muscleGroups.join(", ")}
- 총 볼륨: ${session.totalVolumeKg}kg
- 총 세트: ${session.totalSets}

## 세트 상세
${session.sets
  .map(
    (s) =>
      `${s.exerciseName} ${s.isWarmup ? "(워밍업)" : `${s.setNumber}세트`}: ${s.weightKg}kg × ${s.reps}회`
  )
  .join("\n")}

## 분석 관점
- 총 볼륨과 강도가 해당 부위에 적절한가?
- 종목 구성이 타겟 근육군에 효과적인가?
- 세트/반복 범위가 근비대 관점에서 적절한가?
- 눈에 띄는 개선 포인트가 있는가?

## 규칙
- 한국어로 작성
- 반드시 500자 이내
- 구체적 수치를 근거로 피드백
- 칭찬과 개선점을 균형 있게 포함
- 실용적이고 간결하게 작성`;

  const result = await generateStructured(prompt, SessionFeedbackSchema);
  return result.feedback;
}

// ── Cardio session feedback ──

interface CardioSessionInput {
  sessionName: string;
  activityType: string;
  durationSeconds: number;
  distance: number;       // km
  avgSpeed: number;       // km/h
  maxSpeed: number;       // km/h
  avgHR: number;
  maxHR: number;
  calories: number;
  elevationGain: number;  // m
  elevationLoss: number;
  avgCadence: number;     // spm
  maxCadence: number;
  aerobicTE: number;      // 0-5
  anaerobicTE: number;
  vO2Max: number;
  avgStrideLength: number; // m
  steps: number;
  movingDuration: number; // seconds
}

export async function generateCardioSessionFeedback(
  session: CardioSessionInput
): Promise<string> {
  const durationMin = Math.round(session.durationSeconds / 60);
  const movingMin = session.movingDuration > 0
    ? Math.round(session.movingDuration / 60)
    : durationMin;

  // Calculate pace if applicable
  const paceStr = session.distance > 0 && session.movingDuration > 0
    ? (() => {
        const paceSeconds = session.movingDuration / session.distance;
        const min = Math.floor(paceSeconds / 60);
        const sec = Math.floor(paceSeconds % 60);
        return `${min}'${String(sec).padStart(2, "0")}"/km`;
      })()
    : "N/A";

  const metricsLines: string[] = [];
  if (session.distance > 0) metricsLines.push(`- 거리: ${session.distance}km`);
  metricsLines.push(`- 총 시간: ${durationMin}분 (실이동: ${movingMin}분)`);
  if (session.distance > 0) metricsLines.push(`- 평균 페이스: ${paceStr}`);
  if (session.avgSpeed > 0) metricsLines.push(`- 평균 속도: ${session.avgSpeed}km/h`);
  if (session.maxSpeed > 0) metricsLines.push(`- 최고 속도: ${session.maxSpeed}km/h`);
  if (session.avgHR > 0) metricsLines.push(`- 평균 심박: ${session.avgHR}bpm`);
  if (session.maxHR > 0) metricsLines.push(`- 최대 심박: ${session.maxHR}bpm`);
  if (session.calories > 0) metricsLines.push(`- 칼로리: ${session.calories}kcal`);
  if (session.elevationGain > 0) metricsLines.push(`- 고도 상승: ${session.elevationGain}m`);
  if (session.elevationLoss > 0) metricsLines.push(`- 고도 하강: ${session.elevationLoss}m`);
  if (session.avgCadence > 0) metricsLines.push(`- 평균 케이던스: ${session.avgCadence}spm`);
  if (session.maxCadence > 0) metricsLines.push(`- 최대 케이던스: ${session.maxCadence}spm`);
  if (session.avgStrideLength > 0) metricsLines.push(`- 평균 보폭: ${session.avgStrideLength}m`);
  if (session.steps > 0) metricsLines.push(`- 총 걸음: ${session.steps}`);
  if (session.aerobicTE > 0) metricsLines.push(`- 유산소 트레이닝 이펙트: ${session.aerobicTE}`);
  if (session.anaerobicTE > 0) metricsLines.push(`- 무산소 트레이닝 이펙트: ${session.anaerobicTE}`);
  if (session.vO2Max > 0) metricsLines.push(`- VO₂max: ${session.vO2Max}`);

  const prompt = `당신은 러닝/유산소 전문 코치입니다.
아래 유산소 운동 데이터만을 기반으로 간결한 피드백을 작성하세요.

## 세션 정보
- 세션명: ${session.sessionName}
- 활동 유형: ${session.activityType}

## 운동 지표
${metricsLines.join("\n")}

## 분석 관점
- 심박수 구간 배분이 목표(지구력/체지방감량/퍼포먼스)에 적절한가?
- 페이스/속도가 해당 거리와 시간 대비 적절한가?
- 트레이닝 이펙트(유산소/무산소)로 보는 훈련 효과는?
- 케이던스/보폭으로 보는 러닝 폼은?
- 다음 세션을 위한 구체적 개선 포인트는?

## 규칙
- 한국어로 작성
- 반드시 500자 이내
- 구체적 수치를 근거로 피드백
- 칭찬과 개선점을 균형 있게 포함
- 실용적이고 간결하게 작성`;

  const result = await generateStructured(prompt, SessionFeedbackSchema);
  return result.feedback;
}
