"use client";

import { useEffect, useState } from "react";
import { UtensilsCrossed } from "lucide-react";

interface MealLog {
  id: string;
  meal_type: string;
  raw_text: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  parsed_items: Array<{
    name: string;
    calories: number;
    proteinG: number;
  }>;
}

const mealTypeLabels: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export default function MealList() {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMeals() {
      try {
        const res = await fetch("/api/meals");
        const data = await res.json();
        setMeals(data.meals ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchMeals();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-secondary/50"
          />
        ))}
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <UtensilsCrossed className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          오늘 식단을 기록해보세요
        </p>
      </div>
    );
  }

  // Calculate daily totals
  const dailyTotals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.total_calories,
      protein: acc.protein + Number(m.total_protein_g),
      carbs: acc.carbs + Number(m.total_carbs_g),
      fat: acc.fat + Number(m.total_fat_g),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Daily Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-secondary/50 p-2 text-center">
          <p className="text-xs text-muted-foreground">칼로리</p>
          <p className="text-sm font-bold">{dailyTotals.calories}</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-2 text-center">
          <p className="text-xs text-muted-foreground">단백질</p>
          <p className="text-sm font-bold">{dailyTotals.protein.toFixed(0)}g</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-2 text-center">
          <p className="text-xs text-muted-foreground">탄수화물</p>
          <p className="text-sm font-bold">{dailyTotals.carbs.toFixed(0)}g</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-2 text-center">
          <p className="text-xs text-muted-foreground">지방</p>
          <p className="text-sm font-bold">{dailyTotals.fat.toFixed(0)}g</p>
        </div>
      </div>

      {/* Meal Cards */}
      <h2 className="text-sm font-medium text-muted-foreground">오늘의 식사</h2>
      {meals.map((meal) => (
        <div key={meal.id} className="rounded-lg border border-border p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
              {mealTypeLabels[meal.meal_type] ?? meal.meal_type}
            </span>
            <span className="text-xs text-muted-foreground">
              {meal.total_calories}kcal
            </span>
          </div>
          <p className="text-sm">{meal.raw_text}</p>
          <div className="mt-1 text-xs text-muted-foreground">
            단 {Number(meal.total_protein_g).toFixed(0)}g · 탄{" "}
            {Number(meal.total_carbs_g).toFixed(0)}g · 지{" "}
            {Number(meal.total_fat_g).toFixed(0)}g
          </div>
        </div>
      ))}
    </div>
  );
}
