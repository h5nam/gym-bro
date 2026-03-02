"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";

interface CoachingHighlight {
  title: string;
  body: string;
  category: "positive" | "warning" | "suggestion" | "concern";
}

interface Report {
  id: string;
  report_date: string;
  workout_summary: string;
  nutrition_summary: string;
  coaching_highlights: CoachingHighlight[];
  action_items: string[];
  full_report: string;
}

const categoryStyles: Record<string, { bg: string; text: string; label: string }> = {
  positive: { bg: "bg-positive/10", text: "text-positive", label: "긍정" },
  warning: { bg: "bg-warning/10", text: "text-warning", label: "주의" },
  suggestion: { bg: "bg-suggestion/10", text: "text-suggestion", label: "제안" },
  concern: { bg: "bg-concern/10", text: "text-concern", label: "우려" },
};

export default function DailyReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch("/api/ai/report?type=daily");
        const data = await res.json();
        setReport(data.report);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          운동을 기록하면 AI 코칭 리포트가 생성됩니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date */}
      <p className="text-sm text-muted-foreground">
        {new Date(report.report_date).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      </p>

      {/* Workout Summary */}
      {report.workout_summary && (
        <div className="rounded-lg border border-border p-3">
          <h3 className="mb-1 text-sm font-medium">운동 요약</h3>
          <p className="text-sm text-muted-foreground">
            {report.workout_summary}
          </p>
        </div>
      )}

      {/* Nutrition Summary */}
      {report.nutrition_summary && (
        <div className="rounded-lg border border-border p-3">
          <h3 className="mb-1 text-sm font-medium">식단 요약</h3>
          <p className="text-sm text-muted-foreground">
            {report.nutrition_summary}
          </p>
        </div>
      )}

      {/* Coaching Highlights */}
      {report.coaching_highlights?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">코칭 포인트</h3>
          {report.coaching_highlights.map((highlight, i) => {
            const style = categoryStyles[highlight.category] ?? categoryStyles.suggestion;
            return (
              <div
                key={i}
                className={`rounded-lg ${style.bg} p-3`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.text} ${style.bg}`}
                  >
                    {style.label}
                  </span>
                  <h4 className="text-sm font-medium">{highlight.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {highlight.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Items */}
      {report.action_items?.length > 0 && (
        <div className="rounded-lg bg-primary/5 p-3">
          <h3 className="mb-2 text-sm font-medium">내일의 액션 플랜</h3>
          <ul className="space-y-1">
            {report.action_items.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
