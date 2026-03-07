"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MoreHorizontal,
  Dumbbell,
  Activity,
  Sparkles,
  Check,
  ArrowUp,
  Loader2,
  Calendar,
  Clock,
  Heart,
  Flame,
  Pencil,
  Mountain,
  Footprints,
  Gauge,
  Timer,
  Zap,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/* ── Types ── */

export interface SessionDetailData {
  id: string;
  session_name: string;
  muscle_groups: string[] | null;
  started_at: string;
  duration_seconds: number;
  total_volume_kg: number;
  total_sets: number;
  status: string;
  raw_session_id: string | null;
  ai_session_feedback: string | null;
}

export interface SetData {
  id: string;
  exercise_name_display: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  is_warmup: boolean;
  set_order: number;
}

export interface CardioData {
  avgHR: number;
  maxHR: number;
  distance: number;
  calories: number;
  avgSpeed: number;
  maxSpeed: number;
  elevationGain: number;
  elevationLoss: number;
  avgCadence: number;
  maxCadence: number;
  aerobicTE: number;
  anaerobicTE: number;
  vO2Max: number;
  avgStrideLength: number;
  steps: number;
  movingDuration: number;
  lapCount: number;
}

interface Props {
  session: SessionDetailData;
  sets: SetData[];
  cardio: CardioData | null;
  isCardio: boolean;
}

/* ── Helpers ── */

function parseKST(dateStr: string): Date {
  return new Date(dateStr.replace(/(\+00(:00)?|Z)$/, ""));
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h < 12 ? "오전" : "오후";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${displayH}:${String(m).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function formatDurationClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm <= 0) return "-";
  const paceSeconds = durationSeconds / distanceKm;
  const min = Math.floor(paceSeconds / 60);
  const sec = Math.floor(paceSeconds % 60);
  return `${min}'${String(sec).padStart(2, "0")}"/km`;
}

