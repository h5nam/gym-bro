import { BarChart3 } from "lucide-react";

export default function WeeklyReportPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">주간 리포트</h1>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          한 주의 운동 데이터가 쌓이면 주간 분석이 제공됩니다
        </p>
      </div>
    </div>
  );
}
