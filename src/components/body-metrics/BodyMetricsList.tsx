"use client";

import { useEffect, useState } from "react";
import { User, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch";

interface BodyMetric {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_mass_kg: number | null;
  notes: string | null;
}

export default function BodyMetricsList() {
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetchWithAuth("/api/body-metrics");
        const data = await res.json();
        setMetrics(data.metrics ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-secondary/50"
          />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <User className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          인바디 수치를 기록해보세요
        </p>
        <p className="text-xs text-muted-foreground">
          주 1회 측정을 권장합니다
        </p>
      </div>
    );
  }

  function getTrend(current: number | null, previous: number | null) {
    if (current == null || previous == null) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.1) return { icon: Minus, color: "text-muted-foreground", diff: 0 };
    if (diff > 0) return { icon: TrendingUp, color: "text-positive", diff };
    return { icon: TrendingDown, color: "text-destructive", diff };
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">측정 기록</h2>

      {metrics.map((metric, index) => {
        const prev = metrics[index + 1] ?? null;
        const weightTrend = getTrend(
          metric.weight_kg,
          prev?.weight_kg ?? null
        );

        return (
          <div
            key={metric.id}
            className="rounded-lg border border-border p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {new Date(metric.measured_at).toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                })}
              </span>
              {metric.notes && (
                <span className="text-xs text-muted-foreground">
                  {metric.notes}
                </span>
              )}
            </div>

            <div className="flex gap-4 text-sm">
              {metric.weight_kg != null && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">체중</span>
                  <span className="font-medium">
                    {Number(metric.weight_kg)}kg
                  </span>
                  {weightTrend && weightTrend.diff !== 0 && (
                    <span className={`text-xs ${weightTrend.color}`}>
                      {weightTrend.diff > 0 ? "+" : ""}
                      {weightTrend.diff.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
              {metric.body_fat_pct != null && (
                <div>
                  <span className="text-muted-foreground">체지방 </span>
                  <span className="font-medium">
                    {Number(metric.body_fat_pct)}%
                  </span>
                </div>
              )}
              {metric.skeletal_muscle_mass_kg != null && (
                <div>
                  <span className="text-muted-foreground">골격근 </span>
                  <span className="font-medium">
                    {Number(metric.skeletal_muscle_mass_kg)}kg
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
