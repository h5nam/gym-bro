"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/ui/PullToRefresh";
import Link from "next/link";
import {
  Dumbbell,
  Clock,
  Timer,
  ChevronRight,
  ChevronLeft,
  Activity,
  Search,
  CalendarDays,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DAY_NAMES,
  getWeekDates,
  parseKST,
  isSameDay,
  dateKey,
  calcWeekOffset,
} from "@/lib/date-utils";
import { CARDIO_TYPES } from "@/lib/constants";
import { queryKeys, fetchWorkouts } from "@/lib/queries";
import NormalizeButton from "./NormalizeButton";
import SyncButton from "./SyncButton";


export interface SessionData {
  id: string;
  session_name: string;
  muscle_groups: string[] | null;
  started_at: string;
  duration_seconds: number;
  total_volume_kg: number;
  total_sets: number;
  status: string;
  raw_session_id: string | null;
}

export interface RawSessionData {
  id: string;
  activity_type: string;
  started_at: string;
}

export interface CardioMetrics {
  durationMin: number;
  avgHR: number;
  distance: number;
  calories: number;
}

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

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDayOfWeek).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

interface CalendarCell {
  day: number;
  currentMonth: boolean;
}

function getFullMonthGrid(year: number, month: number): CalendarCell[][] {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, currentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, currentMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, currentMonth: false });
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

// --- Main Component ---