function formatDateKR(d: Date): string {
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

/* ── Cardio helpers ── */

const HR_ZONES = [
  { zone: 1, label: "워밍업", min: 0.5, max: 0.6, color: "bg-blue-400" },
  { zone: 2, label: "지방연소", min: 0.6, max: 0.7, color: "bg-emerald-400" },
  { zone: 3, label: "유산소", min: 0.7, max: 0.8, color: "bg-yellow-400" },
  { zone: 4, label: "무산소", min: 0.8, max: 0.9, color: "bg-orange-400" },
  { zone: 5, label: "최대강도", min: 0.9, max: 1.0, color: "bg-red-400" },
];

function getHRZone(hr: number, maxHR: number): { zone: number; label: string } {
  const refMax = maxHR >= 150 ? Math.max(maxHR + 10, 190) : 200;
  const pct = hr / refMax;
  for (let i = HR_ZONES.length - 1; i >= 0; i--) {
    if (pct >= HR_ZONES[i].min) return { zone: HR_ZONES[i].zone, label: HR_ZONES[i].label };
  }
  return { zone: 1, label: "워밍업" };
}

function getTEDescription(te: number): string {
  if (te >= 4.0) return "과부하 — 충분한 회복 필요";
  if (te >= 3.0) return "높은 강도 — 효과적인 자극";
  if (te >= 2.0) return "효과적 — 체력 향상에 기여";
  if (te >= 1.0) return "소폭 향상";
  return "거의 없음";
}

function getTEColor(te: number): string {
  if (te >= 4.0) return "text-destructive";
  if (te >= 3.0) return "text-warning";
  if (te >= 2.0) return "text-positive";
  if (te >= 1.0) return "text-primary";
  return "text-muted-foreground";
}

function getTEBarColor(te: number): string {
  if (te >= 4.0) return "bg-destructive";
  if (te >= 3.0) return "bg-warning";
  if (te >= 2.0) return "bg-positive";
  if (te >= 1.0) return "bg-primary";
  return "bg-muted";
}

function formatDateKRFull(d: Date): string {
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ── Correction types ── */

interface CorrectionResponse {
  success: boolean;
  summary: string;
  corrections: Array<{
    setIndex: number;
    field: string;
    oldValue: string | number;
    newValue: string | number;
    reason: string;
  }>;
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */

export default function WorkoutDetailView({
  session,
  sets,
  cardio,
  isCardio,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(session.status);
  const [sessionName, setSessionName] = useState(session.session_name);

  async function handleRenameSession(newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === sessionName) return;
    const prev = sessionName;
    setSessionName(trimmed);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("workout_sessions")
        .update({ session_name: trimmed })
        .eq("id", session.id);
      if (error) throw error;
    } catch {
      setSessionName(prev);
    }
  }

  // Correction chat
  const [message, setMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "ai"; text: string }>
  >([]);

  // Confirm
  const [confirmLoading, setConfirmLoading] = useState(false);

  // AI session feedback
  const [aiFeedback, setAiFeedback] = useState(session.ai_session_feedback);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Correction complete modal
  const [correctionModal, setCorrectionModal] = useState<{
    open: boolean;
    summary: string;
  }>({ open: false, summary: "" });

  const startDate = parseKST(session.started_at);
  const isDraft = status === "draft";

  // Mutable sets for inline editing
  const [localSets, setLocalSets] = useState(sets);

  // Group sets by exercise
  const groupedSets = localSets.reduce<Record<string, SetData[]>>((acc, set) => {
    const key = set.exercise_name_display;
    if (!acc[key]) acc[key] = [];
    acc[key].push(set);
    return acc;
  }, {});

  async function handleRenameExercise(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;

    // Capture IDs before optimistic update
    const setIds = localSets
      .filter((s) => s.exercise_name_display === oldName)
      .map((s) => s.id);

    // Optimistic UI update
    setLocalSets((prev) =>
      prev.map((s) =>
        s.exercise_name_display === oldName
          ? { ...s, exercise_name_display: trimmed }
          : s
      )
    );

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("workout_sets")
        .update({ exercise_name_display: trimmed })
        .in("id", setIds);
      if (error) throw error;
    } catch {
      // Rollback on failure
      setLocalSets((prev) =>
        prev.map((s) =>
          setIds.includes(s.id)
            ? { ...s, exercise_name_display: oldName }
            : s
        )
      );
    }
  }

  /* ── Handlers ── */

  async function handleConfirm() {
    setConfirmLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("workout_sessions")
        .update({
          status: "confirmed",
          user_confirmed_at: new Date().toISOString(),
        })
        .eq("id", session.id);
      if (error) throw error;

      setStatus("confirmed");
      router.refresh();
    } catch (error) {
      console.error("Confirm error:", error);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || chatLoading) return;

    const userMessage = message.trim();
    setMessage("");
    setChatHistory((h) => [...h, { role: "user", text: userMessage }]);
    setChatLoading(true);

    try {
      const res = await fetch(`/api/workouts/${session.id}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data: CorrectionResponse = await res.json();

      if (data.success) {
        setChatHistory((h) => [...h, { role: "ai", text: data.summary }]);
        setCorrectionModal({ open: true, summary: data.summary });
      } else {
        setChatHistory((h) => [
          ...h,
          { role: "ai", text: "보정에 실패했습니다. 다시 시도해주세요." },
        ]);
      }
    } catch {
      setChatHistory((h) => [
        ...h,
        { role: "ai", text: "오류가 발생했습니다." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleGenerateFeedback() {
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/ai/session-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (data.success) {
        setAiFeedback(data.feedback);
      }
    } catch {
      // ignore
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border">
        <Link
          href="/workouts"
          className="flex items-center justify-center p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-lg font-bold">운동 상세</h2>
        <button className="flex items-center justify-center p-2 rounded-full hover:bg-secondary transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      {/* ── Main ── */}
      <main className={cn("flex-1 overflow-y-auto", isDraft ? "pb-44" : "pb-4")}>
        {isCardio ? (
          <CardioContent
            session={session}
            cardio={cardio}
            startDate={startDate}
            isDraft={isDraft}
            aiFeedback={aiFeedback}
            feedbackLoading={feedbackLoading}
            onGenerateFeedback={handleGenerateFeedback}
          />
        ) : (
          <StrengthContent
            session={session}
            sessionName={sessionName}
            groupedSets={groupedSets}
            startDate={startDate}
            isDraft={isDraft}
            aiFeedback={aiFeedback}
            feedbackLoading={feedbackLoading}
            onGenerateFeedback={handleGenerateFeedback}
            onRenameExercise={handleRenameExercise}
            onRenameSession={handleRenameSession}
          />
        )}

        {/* Chat history */}
        {chatHistory.length > 0 && (
          <div className="px-4 mt-4 space-y-2">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary/10 ml-8"
                    : "bg-secondary mr-8"
                )}
              >
                <span className="font-medium text-xs text-muted-foreground block mb-0.5">
                  {msg.role === "user" ? "나" : "AI"}
                </span>
                {msg.text}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Fixed bottom bar (draft only) ── */}
      {isDraft && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-10">
          <div className="max-w-lg mx-auto px-4 space-y-3 pb-4">
            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={confirmLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base py-3.5 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {confirmLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              {confirmLoading ? "확정 처리 중..." : "운동 확정하기"}
            </button>

            {/* AI Chat Input */}
            <form onSubmit={handleSendMessage} className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="자연어로 운동 기록을 수정해보세요"
                disabled={chatLoading}
                className="w-full pl-11 pr-12 py-3.5 bg-secondary/80 border border-border text-foreground placeholder-muted-foreground rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-md text-sm"
              />
              <button
                type="submit"
                disabled={chatLoading || !message.trim()}
                className="absolute inset-y-0 right-2 flex items-center justify-center p-2"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    message.trim()
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/20 text-primary"
                  )}
                >
                  {chatLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </div>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Correction Complete Modal */}
      {correctionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-positive/20">
                <Check className="h-5 w-5 text-positive" />
              </div>
              <h3 className="text-lg font-bold">수정 완료</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
              {correctionModal.summary}
            </p>
            <button
              onClick={() => {
                setCorrectionModal({ open: false, summary: "" });
                // full reload 필요: localSets 등 useState 초기값이 서버 props에서 오므로
                // router.refresh()만으로는 클라이언트 state가 갱신되지 않음
                window.location.reload();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Strength Content
   ══════════════════════════════════════════════ */

function StrengthContent({
  session,
  sessionName,
  groupedSets,
  startDate,
  isDraft,
  aiFeedback,
  feedbackLoading,
  onGenerateFeedback,
  onRenameExercise,
  onRenameSession,
}: {
  session: SessionDetailData;
  sessionName: string;
  groupedSets: Record<string, SetData[]>;
  startDate: Date;
  isDraft: boolean;
  aiFeedback: string | null;
  feedbackLoading: boolean;
  onGenerateFeedback: () => void;
  onRenameExercise: (oldName: string, newName: string) => Promise<void>;
  onRenameSession: (newName: string) => Promise<void>;
}) {
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(sessionName);
  return (
    <>
      {/* Hero */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <form
                className="flex items-center gap-2 mb-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onRenameSession(titleValue);
                  setEditingTitle(false);
                }}
              >
                <input
                  autoFocus
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="flex-1 rounded-lg border border-primary/40 bg-secondary px-3 py-1.5 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="rounded-full p-1.5 text-positive hover:bg-positive/10 transition-colors"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitleValue(sessionName);
                    setEditingTitle(false);
                  }}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold tracking-tight truncate">
                  {sessionName}
                </h1>
                <button
                  onClick={() => {
                    setTitleValue(sessionName);
                    setEditingTitle(true);
                  }}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDateKR(startDate)}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <Clock className="h-4 w-4" />
              <span>{formatDuration(session.duration_seconds)}</span>
            </div>
          </div>
          {session.raw_session_id && (
            <span className="shrink-0 text-xs font-medium px-2 py-1 rounded bg-suggestion/20 text-suggestion border border-suggestion/20 flex items-center gap-1">
              <Activity className="h-3 w-3" /> Garmin
            </span>
          )}
        </div>

        {/* AI Analysis Banner */}
        <div className="mt-6 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">AI 분석</p>
            {aiFeedback ? (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                {aiFeedback}
              </p>
            ) : (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">
                  보디빌딩 코치가 이 세션을 분석합니다.
                </p>
                <button
                  onClick={onGenerateFeedback}
                  disabled={feedbackLoading}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                >
                  {feedbackLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {feedbackLoading ? "분석 중..." : "AI 분석 시작"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="px-4 py-4 space-y-4">
        {Object.entries(groupedSets).map(([exerciseName, exerciseSets]) => (
          <div
            key={exerciseName}
            className="bg-secondary/30 rounded-2xl p-4 border border-border"
          >
            {/* Exercise header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <Dumbbell className="h-5 w-5 text-muted-foreground" />
              </div>
              {editingExercise === exerciseName ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await onRenameExercise(exerciseName, editValue);
                    setEditingExercise(null);
                  }}
                >
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-lg border border-primary/40 bg-secondary px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="rounded-full p-1.5 text-positive hover:bg-positive/10 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingExercise(null)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <h3 className="font-bold text-lg truncate">{exerciseName}</h3>
                  <button
                    onClick={() => {
                      setEditingExercise(exerciseName);
                      setEditValue(exerciseName);
                    }}
                    className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Set grid */}
            <div className="space-y-2">
              {/* Column header */}
              <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                <div className="col-span-2">세트</div>
                <div className="col-span-4 text-center">kg</div>
                <div className="col-span-4 text-center">횟수</div>
                {isDraft && <div className="col-span-2 text-right">편집</div>}
              </div>

              {/* Set rows */}
              {exerciseSets.map((set) => (
                <div
                  key={set.id}
                  className="grid grid-cols-12 items-center px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="col-span-2 font-bold text-muted-foreground">
                    {set.is_warmup ? "W" : set.set_number}
                  </div>
                  <div className="col-span-4 text-center font-bold text-xl">
                    {Number(set.weight_kg)}
                  </div>
                  <div className="col-span-4 text-center font-bold text-xl">
                    {set.reps}
                  </div>
                  {isDraft && (
                    <div className="col-span-2 flex justify-end">
                      <button className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   Cardio Content
   ══════════════════════════════════════════════ */

function CardioContent({
  session,
  cardio,
  startDate,
  aiFeedback,
  feedbackLoading,
  onGenerateFeedback,
}: {
  session: SessionDetailData;
  cardio: CardioData | null;
  startDate: Date;
  isDraft: boolean;
  aiFeedback: string | null;
  feedbackLoading: boolean;
  onGenerateFeedback: () => void;
}) {
  const effectiveDuration =
    cardio && cardio.movingDuration > 0
      ? cardio.movingDuration
      : session.duration_seconds;

  return (
    <>
      {/* ── A: Device & Date ── */}
      <section className="p-6 text-center">
        {session.raw_session_id && (
          <div className="inline-block px-3 py-1 bg-positive/10 text-positive rounded-full text-xs font-bold mb-3 uppercase tracking-wider">
            Garmin Forerunner
          </div>
        )}
        <h2 className="text-2xl font-bold mb-1">
          {formatDateKRFull(startDate)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatTime(startDate)}
        </p>
      </section>

      {/* ── B: Primary Stats 2x2 ── */}
      {cardio && (
        <section className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            {cardio.distance > 0 && (
              <div className="bg-positive/5 p-4 rounded-xl border border-positive/10">
                <p className="text-muted-foreground text-xs font-medium mb-1">
                  거리
                </p>
                <p className="text-2xl font-bold">
                  <span className="text-positive">{cardio.distance}</span>
                  <span className="text-sm font-medium text-muted-foreground ml-1">
                    km
                  </span>
                </p>
              </div>
            )}

            <div className="bg-positive/5 p-4 rounded-xl border border-positive/10">
              <p className="text-muted-foreground text-xs font-medium mb-1">
                시간
              </p>
              <p className="text-2xl font-bold">
                {formatDurationClock(effectiveDuration)}
              </p>
            </div>

            {cardio.distance > 0 && effectiveDuration > 0 && (
              <div className="bg-positive/5 p-4 rounded-xl border border-positive/10">
                <p className="text-muted-foreground text-xs font-medium mb-1">
                  평균 페이스
                </p>
                <p className="text-2xl font-bold">
                  {formatPace(cardio.distance, effectiveDuration)}
                </p>
              </div>
            )}

            {cardio.calories > 0 && (
              <div className="bg-positive/5 p-4 rounded-xl border border-positive/10">
                <p className="text-muted-foreground text-xs font-medium mb-1">
                  칼로리
                </p>
                <p className="text-2xl font-bold">
                  {cardio.calories}
                  <span className="text-sm font-medium text-muted-foreground ml-1">
                    kcal
                  </span>
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── C: Heart Rate Zones ── */}
      {cardio && cardio.avgHR > 0 && (
        <section className="px-4 mb-6">
          <div className="bg-secondary/30 rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-destructive" />
                <h3 className="font-bold text-sm">심박수 구간</h3>
              </div>
              {cardio.maxHR > 0 && (
                <span className="text-xs text-muted-foreground">
                  최대 {cardio.maxHR} bpm
                </span>
              )}
            </div>

            {/* Zone bars */}
            <div className="space-y-2.5">
              {(() => {
                const refMax =
                  cardio.maxHR >= 150
                    ? Math.max(cardio.maxHR + 10, 190)
                    : 200;
                const avgZone = getHRZone(cardio.avgHR, cardio.maxHR);
                const maxZone = getHRZone(cardio.maxHR, cardio.maxHR);

                return HR_ZONES.slice()
                  .reverse()
                  .map((z) => {
                    const minBpm = Math.round(refMax * z.min);
                    const maxBpm = Math.round(refMax * z.max);
                    const isAvgZone = avgZone.zone === z.zone;
                    const isMaxZone = maxZone.zone === z.zone;

                    return (
                      <div key={z.zone} className="flex items-center gap-3">
                        <span className="text-[10px] w-14 text-muted-foreground font-bold shrink-0">
                          Zone {z.zone}
                        </span>
                        <div className="flex-1 relative">
                          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                z.color,
                                isAvgZone || isMaxZone
                                  ? "opacity-100"
                                  : "opacity-30"
                              )}
                              style={{
                                width: isMaxZone
                                  ? "100%"
                                  : isAvgZone
                                    ? "70%"
                                    : "15%",
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0 w-28 flex items-center justify-end gap-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {minBpm}-{maxBpm}
                          </span>
                          {isAvgZone && (
                            <span className="text-[9px] font-bold text-positive bg-positive/10 px-1.5 py-0.5 rounded">
                              평균
                            </span>
                          )}
                          {isMaxZone && (
                            <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                              최대
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>

            {/* HR summary numbers */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold">{cardio.avgHR}</p>
                <p className="text-[10px] text-muted-foreground">
                  평균 bpm ·{" "}
                  <span className="text-positive font-medium">
                    {getHRZone(cardio.avgHR, cardio.maxHR).label}
                  </span>
                </p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold">{cardio.maxHR}</p>
                <p className="text-[10px] text-muted-foreground">
                  최대 bpm ·{" "}
                  <span className="text-destructive font-medium">
                    {getHRZone(cardio.maxHR, cardio.maxHR).label}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── D: Training Effect ── */}
      {cardio && cardio.aerobicTE > 0 && (
        <section className="px-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-warning" />
            <h3 className="font-bold text-sm">트레이닝 이펙트</h3>
            {cardio.vO2Max > 0 && (
              <span className="ml-auto text-xs font-bold text-positive bg-positive/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                VO₂max {cardio.vO2Max}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {/* Aerobic */}
            <div className="bg-secondary/30 rounded-xl p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">유산소</span>
                <span className={cn("text-sm font-bold", getTEColor(cardio.aerobicTE))}>
                  {cardio.aerobicTE.toFixed(1)}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", getTEBarColor(cardio.aerobicTE))}
                  style={{ width: `${Math.min(cardio.aerobicTE / 5, 1) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {getTEDescription(cardio.aerobicTE)}
              </p>
            </div>

            {/* Anaerobic */}
            {cardio.anaerobicTE > 0 && (
              <div className="bg-secondary/30 rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">무산소</span>
                  <span className={cn("text-sm font-bold", getTEColor(cardio.anaerobicTE))}>
                    {cardio.anaerobicTE.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", getTEBarColor(cardio.anaerobicTE))}
                    style={{ width: `${Math.min(cardio.anaerobicTE / 5, 1) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {getTEDescription(cardio.anaerobicTE)}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── E: Additional Metrics Grid ── */}
      {cardio && (
        <AdditionalMetrics cardio={cardio} totalDuration={session.duration_seconds} />
      )}

      {/* ── F: AI Analysis ── */}
      <section className="px-4 mb-6">
        <div className="bg-positive/10 border border-positive/20 p-4 rounded-xl flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-positive mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">AI 분석</p>
            {aiFeedback ? (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                {aiFeedback}
              </p>
            ) : (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">
                  유산소 코치가 이 세션을 분석합니다.
                </p>
                <button
                  onClick={onGenerateFeedback}
                  disabled={feedbackLoading}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-positive/20 px-3 py-1.5 text-xs font-medium text-positive hover:bg-positive/30 transition-colors disabled:opacity-50"
                >
                  {feedbackLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {feedbackLoading ? "분석 중..." : "AI 분석 시작"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── G: Session Info Footer ── */}
      <section className="px-4 mb-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-medium">{session.session_name}</span>
          {cardio && cardio.avgSpeed > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span className="text-sm">평균 {cardio.avgSpeed} km/h</span>
            </>
          )}
          {cardio && cardio.lapCount > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span className="text-sm">{cardio.lapCount}랩</span>
            </>
          )}
        </div>
      </section>
    </>
  );
}

/* ── Additional Metrics sub-component ── */

function AdditionalMetrics({
  cardio,
  totalDuration,
}: {
  cardio: CardioData;
  totalDuration: number;
}) {
  const items: Array<{ icon: React.ReactNode; label: string; value: string }> =
    [];

  if (cardio.elevationGain > 0) {
    items.push({
      icon: <Mountain className="h-3.5 w-3.5 text-positive" />,
      label: "고도 상승",
      value: `${cardio.elevationGain}m`,
    });
  }
  if (cardio.elevationLoss > 0) {
    items.push({
      icon: <Mountain className="h-3.5 w-3.5 text-muted-foreground rotate-180" />,
      label: "고도 하강",
      value: `${cardio.elevationLoss}m`,
    });
  }
  if (cardio.avgCadence > 0) {
    items.push({
      icon: <Footprints className="h-3.5 w-3.5 text-primary" />,
      label: "평균 케이던스",
      value: `${cardio.avgCadence} spm`,
    });
  }
  if (cardio.maxCadence > 0) {
    items.push({
      icon: <Footprints className="h-3.5 w-3.5 text-muted-foreground" />,
      label: "최대 케이던스",
      value: `${cardio.maxCadence} spm`,
    });
  }
  if (cardio.avgStrideLength > 0) {
    items.push({
      icon: <Gauge className="h-3.5 w-3.5 text-primary" />,
      label: "평균 보폭",
      value: `${cardio.avgStrideLength}m`,
    });
  }
  if (cardio.steps > 0) {
    items.push({
      icon: <Footprints className="h-3.5 w-3.5 text-positive" />,
      label: "총 걸음",
      value: cardio.steps.toLocaleString(),
    });
  }
  if (cardio.maxSpeed > 0) {
    items.push({
      icon: <Gauge className="h-3.5 w-3.5 text-warning" />,
      label: "최고 속도",
      value: `${cardio.maxSpeed} km/h`,
    });
  }
  if (cardio.movingDuration > 0 && cardio.movingDuration !== totalDuration) {
    items.push({
      icon: <Timer className="h-3.5 w-3.5 text-muted-foreground" />,
      label: "실이동 시간",
      value: formatDurationClock(cardio.movingDuration),
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="px-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-bold text-sm">상세 지표</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-secondary/30 rounded-lg p-3 border border-border flex items-center gap-2.5"
          >
            <div className="shrink-0">{item.icon}</div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="text-sm font-bold">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
