"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UtensilsCrossed,
  X,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Sparkles,
  Check,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DAY_NAMES,
  getWeekDates,
  isSameDay,
  dateKey,
  toDateString,
} from "@/lib/date-utils";

// --- Types ---

interface MealLog {
  id: string;
  meal_type: string;
  raw_text: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  parsed_items: MealItem[];
  created_at: string;
}

interface MealItem {
  name: string;
  amount: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface RecentItem {
  raw_text: string;
  meal_type: string;
  total_calories: number;
}

interface ParsedResult {
  items: MealItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
}

// --- Constants ---

const mealTypes = [
  { value: "breakfast", label: "아침", icon: "🌅" },
  { value: "lunch", label: "점심", icon: "☀️" },
  { value: "dinner", label: "저녁", icon: "🌙" },
  { value: "snack", label: "간식", icon: "🍪" },
] as const;

const mealTypeLabels: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

// --- Image compression ---

function compressImage(
  file: File
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1024;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) {
            h = Math.round((h * MAX) / w);
            w = MAX;
          } else {
            w = Math.round((w * MAX) / h);
            h = MAX;
          }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg", previewUrl: dataUrl });
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// --- Main Component ---

export default function MealsDashboard() {
  // Date/Week state
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [today, weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  const monthLabel = baseDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  // Meal data
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [mealDateKeys, setMealDateKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Input state
  const [text, setText] = useState("");
  const [mealType, setMealType] = useState<string>("lunch");
  const [submitting, setSubmitting] = useState(false);

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI analysis result (pending confirmation)
  const [pendingResult, setPendingResult] = useState<ParsedResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Data fetching ---

  const fetchMeals = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = toDateString(date);
      const res = await fetch(`/api/meals?date=${dateStr}`);
      const data = await res.json();
      setMeals(data.meals ?? []);
      setRecentItems(data.recentItems ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMealDates = useCallback(async () => {
    try {
      const res = await fetch("/api/meals/dates");
      const data = await res.json();
      const keys = new Set<string>();
      for (const dateStr of data.dates ?? []) {
        const d = new Date(dateStr + "T00:00:00");
        keys.add(dateKey(d));
      }
      setMealDateKeys(keys);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchMeals(selectedDate);
  }, [selectedDate, fetchMeals]);

  useEffect(() => {
    fetchMealDates();
  }, [fetchMealDates]);

  // --- Image handling ---

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType: mime, previewUrl } = await compressImage(file);
      setImageBase64(base64);
      setImageMimeType(mime);
      setImagePreview(previewUrl);
      setPendingResult(null);
    } catch {
      // ignore
    }
    // Reset file input for re-selection
    e.target.value = "";
  }

  function clearImage() {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    if (pendingResult && !text.trim()) {
      setPendingResult(null);
    }
  }

  async function analyzeImage() {
    if (!imageBase64 || !imageMimeType) return;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/meals/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: imageMimeType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingResult(data.parsed);
      } else {
        setErrorMsg(data.details || data.error || "이미지 분석에 실패했습니다");
      }
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setAnalyzing(false);
    }
  }

  // --- Text analysis ---

