import { createClient } from "@/lib/supabase/server";
import { Dumbbell, UtensilsCrossed, BarChart3, RefreshCw } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">안녕하세요</p>
        <h1 className="text-xl font-bold">{user?.email?.split("@")[0]}님</h1>
      </div>

      {/* Today Summary */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          오늘의 요약
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/workouts"
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary"
          >
            <Dumbbell className="mb-2 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">운동</p>
            <p className="text-lg font-semibold">기록 없음</p>
          </Link>

          <Link
            href="/meals"
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary"
          >
            <UtensilsCrossed className="mb-2 h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">식단</p>
            <p className="text-lg font-semibold">기록 없음</p>
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          빠른 실행
        </h2>

        <div className="flex flex-col gap-2">
          <Link
            href="/workouts"
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Garmin 동기화</span>
          </Link>
          <Link
            href="/meals"
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary"
          >
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">식단 기록하기</span>
          </Link>
          <Link
            href="/reports/daily"
            className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary"
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">오늘의 코칭 리포트</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
