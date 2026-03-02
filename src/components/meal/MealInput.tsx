"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";

const mealTypes = [
  { value: "breakfast", label: "아침" },
  { value: "lunch", label: "점심" },
  { value: "dinner", label: "저녁" },
  { value: "snack", label: "간식" },
] as const;

export default function MealInput() {
  const [text, setText] = useState("");
  const [mealType, setMealType] = useState<string>("lunch");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), mealType }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(
          `${data.meal.total_calories}kcal | 단 ${data.meal.total_protein_g}g | 탄 ${data.meal.total_carbs_g}g | 지 ${data.meal.total_fat_g}g`
        );
        setText("");
        router.refresh();
      } else {
        setResult("파싱에 실패했습니다.");
      }
    } catch {
      setResult("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Meal Type Selector */}
      <div className="flex gap-2">
        {mealTypes.map((mt) => (
          <button
            key={mt.value}
            onClick={() => setMealType(mt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mealType === mt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {mt.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예: 삼겹살 200g, 공기밥 1, 된장찌개"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      {/* Result */}
      {result && (
        <p className="rounded-md bg-secondary/50 px-3 py-2 text-sm text-primary">
          {result}
        </p>
      )}
    </div>
  );
}
