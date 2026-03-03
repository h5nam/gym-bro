"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Scale, Dumbbell, Droplets, Plus } from "lucide-react";

interface BodyMetric {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_mass_kg: number | null;
  bmi: number | null;
  notes: string | null;
}

// Mini sparkline SVG for metric cards
function Sparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 40;
  const w = 80;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return { x, y };
  });
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3" fill={color} />
    </svg>
  );
}

type MetricType = "weight" | "muscle" | "fat";

const METRIC_CONFIG: Record<MetricType, { label: string; unit: string; color: string; gradientId: string }> = {
  weight: { label: "체중 추이", unit: "kg", color: "var(--color-primary)", gradientId: "chartGradWeight" },
  muscle: { label: "골격근량 추이", unit: "kg", color: "var(--color-positive)", gradientId: "chartGradMuscle" },
  fat: { label: "체지방률 추이", unit: "%", color: "var(--color-warning)", gradientId: "chartGradFat" },
};

function DetailChart({
  metrics,
  metricType,
}: {
  metrics: BodyMetric[];
  metricType: MetricType;
}) {
  const config = METRIC_CONFIG[metricType];
  const extractor: Record<MetricType, (m: BodyMetric) => number | null> = {
    weight: (m) => m.weight_kg,
    muscle: (m) => m.skeletal_muscle_mass_kg,
    fat: (m) => m.body_fat_pct,
  };

  const dataPoints = metrics
    .filter((m) => extractor[metricType](m) != null)
    .map((m) => ({ date: m.measured_at, value: extractor[metricType](m)! }));

  if (dataPoints.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        2회 이상 측정하면 차트가 표시됩니다
      </div>
    );
  }

  const values = dataPoints.map((d) => d.value);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const range = max - min || 1;

  const svgW = 400;
  const svgH = 150;
  const padX = 0;
  const padY = 10;

  const points = dataPoints.map((d, i) => ({
    x: padX + (i / (dataPoints.length - 1)) * (svgW - padX * 2),
    y: padY + (1 - (d.value - min) / range) * (svgH - padY * 2),
    value: d.value,
    date: d.date,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  const areaD = `${pathD} L${points[points.length - 1].x},${svgH} L${points[0].x},${svgH} Z`;

  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const y = padY + (i / gridCount) * (svgH - padY * 2);
    return y;
  });

  const dateLabels =
    dataPoints.length <= 6
      ? dataPoints
      : [dataPoints[0], dataPoints[Math.floor(dataPoints.length / 2)], dataPoints[dataPoints.length - 1]];

  return (
    <div>
      <div className="relative">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="none"
          className="h-48 w-full"
        >
          <defs>
            <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={config.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridLines.map((y, i) => (
            <line
              key={i}
              x1={0}
              y1={y}
              x2={svgW}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth="0.5"
            />
          ))}
          <path d={areaD} fill={`url(#${config.gradientId})`} />
          <path
            d={pathD}
            fill="none"
            stroke={config.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 5 : 3}
              fill={i === points.length - 1 ? "var(--color-background)" : config.color}
              stroke={config.color}
              strokeWidth={i === points.length - 1 ? 3 : 0}
            />
          ))}
        </svg>
      </div>
      <div className="mt-2 flex justify-between px-1">
        {dateLabels.map((d, i) => (
          <span key={i} className="text-xs text-muted-foreground">
            {new Date(d.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BodyMetricsDashboard({
  onAddClick,
}: {
  onAddClick: () => void;
}) {
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("weight");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/body-metrics");
        const data = await res.json();
        // API returns DESC (newest first) → reverse to chronological (oldest first)
        const sorted = (data.metrics ?? []).reverse();
        setMetrics(sorted);
        // Default select the latest (last item)
        if (sorted.length > 0) setSelectedIdx(sorted.length - 1);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  // Scroll selected date into view
  useEffect(() => {
    if (scrollRef.current && metrics.length > 0) {
      const active = scrollRef.current.querySelector("[data-active='true']");
      if (active) {
        active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [selectedIdx, metrics.length]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <Scale className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">인바디 수치를 기록해보세요</p>
          <p className="text-xs text-muted-foreground">주 1회 측정을 권장합니다</p>
          <button
            onClick={onAddClick}
            className="mt-4 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            첫 측정 기록하기
          </button>
        </div>
      </div>
    );
  }

  const selected = metrics[selectedIdx];
  // Chronological order: previous measurement is at idx - 1
  const prev = selectedIdx > 0 ? metrics[selectedIdx - 1] : null;

  // Compute diffs
  function getDiff(curr: number | null, prev: number | null) {
    if (curr == null || prev == null) return null;
    return Math.round((curr - prev) * 10) / 10;
  }

  const weightDiff = getDiff(selected.weight_kg, prev?.weight_kg ?? null);
  const muscleDiff = getDiff(selected.skeletal_muscle_mass_kg, prev?.skeletal_muscle_mass_kg ?? null);
  const fatDiff = getDiff(selected.body_fat_pct, prev?.body_fat_pct ?? null);

  // Overall trend for top chart header
  const chartValueMap: Record<MetricType, number | null> = {
    weight: selected.weight_kg,
    muscle: selected.skeletal_muscle_mass_kg,
    fat: selected.body_fat_pct,
  };
  const chartValue = chartValueMap[selectedMetric];

  const getOverallPct = (type: MetricType) => {
    const extractors: Record<MetricType, (m: BodyMetric) => number | null> = {
      weight: (m) => m.weight_kg,
      muscle: (m) => m.skeletal_muscle_mass_kg,
      fat: (m) => m.body_fat_pct,
    };
    const oldest = extractors[type](metrics[0]);
    const latest = extractors[type](metrics[metrics.length - 1]);
    if (latest && oldest && oldest !== 0) {
      return Math.round(((latest - oldest) / oldest) * 1000) / 10;
    }
    return null;
  };
  const chartOverallPct = getOverallPct(selectedMetric);
  // weight/fat: down is good, muscle: up is good
  const chartLowerIsBetter = selectedMetric === "weight" || selectedMetric === "fat";
  const chartIsGood = chartOverallPct !== null
    ? (chartLowerIsBetter ? chartOverallPct < 0 : chartOverallPct > 0)
    : false;

  // Sparkline data (already chronological: oldest → newest)
  const weightData = metrics
    .filter((m) => m.weight_kg != null)
    .map((m) => m.weight_kg!);
  const muscleData = metrics
    .filter((m) => m.skeletal_muscle_mass_kg != null)
    .map((m) => m.skeletal_muscle_mass_kg!);
  const fatData = metrics
    .filter((m) => m.body_fat_pct != null)
    .map((m) => m.body_fat_pct!);

  return (
    <div className="space-y-5">
      {/* Date Picker Strip */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            측정 기록
          </h2>
          <span className="text-xs text-muted-foreground">{metrics.length}회</span>
        </div>
        <div
          ref={scrollRef}
          className="flex items-center gap-2.5 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {metrics.map((m, i) => {
            const d = new Date(m.measured_at);
            const month = d.toLocaleDateString("ko-KR", { month: "short" });
            const day = String(d.getDate()).padStart(2, "0");
            const isActive = i === selectedIdx;

            return (
              <button
                key={m.id}
                data-active={isActive}
                onClick={() => setSelectedIdx(i)}
                className="flex shrink-0 flex-col items-center gap-1.5 transition-all"
              >
                <span
                  className={`text-[10px] font-bold uppercase ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {month}
                </span>
                <div
                  className={`flex h-14 w-12 flex-col items-center justify-center rounded-2xl transition-all ${
                    isActive
                      ? "bg-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : "border border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span
                    className={`text-lg font-bold ${
                      isActive ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  <div
                    className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-primary-foreground" : "bg-primary"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Trend Chart */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {METRIC_CONFIG[selectedMetric].label}
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold">
              {chartValue ?? "-"}
              <span className="ml-1 text-xl font-normal text-muted-foreground">
                {METRIC_CONFIG[selectedMetric].unit}
              </span>
            </span>
            {chartOverallPct !== null && (
              <div
                className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-sm font-medium ${
                  chartIsGood
                    ? "bg-positive/10 text-positive"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {chartOverallPct < 0 ? "\u2193" : "\u2191"}
                {Math.abs(chartOverallPct)}%
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            전체 {metrics.length}회 기록
          </p>
        </div>
        <DetailChart metrics={metrics} metricType={selectedMetric} />
      </div>

      {/* Detail Metric Cards */}
      <div>
        <h3 className="mb-3 px-1 text-sm font-bold">상세 지표</h3>
        <div className="space-y-3">
          {/* Weight Card */}
          <MetricCard
            icon={<Scale className="h-5 w-5" style={{ color: METRIC_CONFIG.weight.color }} />}
            label="체중"
            value={selected.weight_kg}
            unit="kg"
            diff={weightDiff}
            diffLabel="이전 측정 대비"
            sparkData={weightData}
            sparkColor={METRIC_CONFIG.weight.color}
            lowerIsBetter
            active={selectedMetric === "weight"}
            onClick={() => setSelectedMetric("weight")}
          />

          {/* Skeletal Muscle Card */}
          <MetricCard
            icon={<Dumbbell className="h-5 w-5" style={{ color: METRIC_CONFIG.muscle.color }} />}
            label="골격근량"
            value={selected.skeletal_muscle_mass_kg}
            unit="kg"
            diff={muscleDiff}
            diffLabel="이전 측정 대비"
            sparkData={muscleData}
            sparkColor={METRIC_CONFIG.muscle.color}
            active={selectedMetric === "muscle"}
            onClick={() => setSelectedMetric("muscle")}
          />

          {/* Body Fat Card */}
          <MetricCard
            icon={<Droplets className="h-5 w-5" style={{ color: METRIC_CONFIG.fat.color }} />}
            label="체지방률"
            value={selected.body_fat_pct}
            unit="%"
            diff={fatDiff}
            diffLabel="이전 측정 대비"
            sparkData={fatData}
            sparkColor={METRIC_CONFIG.fat.color}
            lowerIsBetter
            active={selectedMetric === "fat"}
            onClick={() => setSelectedMetric("fat")}
          />
        </div>
      </div>

      {/* Measurement Notes */}
      {selected.notes && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">메모</p>
          <p className="mt-1 text-sm">{selected.notes}</p>
        </div>
      )}

      {/* Floating Add Button — anchored to max-w-lg container, above BottomNav */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-40 mx-auto flex max-w-lg justify-end px-4">
        <button
          onClick={onAddClick}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" />
          새 측정 기록
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  diff,
  diffLabel,
  sparkData,
  sparkColor,
  lowerIsBetter,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  unit: string;
  diff: number | null;
  diffLabel: string;
  sparkData: number[];
  sparkColor: string;
  lowerIsBetter?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  // Good change: weight/fat down = good, muscle up = good
  const isGoodChange =
    diff != null ? (lowerIsBetter ? diff < 0 : diff > 0) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
        active
          ? "border-primary/50 bg-card ring-1 ring-primary/30"
          : "border-border bg-card"
      }`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5">{icon}</div>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-2xl font-bold">
          {value != null ? value : "-"}
          <span className="ml-0.5 text-sm font-normal text-muted-foreground">{unit}</span>
        </span>
        {diff != null && (
          <div className="flex items-center gap-1 text-xs">
            <span className={isGoodChange ? "text-positive" : "text-destructive"}>
              {diff > 0 ? "\u2191" : "\u2193"}
              {Math.abs(diff)}
              {unit}
            </span>
            <span className="text-muted-foreground">{diffLabel}</span>
          </div>
        )}
      </div>
      <div className="shrink-0">
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
    </button>
  );
}
