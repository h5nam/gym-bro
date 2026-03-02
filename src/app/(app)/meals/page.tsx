import MealInput from "@/components/meal/MealInput";
import MealList from "@/components/meal/MealList";

export default function MealsPage() {
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-bold">식단 기록</h1>
      <MealInput />
      <MealList />
    </div>
  );
}