export default function WorkoutListView() {
  const queryClient = useQueryClient();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const baseDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [today, weekOffset]);

  const currentMonth = useMemo(() => {
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, [baseDate]);

  const { data: workoutsData, isLoading: workoutsLoading } = useQuery({
    queryKey: queryKeys.workouts.byMonth(currentMonth),
    queryFn: () => fetchWorkouts(currentMonth),
  });

  const sessions = (workoutsData?.sessions ?? []) as SessionData[];
  const rawSessions = (workoutsData?.rawSessions ?? []) as RawSessionData[];
  const cardioMetrics: Record<string, CardioMetrics> = workoutsData?.cardioMetrics ?? {};

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  const sessionDateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const s of sessions) keys.add(dateKey(parseKST(s.started_at)));
    for (const r of rawSessions) keys.add(dateKey(parseKST(r.started_at)));
    return keys;
  }, [sessions, rawSessions]);

  const daySessions = useMemo(
    () =>
      sessions.filter((s) => isSameDay(parseKST(s.started_at), selectedDate)),
    [sessions, selectedDate]
  );

  const dayRaw = useMemo(
    () =>
      rawSessions.filter((r) =>
        isSameDay(parseKST(r.started_at), selectedDate)
      ),
    [rawSessions, selectedDate]
  );

  const totalCount = daySessions.length + dayRaw.length;
  const hasAnyData = sessions.length > 0 || rawSessions.length > 0;

  const monthLabel = baseDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const selectedDateLabel = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${DAY_NAMES[selectedDate.getDay()]})`;

  const handleCalendarSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      setWeekOffset(calcWeekOffset(today, date));
      setCalendarOpen(false);
    },
    [today]
  );

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
  }, [queryClient]);

  if (workoutsLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAnyData) {
    return <EmptyState today={today} />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <h2 className="text-lg font-bold">운동 기록</h2>
        <button
          onClick={() => setCalendarOpen(true)}
          className="rounded-full p-2 transition-colors hover:bg-secondary"
        >
          <CalendarDays className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Week Strip */}
      <div className="sticky top-[52px] z-20 border-b border-border/50 bg-background pb-2 pt-4">
        <div className="mb-3 flex items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="rounded-full p-1 transition-colors hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <h3 className="text-lg font-bold">{monthLabel}</h3>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="rounded-full p-1 transition-colors hover:bg-secondary"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {weekOffset !== 0 && (
            <button
              onClick={() => {
                setWeekOffset(0);
                setSelectedDate(today);
              }}
              className="text-sm font-medium text-primary"
            >
              이번 주
            </button>
          )}
        </div>

        <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-4">
          {weekDates.map((date) => {
            const selected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            const hasData = sessionDateKeys.has(dateKey(date));

            return (
              <div
                key={date.toISOString()}
                className="flex min-w-[3.5rem] flex-shrink-0 flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    selected ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {DAY_NAMES[date.getDay()]}
                </span>
                <button
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-all",
                    selected
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : isToday
                        ? "border border-border bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {date.getDate()}
                  {hasData && !selected && (
                    <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-positive" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session List */}
      <main className="flex-1 space-y-4 p-4 pb-8">
        <div className="mb-1 flex items-center justify-between px-1 text-sm">
          <span className="font-medium text-muted-foreground">
            {selectedDateLabel}
          </span>
          {totalCount > 0 && (
            <span className="text-muted-foreground">
              총 {totalCount}개 세션
            </span>
          )}
        </div>

        {/* Pending raw sessions */}
        {dayRaw.map((raw) => (
          <div
            key={raw.id}
            className="flex flex-col gap-4 rounded-2xl border border-warning/20 bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{raw.activity_type}</h3>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-warning/20 bg-warning/10 px-3 py-1.5 text-xs font-bold text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                정규화 대기
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <NormalizeButton rawSessionId={raw.id} />
            </div>
          </div>
        ))}

        {/* Session cards */}
        {daySessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            cardioMetrics={cardioMetrics[session.id]}
          />
        ))}

        {/* No sessions for this date */}
        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Dumbbell
              className="mb-5 h-12 w-12 text-primary"
              strokeWidth={1.5}
            />
            <p className="mb-1 text-sm text-muted-foreground">
              이 날의 운동 기록이 없습니다
            </p>
            <p className="mb-6 text-xs text-muted-foreground">
              다른 날짜를 선택하거나 Garmin에서 동기화하세요
            </p>
            <SyncButton variant="full" />
          </div>
        )}
      </main>

      {/* Calendar Modal */}
      {calendarOpen && (
        <CalendarModal
          today={today}
          selectedDate={selectedDate}
          onSelect={handleCalendarSelect}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </PullToRefresh>
  );
}

// --- Calendar Modal ---

function CalendarModal({
  today,
  selectedDate,
  onSelect,
  onClose,
}: {
  today: Date;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [calYear, setCalYear] = useState(selectedDate.getFullYear());
  const [calMonth, setCalMonth] = useState(selectedDate.getMonth());
  const [previewDate, setPreviewDate] = useState(selectedDate);

  const calMonthKey = useMemo(() => {
    return `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
  }, [calYear, calMonth]);

  const { data: workoutsData } = useQuery({
    queryKey: queryKeys.workouts.byMonth(calMonthKey),
    queryFn: () => fetchWorkouts(calMonthKey),
  });

  const sessions = (workoutsData?.sessions ?? []) as SessionData[];
  const rawSessions = (workoutsData?.rawSessions ?? []) as RawSessionData[];

  const grid = useMemo(
    () => getFullMonthGrid(calYear, calMonth),
    [calYear, calMonth]
  );

  // Per-date session info for dots + bottom panel
  const dateInfo = useMemo(() => {
    const map = new Map<
      string,
      { sessions: SessionData[]; rawCount: number }
    >();
    for (const s of sessions) {
      const key = dateKey(parseKST(s.started_at));
      const info = map.get(key) || { sessions: [], rawCount: 0 };
      info.sessions.push(s);
      map.set(key, info);
    }
    for (const r of rawSessions) {
      const key = dateKey(parseKST(r.started_at));
      const info = map.get(key) || { sessions: [], rawCount: 0 };
      info.rawCount++;
      map.set(key, info);
    }
    return map;
  }, [sessions, rawSessions]);

  const previewInfo = dateInfo.get(dateKey(previewDate));
  const previewSessions = previewInfo?.sessions ?? [];
  const previewRawCount = previewInfo?.rawCount ?? 0;
  const previewTotal = previewSessions.length + previewRawCount;

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden border-t border-border bg-card sm:h-auto sm:max-w-md sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-background/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold">
              {calYear}년 {calMonth + 1}월
            </h2>
            <button
              onClick={nextMonth}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "py-2 text-xs font-medium",
                  i === 0 ? "text-destructive/80" : "text-muted-foreground"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-x-1 gap-y-3 text-center">
            {grid.flat().map((cell, i) => {
              if (!cell.currentMonth) {
                return (
                  <div
                    key={`o-${i}`}
                    className="flex h-10 w-full flex-col items-center justify-center text-sm text-muted-foreground/30"
                  >
                    {cell.day}
                  </div>
                );
              }

              const cellDate = new Date(calYear, calMonth, cell.day);
              const key = dateKey(cellDate);
              const info = dateInfo.get(key);
              const isSelected = isSameDay(cellDate, previewDate);
              const isToday = isSameDay(cellDate, today);

              const hasConfirmed = info?.sessions.some(
                (s) => s.status === "confirmed"
              );
              const hasDraft =
                info?.sessions.some((s) => s.status !== "confirmed") ||
                (info?.rawCount ?? 0) > 0;

              // Dot color: green if any confirmed, amber if only draft/raw
              const dotColor = hasConfirmed
                ? "bg-positive/70"
                : hasDraft
                  ? "bg-warning/70"
                  : null;

              return (
                <button
                  key={`d-${cell.day}`}
                  onClick={() => setPreviewDate(cellDate)}
                  className={cn(
                    "relative flex h-10 w-full flex-col items-center justify-center rounded-lg text-sm",
                    isSelected
                      ? "bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/30"
                      : isToday
                        ? "font-bold text-foreground"
                        : "text-foreground/80 hover:bg-secondary/50"
                  )}
                >
                  {cell.day}
                  {dotColor && !isSelected && (
                    <span
                      className={cn(
                        "absolute bottom-1.5 h-1 w-1 rounded-full",
                        dotColor
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="border-t border-border/50 bg-background/50 p-5 backdrop-blur-sm">
          {previewTotal > 0 ? (
            <div className="flex items-start gap-4">
              {/* Date + Count Badge */}
              <div className="flex min-w-[3.5rem] flex-col items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {previewDate.getMonth() + 1}월 {previewDate.getDate()}일
                </span>
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <span className="text-xl font-bold">{previewTotal}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    세션
                  </span>
                </div>
              </div>

              {/* Session Summary */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">운동 요약</h4>
                  <button
                    onClick={() => onSelect(previewDate)}
                    className="text-xs font-medium text-primary hover:text-primary/80"
                  >
                    기록 보기
                  </button>
                </div>
                <div className="space-y-2">
                  {previewSessions.map((s) => {
                    const isCardio = s.muscle_groups?.some((g) =>
                      CARDIO_TYPES.includes(g)
                    );
                    const confirmed = s.status === "confirmed";
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/50 p-2 transition-colors hover:bg-secondary"
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            isCardio
                              ? "bg-warning/20 text-warning"
                              : confirmed
                                ? "bg-positive/20 text-positive"
                                : "bg-primary/20 text-primary"
                          )}
                        >
                          {isCardio ? (
                            <Activity className="h-4 w-4" />
                          ) : (
                            <Dumbbell className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-xs font-bold">
                              {s.session_name}
                            </p>
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(parseKST(s.started_at))}
                            </span>
                          </div>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {formatDuration(s.duration_seconds)}
                            {!isCardio &&
                              ` · ${Number(s.total_volume_kg).toLocaleString()}kg`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {previewRawCount > 0 && (
                    <p className="text-[10px] text-warning">
                      + 정규화 대기 {previewRawCount}건
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center">
              <p className="text-sm text-muted-foreground">
                {previewDate.getMonth() + 1}월 {previewDate.getDate()}일 — 운동
                기록 없음
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Session Card ---

function SessionCard({
  session,
  cardioMetrics,
}: {
  session: SessionData;
  cardioMetrics?: CardioMetrics;
}) {
  const startDate = parseKST(session.started_at);
  const isCardio = session.muscle_groups?.some((g) =>
    CARDIO_TYPES.includes(g)
  );
  const isConfirmed = session.status === "confirmed";

  return (
    <Link
      href={`/workouts/${session.id}`}
      className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card p-5 transition-colors hover:border-border"
    >
      {/* Title & Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">{session.session_name}</h3>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold",
            isConfirmed
              ? "border-positive/20 bg-positive/10 text-positive"
              : "border-warning/20 bg-warning/10 text-warning"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isConfirmed ? "bg-positive" : "bg-warning"
            )}
          />
          {isConfirmed ? "확정됨" : "수정 필요"}
        </span>
      </div>

      {/* Time & Duration */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-[18px] w-[18px]" />
          <span>{formatTime(startDate)}</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Timer className="h-[18px] w-[18px]" />
          <span>{formatDuration(session.duration_seconds)}</span>
        </div>
      </div>

      {/* Exercise Icons / Stats */}
      <div className="flex items-center gap-3">
        {isCardio && cardioMetrics ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">
              {[
                cardioMetrics.distance > 0 && `${cardioMetrics.distance}km`,
                cardioMetrics.avgHR > 0 && `${cardioMetrics.avgHR}bpm`,
                cardioMetrics.calories > 0 && `${cardioMetrics.calories}kcal`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Dumbbell className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">
              {Number(session.total_volume_kg).toLocaleString()}kg ·{" "}
              {session.total_sets}세트
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-border/50" />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#202f3f] px-2 py-1 text-xs font-bold text-[#6796c5]">
            Garmin
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Forerunner 965
          </span>
        </div>
        <span className="flex items-center gap-0.5 text-sm font-bold text-primary">
          상세 보기
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

// --- Empty State ---

function EmptyState({ today }: { today: Date }) {
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const grid = useMemo(
    () => getMonthGrid(calYear, calMonth),
    [calYear, calMonth]
  );

  const monthLabel = `${calYear}년 ${calMonth + 1}월`;

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <h2 className="text-lg font-bold">운동 기록</h2>
        <SyncButton />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Month Calendar */}
        <div className="p-4">
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="rounded-full p-1 transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <p className="text-base font-bold">{monthLabel}</p>
              <button
                onClick={nextMonth}
                className="rounded-full p-1 transition-colors hover:bg-secondary"
              >
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="py-2 text-[11px] font-bold text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {grid.flat().map((day, i) => {
                if (day === null)
                  return <div key={`empty-${i}`} className="h-10" />;

                const cellDate = new Date(calYear, calMonth, day);
                const isToday = isSameDay(cellDate, today);
                const isFuture = cellDate > today;

                return (
                  <div
                    key={`day-${day}`}
                    className="flex h-10 items-center justify-center text-sm"
                  >
                    {isToday ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {day}
                      </span>
                    ) : (
                      <span
                        className={isFuture ? "text-muted-foreground/50" : ""}
                      >
                        {day}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Empty Illustration */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20 text-center">
          <div className="relative mb-8 flex h-48 w-48 items-center justify-center rounded-full bg-primary/5">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10" />
            <div className="rounded-full bg-primary/20 p-6">
              <Dumbbell className="h-16 w-16 text-primary" />
            </div>
            <Search className="absolute right-8 top-8 h-8 w-8 text-primary/40" />
          </div>

          <h3 className="mb-3 text-xl font-bold">
            저장된 운동 기록이 없습니다
          </h3>
          <p className="mb-10 text-sm leading-relaxed text-muted-foreground">
            선택한 기간 동안의 운동 기록을 찾을 수 없어요.
            <br />
            Garmin에서 동기화하여 운동을 기록해 보세요.
          </p>

          <div className="w-full space-y-3">
            <SyncButton variant="full" />
          </div>
        </div>
      </div>
    </div>
  );
}
