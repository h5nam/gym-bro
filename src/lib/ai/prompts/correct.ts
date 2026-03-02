import type { NormalizedSet } from "../schemas";

export function buildCorrectionPrompt(
  currentSets: NormalizedSet[],
  userMessage: string
): string {
  const setsStr = currentSets
    .map(
      (s, i) =>
        `[${i}] ${s.exerciseName} — 세트${s.setNumber}: ${s.weightKg}kg × ${s.reps}회${s.isWarmup ? " (워밍업)" : ""}`
    )
    .join("\n");

  return `당신은 운동 기록 보정 전문가입니다.

아래는 현재 기록된 운동 세트 목록입니다.
사용자가 자연어로 수정을 요청했습니다.

## 현재 세트 목록
${setsStr}

## 사용자 수정 요청
"${userMessage}"

## 규칙
1. 사용자의 의도를 정확히 파악하여 해당 세트만 수정하세요.
2. 운동 종목명 변경, 중량 변경, 반복 횟수 변경, 세트 추가/삭제 등을 처리하세요.
3. 수정하지 않은 세트는 그대로 유지하세요.
4. 불확실한 부분이 있으면 corrections의 reason에 명시하세요.
5. updatedSets에는 수정 후의 전체 세트 목록을 포함하세요.

수정 결과를 JSON으로 반환해주세요.`;
}