  async function analyzeText() {
    if (!text.trim()) return;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          mealType,
          date: toDateString(selectedDate),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setText("");
        fetchMeals(selectedDate);
        fetchMealDates();
      } else {
        setErrorMsg(data.details || data.error || "분석에 실패했습니다");
      }
    } catch (err) {
      console.error("[MealsDashboard] analyzeText error:", err);
      setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setAnalyzing(false);
    }
  }

  // --- Save (for image-analyzed meals) ---

  async function handleSave() {
    if (!pendingResult) return;
    setSubmitting(true);
    try {
      const rawText =
        text.trim() ||
        pendingResult.items.map((i) => i.name).join(", ") + " (사진 분석)";

      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          mealType,
          date: toDateString(selectedDate),
          parsedData: pendingResult,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingResult(null);
        clearImage();
        setText("");
        fetchMeals(selectedDate);
        fetchMealDates();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  // --- Quick add ---

  function handleQuickAdd(item: RecentItem) {
    setText(item.raw_text);
    setMealType(item.meal_type);
  }

  // --- Daily totals ---

  const dailyTotals = useMemo(
    () =>
      meals.reduce(
        (acc, m) => ({
          calories: acc.calories + m.total_calories,
          protein: acc.protein + Number(m.total_protein_g),
          carbs: acc.carbs + Number(m.total_carbs_g),
          fat: acc.fat + Number(m.total_fat_g),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [meals]
  );

  // Is pending result from image (needs explicit save) vs text (already saved)?
  const needsSave = pendingResult && imagePreview;

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <h2 className="text-lg font-bold">식단 기록</h2>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI 분석
        </div>
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
            const hasData = mealDateKeys.has(dateKey(date));

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

      {/* Main Content */}
      <main className="flex-1 space-y-5 p-4 pb-28">
        {/* Meal Type Pills */}
        <div className="flex gap-2">
          {mealTypes.map((mt) => (
            <button
              key={mt.value}
              onClick={() => setMealType(mt.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                mealType === mt.value
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {mt.label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div>
          <h2 className="mb-3 text-xl font-bold">무엇을 드셨나요?</h2>
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="식단을 입력하세요 (예: 닭가슴살 200g, 현미밥 한 공기)"
              className="w-full resize-none rounded-xl border border-border bg-card p-4 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              rows={3}
              disabled={analyzing || submitting}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-3 right-3 rounded-full bg-primary/20 p-2.5 text-primary transition-colors hover:bg-primary/30"
              title="사진으로 분석"
            >
              <Camera className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative overflow-hidden rounded-xl border border-border">
            <img
              src={imagePreview}
              alt="식단 사진"
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: "200px" }}
            />
            <button
              onClick={clearImage}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
            {!pendingResult && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
                <button
                  onClick={analyzeImage}
                  disabled={analyzing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI 분석하기
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Text Analyze Button */}
        {text.trim() && !imagePreview && !pendingResult && (
          <button
            onClick={analyzeText}
            disabled={analyzing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI 분석 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI 분석
              </>
            )}
          </button>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-concern/20 bg-concern/10 px-4 py-3 text-sm text-concern">
            <span className="flex-1">{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="rounded-full p-1 hover:bg-concern/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* AI Analysis Result */}
        {pendingResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Sparkles className="h-4 w-4 text-primary" />
                AI 분석
              </h3>
              {!needsSave && (
                <span className="flex items-center gap-1 rounded-full bg-positive/10 px-2 py-0.5 text-xs font-medium text-positive">
                  <Check className="h-3 w-3" />
                  저장됨
                </span>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-card p-4">
              {/* Food Items */}
              {pendingResult.items.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between py-2",
                    i < pendingResult.items.length - 1 &&
                      "border-b border-border/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UtensilsCrossed className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.amount}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold">
                    {item.calories} kcal
                  </span>
                </div>
              ))}

              {/* Totals Grid */}
              <div className="grid grid-cols-4 gap-2 border-t border-border/50 pt-3">
                <NutrientCard
                  icon={Flame}
                  label="칼로리"
                  value={pendingResult.totalCalories}
                  color="text-warning"
                  bgColor="bg-warning/10"
                />
                <NutrientCard
                  icon={Beef}
                  label="단백질"
                  value={pendingResult.totalProteinG}
                  unit="g"
                  color="text-primary"
                  bgColor="bg-primary/10"
                />
                <NutrientCard
                  icon={Wheat}
                  label="탄수화물"
                  value={pendingResult.totalCarbsG}
                  unit="g"
                  color="text-positive"
                  bgColor="bg-positive/10"
                />
                <NutrientCard
                  icon={Droplets}
                  label="지방"
                  value={pendingResult.totalFatG}
                  unit="g"
                  color="text-concern"
                  bgColor="bg-concern/10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Add */}
        {recentItems.length > 0 && !pendingResult && (
          <div>
            <h3 className="mb-2 text-sm font-bold">빠른 추가</h3>
            <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
              {recentItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickAdd(item)}
                  className="group flex w-36 flex-shrink-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/20 group-hover:text-primary">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <p className="truncate text-sm font-bold">{item.raw_text}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.total_calories} kcal
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing Meal Records */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-secondary/50"
              />
            ))}
          </div>
        ) : meals.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 기록
              </h3>
              <span className="text-xs text-muted-foreground">
                총 {dailyTotals.calories} kcal
              </span>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-card p-2 text-center border border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  칼로리
                </p>
                <p className="text-sm font-bold">{dailyTotals.calories}</p>
              </div>
              <div className="rounded-lg bg-card p-2 text-center border border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  단백질
                </p>
                <p className="text-sm font-bold text-primary">
                  {dailyTotals.protein.toFixed(0)}g
                </p>
              </div>
              <div className="rounded-lg bg-card p-2 text-center border border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  탄수화물
                </p>
                <p className="text-sm font-bold">
                  {dailyTotals.carbs.toFixed(0)}g
                </p>
              </div>
              <div className="rounded-lg bg-card p-2 text-center border border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  지방
                </p>
                <p className="text-sm font-bold">
                  {dailyTotals.fat.toFixed(0)}g
                </p>
              </div>
            </div>

            {/* Meal Cards */}
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        ) : (
          !pendingResult && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
              <UtensilsCrossed className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                이 날의 식단 기록이 없습니다
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                위에서 식단을 입력하거나 사진을 찍어보세요
              </p>
            </div>
          )
        )}
      </main>

      {/* Fixed Bottom Button (for image-analyzed meals that need saving) */}
      {needsSave && (
        <div className="fixed bottom-16 left-0 right-0 z-40 mx-auto max-w-lg px-4 pb-3">
          <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent" />
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                기록 완료
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Sub Components ---

function NutrientCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  bgColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  unit?: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="text-center">
      <div
        className={cn(
          "mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full",
          bgColor
        )}
      >
        <Icon className={cn("h-3 w-3", color)} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("text-base font-bold", color)}>
        {typeof value === "number" ? value.toFixed(0) : value}
        {unit && (
          <span className="text-xs font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

function MealCard({ meal }: { meal: MealLog }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
          {mealTypeLabels[meal.meal_type] ?? meal.meal_type}
        </span>
        <span className="text-xs font-bold text-muted-foreground">
          {meal.total_calories} kcal
        </span>
      </div>
      <p className="text-sm">{meal.raw_text}</p>
      <div className="mt-1.5 text-xs text-muted-foreground">
        단 {Number(meal.total_protein_g).toFixed(0)}g · 탄{" "}
        {Number(meal.total_carbs_g).toFixed(0)}g · 지{" "}
        {Number(meal.total_fat_g).toFixed(0)}g
      </div>
    </div>
  );
}
