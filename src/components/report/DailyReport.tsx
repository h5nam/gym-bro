"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, BotMessageSquare, Dumbbell, Heart, Apple, Battery, Sparkles, Play } from "lucide-react";

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

interface AgentFeedback {
  agent_name: string;
  category: string;
  priority: number;
  title: string;
  body: string;
}

const AGENT_CONFIG: Record<
  string,
  { label: string; icon: typeof Dumbbell; color: string; bgColor: string; tags: string[] }
> = {
  bodybuilding: {
    label: "보디빌딩 코치",
    icon: Dumbbell,
    color: "text-blue-400",
    bgColor: "from-blue-600 to-indigo-900",
    tags: ["근비대", "볼륨"],
  },
  "sports-med": {
    label: "스포츠의학 코치",
    icon: Heart,
    color: "text-red-400",
    bgColor: "from-red-500 to-rose-900",
    tags: ["관절 건강", "부상 예방"],
  },
  nutrition: {
    label: "영양 코치",
    icon: Apple,
    color: "text-orange-400",
    bgColor: "from-orange-400 to-amber-700",
    tags: ["영양소", "에너지"],
  },
  recovery: {
    label: "회복 코치",
    icon: Battery,
    color: "text-purple-400",
    bgColor: "from-purple-500 to-indigo-800",
    tags: ["회복", "피로도"],
  },
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export default function DailyReport() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [agentFeedback, setAgentFeedback] = useState<AgentFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch available dates
  useEffect(() => {
    async function fetchDates() {
      try {
        const res = await fetch("/api/ai/report?type=dates");
        const data = await res.json();
        const sortedDates = data.dates ?? [];
        setDates(sortedDates);
        if (sortedDates.length > 0) {
          setSelectedDate(sortedDates[sortedDates.length - 1]);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchDates();
  }, []);

  // Fetch report for selected date
  const fetchReport = useCallback(async (date: string) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/ai/report?type=daily&date=${date}`);
      const data = await res.json();
      setReport(data.report ?? null);
      setAgentFeedback(data.agentFeedback ?? []);
    } catch {
      setReport(null);
      setAgentFeedback([]);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) fetchReport(selectedDate);
  }, [selectedDate, fetchReport]);

  // Scroll to active date
  useEffect(() => {
    if (scrollRef.current) {
      const active = scrollRef.current.querySelector("[data-active='true']");
      if (active) {
        active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [selectedDate]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh dates and report
        const datesRes = await fetch("/api/ai/report?type=dates");
        const datesData = await datesRes.json();
        setDates(datesData.dates ?? []);
        setSelectedDate(data.reportDate);
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  }

  // Group feedback by agent
  const feedbackByAgent = agentFeedback.reduce(
    (acc, fb) => {
      if (!acc[fb.agent_name]) acc[fb.agent_name] = [];
      acc[fb.agent_name].push(fb);
      return acc;
    },
    {} as Record<string, AgentFeedback[]>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Date Carousel */}
      {dates.length > 0 && (
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {dates.map((date) => {
            const d = new Date(date + "T00:00:00");
            const month = d.getMonth() + 1;
            const day = d.getDate();
            const dayName = DAY_NAMES[d.getDay()];
            const isActive = date === selectedDate;

            return (
              <button
                key={date}
                data-active={isActive}
                onClick={() => setSelectedDate(date)}
                className="flex shrink-0 flex-col items-center justify-center transition-all"
              >
                <div
                  className={`flex h-16 w-14 flex-col items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "border border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="text-[10px] font-medium">
                    {month}/{day}
                  </span>
                  <span className="text-lg font-bold">{dayName}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {generating ? "AI 분석 중..." : "오늘의 AI 코칭 생성"}
      </button>

      {/* Report Content */}
      {reportLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !report && dates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <BotMessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            운동을 기록하면 AI 코칭을 받을 수 있습니다
          </p>
          <p className="text-xs text-muted-foreground">
            위 버튼을 눌러 첫 코칭을 생성해보세요
          </p>
        </div>
      ) : !report ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
          <BotMessageSquare className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {selectedDate
              ? `${new Date(selectedDate + "T00:00:00").toLocaleDateString("ko-KR", {
                  month: "long",
                  day: "numeric",
                })}의 리포트가 없습니다`
              : "날짜를 선택해주세요"}
          </p>
        </div>
      ) : (
        <>
          {/* Agent Insight Cards */}
          {Object.keys(feedbackByAgent).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-base font-bold">에이전트 인사이트</h2>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {agentFeedback.length}개
                </span>
              </div>

              {Object.entries(feedbackByAgent).map(([agentName, feedbacks]) => {
                const config = AGENT_CONFIG[agentName];
                if (!config) return null;
                const Icon = config.icon;

                return (
                  <div
                    key={agentName}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${config.bgColor}`}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="mb-1 font-bold">{config.label}</h3>
                        <div className="space-y-2">
                          {feedbacks.map((fb, i) => (
                            <p
                              key={i}
                              className="text-sm leading-relaxed text-muted-foreground"
                            >
                              {fb.body}
                            </p>
                          ))}
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {feedbacks.map((fb, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {fb.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Orchestrator Final Advice */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-bold">오케스트레이터의 최종 조언</h2>
            </div>

            {/* Coaching Highlights */}
            {report.coaching_highlights?.length > 0 && (
              <div className="mb-4 space-y-2">
                {report.coaching_highlights.map((h, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {h.title}
                    </span>{" "}
                    — {h.body}
                  </p>
                ))}
              </div>
            )}

            {/* Action Items */}
            {report.action_items?.length > 0 && (
              <div className="rounded-xl bg-card/50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  액션 플랜
                </p>
                <ul className="space-y-1.5">
                  {report.action_items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="shrink-0 font-bold text-primary">
                        {i + 1}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
