export const CARDIO_TYPES = [
  "running",
  "treadmill_running",
  "street_running",
  "indoor_cycling",
  "cycling",
  "stair_climbing",
  "walking",
  "hiking",
  "trail_running",
  "indoor_running",
  "indoor_cardio",
  "elliptical",
];

export const CARDIO_TYPE_NAMES: Record<string, string> = {
  running: "러닝",
  treadmill_running: "트레드밀 러닝",
  street_running: "야외 러닝",
  indoor_cycling: "실내 사이클",
  cycling: "사이클",
  stair_climbing: "계단 오르기",
  walking: "걷기",
  hiking: "하이킹",
  trail_running: "트레일 러닝",
  indoor_running: "실내 러닝",
  indoor_cardio: "실내 유산소",
  elliptical: "일립티컬",
};

export interface CardioMetrics {
  distance: number;
  avgSpeed: number;
  maxSpeed: number;
  avgHR: number;
  maxHR: number;
  calories: number;
  elevationGain: number;
  elevationLoss: number;
  avgCadence: number;
  maxCadence: number;
  aerobicTE: number;
  anaerobicTE: number;
  vO2Max: number;
  avgStrideLength: number;
  steps: number;
  movingDuration: number;
}

export const EMPTY_CARDIO_METRICS: CardioMetrics = {
  distance: 0,
  avgSpeed: 0,
  maxSpeed: 0,
  avgHR: 0,
  maxHR: 0,
  calories: 0,
  elevationGain: 0,
  elevationLoss: 0,
  avgCadence: 0,
  maxCadence: 0,
  aerobicTE: 0,
  anaerobicTE: 0,
  vO2Max: 0,
  avgStrideLength: 0,
  steps: 0,
  movingDuration: 0,
};

/** Extract cardio metrics from Garmin raw_payload */
export function extractCardioMetrics(
  rawPayload: Record<string, unknown>
): CardioMetrics {
  const p = rawPayload;
  const rawStride = Number(p.avgStrideLength) || 0;
  const rawMoving = Number(p.movingDuration) || 0;

  return {
    distance:
      Math.round((((p.distance as number) ?? 0) / 1000) * 10) / 10,
    avgSpeed: p.averageSpeed
      ? Math.round((p.averageSpeed as number) * 3.6 * 10) / 10
      : 0,
    maxSpeed: p.maxSpeed
      ? Math.round((p.maxSpeed as number) * 3.6 * 10) / 10
      : 0,
    avgHR: Math.round((p.averageHR as number) ?? 0),
    maxHR: Math.round((p.maxHR as number) ?? 0),
    calories: Math.round((p.calories as number) ?? 0),
    elevationGain: Math.round(Number(p.elevationGain) || 0),
    elevationLoss: Math.round(Number(p.elevationLoss) || 0),
    avgCadence: Math.round(
      Number(p.averageRunningCadenceInStepsPerMinute) || 0
    ),
    maxCadence: Math.round(
      Number(p.maxRunningCadenceInStepsPerMinute) || 0
    ),
    aerobicTE:
      Math.round((Number(p.aerobicTrainingEffect) || 0) * 10) / 10,
    anaerobicTE:
      Math.round((Number(p.anaerobicTrainingEffect) || 0) * 10) / 10,
    vO2Max: Math.round(Number(p.vO2MaxValue) || 0),
    // Garmin reports stride in cm (>5) or meters (<5)
    avgStrideLength:
      rawStride > 5
        ? Math.round((rawStride / 100) * 100) / 100
        : Math.round(rawStride * 100) / 100,
    steps: Math.round(Number(p.steps) || 0),
    // Garmin may report in ms (>86400) or seconds
    movingDuration:
      rawMoving > 86400
        ? Math.round(rawMoving / 1000)
        : Math.round(rawMoving),
  };
}
