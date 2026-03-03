"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Dumbbell,
  UtensilsCrossed,
  BotMessageSquare,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Flame,
  Scale,
  Timer,
  Send,
  Loader2,
  Sparkles,
  Activity,
  Heart,
  Route,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DAY_NAMES,
  getWeekDates,
  isSameDay,
  toDateString,
  parseKST,
} from "@/lib/date-utils";

// --- Types ---

interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface CardioMetrics {
  durationMin: number;
  avgHR: number;
  distance: number;
  calories: number;
}

interface RecentWorkout {
  id: string;
  session_name: string;
  started_at: string;
  duration_seconds: number;
  total_volume_kg: number;
  total_sets: number;
  status: string;
  muscle_groups: string[] | null;
  isCardio: boolean;
  cardio?: CardioMetrics;
}

interface CoachingHighlight {
  title: string;
  body: string;
}

export interface InitialData {
  userName: string;
  todayMeals: MealTotals | null;
  latestBodyMetric: { weight_kg: number; measured_at: string } | null;
  recentWorkouts: RecentWorkout[];
  latestCoachingHighlight: CoachingHighlight | null;
  todayDateString: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// --- Constants ---

const TARGETS = { calories: 2200, protein: 180, carbs: 220, fat: 70 };

// --- Helpers ---

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h < 12 ? "오전" : "오후";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${h12}:${m.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

// --- Main Component ---

export default function HomeDashboard({
  initialData,
}: {
  initialData: InitialData;
}) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const [mealTotals, setMealTotals] = useState<MealTotals | null>(
    initialData.todayMeals
  );
  const [loadingMeals, setLoadingMeals] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const weekDates = getWeekDates(
    new Date(today.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000)
  );

  // Fetch meals when selected date changes
  const fetchMeals = useCallback(async (dateStr: string) => {
    setLoadingMeals(true);
    try {
      const res = await fetch(`/api/meals?date=${dateStr}`);
      const data = await res.json();
      if (data.meals && data.meals.length > 0) {
        const totals = data.meals.reduce(
          (
            acc: MealTotals,
            m: {
              total_calories: number;
              total_protein_g: number;
              total_carbs_g: number;
              total_fat_g: number;
            }
          ) => ({
            calories: acc.calories + (m.total_calories ?? 0),
            protein: acc.protein + (m.total_protein_g ?? 0),
            carbs: acc.carbs + (m.total_carbs_g ?? 0),
            fat: acc.fat + (m.total_fat_g ?? 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        setMealTotals(totals);
      } else {
        setMealTotals(null);
      }
    } catch {
      setMealTotals(null);
    } finally {
      setLoadingMeals(false);
    }
  }, []);

  useEffect(() => {
    if (!isSameDay(selectedDate, today)) {
      fetchMeals(toDateString(selectedDate));
    } else {
      setMealTotals(initialData.todayMeals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle chat send
  async function handleChatSend() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "응답을 받을 수 없습니다." },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // Handle sync
  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync/garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSync: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`${data.synced}건 동기화 완료`);
      } else {
        setSyncResult(`실패: ${data.error}`);
      }
    } catch {
      setSyncResult("동기화 오류");
    } finally {
      setSyncing(false);
    }
  }

  // Format selected date for display
  const dateDisplay = selectedDate.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
  const dayName = DAY_NAMES[selectedDate.getDay()] + "요일";

  // Month label for week strip
  const monthLabel = weekDates[0].toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col">
      {/* A. Header */}
      <header className="flex items-center justify-between p-4 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="relative block">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition-all hover:ring-2 hover:ring-primary/30">
              {initialData.userName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-positive" />
          </Link>
          <div>
            <p className="text-sm text-muted-foreground leading-none">
              환영합니다,
            </p>
            <h1 className="text-xl font-bold leading-tight">
              {initialData.userName}님!
            </h1>
          </div>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:text-primary">
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {/* B. Date Header */}
      <div className="px-4 pb-4">
        <p className="text-3xl font-bold">
          {dateDisplay}{" "}
          <span className="text-primary">{dayName}</span>
        </p>
      </div>

      {/* C. Week Strip */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {monthLabel}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="rounded-full p-1.5 hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="rounded-full p-1.5 hover:bg-secondary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {weekDates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl py-3 transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "border border-border bg-card hover:bg-secondary"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase",
                    isSelected ? "opacity-80" : "text-muted-foreground"
                  )}
                >
                  {(date.getMonth() + 1)}월
                </span>
                <span className="text-lg font-bold">{date.getDate()}</span>
                {isToday && !isSelected && (
                  <div className="h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 space-y-5 px-4 pb-8">
        {/* D. Today's Status Card */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {isSameDay(selectedDate, today) ? "오늘의 상태" : `${selectedDate.getMonth() + 1}/${selectedDate.getDate()} 상태`}
            </h3>
            <Link
              href="/meals"
              className="text-xs font-medium text-primary hover:underline"
            >
              상세보기
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-5 grid grid-cols-2 gap-4">
              {/* Calories */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Flame className="h-4 w-4 text-primary" />
                  섭취 칼로리
                </div>
                <div className="text-2xl font-bold">
                  {loadingMeals ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <>
                      {mealTotals?.calories ?? 0}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        kcal
                      </span>
                    </>
                  )}
                </div>
                {mealTotals && (
                  <div className="text-xs text-muted-foreground">
                    목표 {TARGETS.calories}kcal
                  </div>
                )}
              </div>
              {/* Weight */}
              <div className="flex flex-col gap-1 border-l border-border pl-4">
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Scale className="h-4 w-4 text-primary" />
                  체중
                </div>
                <div className="text-2xl font-bold">
                  {initialData.latestBodyMetric ? (
                    <>
                      {initialData.latestBodyMetric.weight_kg}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        kg
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                {initialData.latestBodyMetric && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(initialData.latestBodyMetric.measured_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 측정
                  </div>
                )}
              </div>
            </div>

            {/* Macro Progress Bars */}
            <div className="space-y-3">
              <MacroBar
                label="단백질"
                value={mealTotals?.protein ?? 0}
                target={TARGETS.protein}
                colorClass="bg-positive"
                loading={loadingMeals}
              />
              <MacroBar
                label="탄수화물"
                value={mealTotals?.carbs ?? 0}
                target={TARGETS.carbs}
                colorClass="bg-primary"
                loading={loadingMeals}
              />
              <MacroBar
                label="지방"
                value={mealTotals?.fat ?? 0}
                target={TARGETS.fat}
                colorClass="bg-warning"
                loading={loadingMeals}
              />
            </div>
          </div>
        </section>

        {/* E. AI Coach Banner */}
        <section>
          <Link href="/reports/daily" className="block">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-5">
              <Sparkles className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rotate-12 text-primary/5" />
              <div className="relative z-10">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground shadow-sm">
                    <BotMessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    짐브로 AI 코치
                  </span>
                </div>
                {initialData.latestCoachingHighlight ? (
                  <>
                    <h4 className="mb-1 text-base font-bold leading-snug">
                      {initialData.latestCoachingHighlight.title}
                    </h4>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {initialData.latestCoachingHighlight.body}
                    </p>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    운동을 기록하면 AI 코칭을 받을 수 있습니다. 탭하여 리포트를 확인하세요.
                  </p>
                )}
              </div>
            </div>
          </Link>
        </section>

        {/* F. AI Chat Input Bar */}
        <section>
          <button
            onClick={() => setChatOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <BotMessageSquare className="h-5 w-5" />
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-positive" />
            </div>
            <div className="flex flex-1 items-center rounded-xl border border-border bg-secondary/30 px-4 py-2.5">
              <span className="truncate text-xs text-muted-foreground">
                식단이나 운동에 대해 궁금한 점을 물어보세요!
              </span>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Send className="h-4 w-4" />
            </div>
          </button>
        </section>

        {/* G. Quick Actions */}
        <section>
          <h3 className="mb-3 text-lg font-bold">빠른 실행</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/meals"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:bg-secondary active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">식단 기록</div>
                <div className="text-[10px] text-muted-foreground">
                  스캔 또는 검색
                </div>
              </div>
            </Link>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:bg-secondary active:scale-95 disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {syncing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold">
                  {syncResult ?? "데이터 동기화"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Garmin Connect
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* H. Recent Workouts (up to 3) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">최근 운동</h3>
            {initialData.recentWorkouts.length > 0 && (
              <Link
                href="/workouts"
                className="text-xs font-medium text-primary hover:underline"
              >
                전체보기
              </Link>
            )}
          </div>
          {initialData.recentWorkouts.length > 0 ? (
            <div className="space-y-3">
              {initialData.recentWorkouts.map((workout) => (
                <Link key={workout.id} href={`/workouts/${workout.id}`}>
                  <div className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary/30">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            workout.isCardio
                              ? "bg-positive/10 text-positive"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {workout.isCardio ? (
                            <Activity className="h-4.5 w-4.5" />
                          ) : (
                            <Dumbbell className="h-4.5 w-4.5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold leading-tight">
                            {workout.session_name}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{formatRelativeDate(parseKST(workout.started_at))}</span>
                            <span>·</span>
                            <span>{formatTime(parseKST(workout.started_at))}</span>
                            <span>·</span>
                            <span>{formatDuration(workout.duration_seconds)}</span>
                          </div>
                        </div>
                      </div>
                      {workout.status === "draft" && (
                        <span className="shrink-0 rounded border border-warning/20 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
                          초안
                        </span>
                      )}
                    </div>
                    {/* Type-specific metrics */}
                    {workout.isCardio && workout.cardio ? (
                      <div className="flex gap-4">
                        <WorkoutStat
                          icon={<Route className="h-3 w-3" />}
                          label="거리"
                          value={`${workout.cardio.distance}km`}
                        />
                        <WorkoutStat
                          icon={<Heart className="h-3 w-3" />}
                          label="평균 심박"
                          value={`${workout.cardio.avgHR}bpm`}
                        />
                        <WorkoutStat
                          icon={<Flame className="h-3 w-3" />}
                          label="칼로리"
                          value={`${workout.cardio.calories}kcal`}
                        />
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <WorkoutStat
                          icon={<Dumbbell className="h-3 w-3" />}
                          label="총 볼륨"
                          value={`${workout.total_volume_kg.toLocaleString()}kg`}
                        />
                        <WorkoutStat
                          icon={<Activity className="h-3 w-3" />}
                          label="세트"
                          value={`${workout.total_sets}`}
                        />
                        <WorkoutStat
                          icon={<Timer className="h-3 w-3" />}
                          label="시간"
                          value={formatDuration(workout.duration_seconds)}
                        />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
              <div className="relative mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <Dumbbell className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">
                운동 기록이 없습니다
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Garmin 데이터를 동기화하여 시작하세요
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Garmin 동기화
              </button>
              {syncResult && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {syncResult}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Bottom spacer */}
        <div className="h-4" />
      </main>

      {/* Chat Full-Screen View */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex justify-center bg-background">
          <div className="flex h-full w-full max-w-lg flex-col overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-primary/10 bg-background p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setChatOpen(false)}
                  className="rounded-full p-2 transition-colors hover:bg-primary/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/20">
                      <BotMessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-positive" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold leading-tight">
                      짐브로 AI 코치
                    </h2>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-primary">
                      Online Now
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {/* Chat Messages */}
            <main className="flex-1 space-y-5 overflow-y-auto p-4">
              {/* Date Divider */}
              <div className="flex justify-center">
                <span className="rounded-full bg-secondary/80 px-3 py-1 text-[11px] font-bold uppercase tracking-tight text-muted-foreground">
                  {new Date().toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              {/* Empty State */}
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                    <BotMessageSquare className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="mb-1 text-sm font-medium">
                    무엇이든 물어보세요!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    식단, 운동, 체성분에 대해 코칭해드립니다
                  </p>
                </div>
              )}

              {/* Messages */}
              {chatMessages.map((msg, i) =>
                msg.role === "assistant" ? (
                  /* AI Message */
                  <div key={i} className="flex items-end gap-3 max-w-[85%]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-secondary">
                      <BotMessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="ml-1 text-[11px] font-bold text-primary">
                        짐브로 AI
                      </span>
                      <div className="rounded-xl rounded-bl-none border border-border bg-secondary px-4 py-3 shadow-sm">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* User Message */
                  <div
                    key={i}
                    className="ml-auto flex max-w-[85%] flex-col items-end gap-1"
                  >
                    <span className="mr-1 text-[11px] font-bold text-muted-foreground">
                      나
                    </span>
                    <div className="rounded-xl rounded-br-none bg-primary px-4 py-3 shadow-lg shadow-primary/10">
                      <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-primary-foreground">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Loading */}
              {chatLoading && (
                <div className="flex items-end gap-3 max-w-[85%]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-secondary">
                    <BotMessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="ml-1 text-[11px] font-bold text-primary">
                      짐브로 AI
                    </span>
                    <div className="flex items-center gap-2 rounded-xl rounded-bl-none border border-border bg-secondary px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        생각 중...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </main>

            {/* Input Area — pb-20 to clear BottomNav (fixed h-16 + extra) */}
            <footer className="border-t border-primary/10 bg-background px-4 pb-20 pt-3">
              {/* Suggestion Chips */}
              {chatMessages.length === 0 && (
                <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
                  {[
                    "오늘 뭐 먹으면 좋을까?",
                    "운동 루틴 추천해줘",
                    "체중 변화 분석해줘",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        setChatInput(chip);
                      }}
                      className="whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 rounded-2xl border border-transparent bg-secondary/50 px-3 py-2 transition-all focus-within:border-primary/50">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder="질문하기..."
                  className="flex-1 border-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatLoading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:shadow-none"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Helpers (continued) ---

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// --- Sub-components ---

function WorkoutStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-secondary/50 px-2.5 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-xs font-bold">{value}</div>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  target,
  colorClass,
  loading,
}: {
  label: string;
  value: number;
  target: number;
  colorClass: string;
  loading: boolean;
}) {
  const pct = Math.min(100, target > 0 ? (value / target) * 100 : 0);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {loading ? "—" : `${Math.round(value)}g / ${target}g`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            colorClass
          )}
          style={{ width: loading ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}
