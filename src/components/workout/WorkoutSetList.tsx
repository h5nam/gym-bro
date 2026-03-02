"use client";

interface WorkoutSet {
  id: string;
  exercise_name_display: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  is_warmup: boolean;
  set_order: number;
}

interface Props {
  sets: WorkoutSet[];
}

export default function WorkoutSetList({ sets }: Props) {
  // Group sets by exercise
  const grouped = sets.reduce<Record<string, WorkoutSet[]>>((acc, set) => {
    const key = set.exercise_name_display;
    if (!acc[key]) acc[key] = [];
    acc[key].push(set);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">세트 목록</h2>
      {Object.entries(grouped).map(([exerciseName, exerciseSets]) => (
        <div
          key={exerciseName}
          className="rounded-lg border border-border overflow-hidden"
        >
          <div className="bg-secondary/50 px-3 py-2">
            <h3 className="text-sm font-semibold">{exerciseName}</h3>
          </div>
          <div className="divide-y divide-border">
            {exerciseSets.map((set) => (
              <div
                key={set.id}
                className="flex items-center px-3 py-2 text-sm"
              >
                <span className="w-16 text-muted-foreground">
                  {set.is_warmup ? "W" : `${set.set_number}세트`}
                </span>
                <span className="flex-1 font-medium">
                  {Number(set.weight_kg)}kg
                </span>
                <span className="text-muted-foreground">
                  × {set.reps}회
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
