"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";

export default function BodyMetricsForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    weightKg: "",
    bodyFatPct: "",
    skeletalMuscleMassKg: "",
    muscleMassKg: "",
    bmi: "",
    notes: "",
  });
  const router = useRouter();

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.weightKg) return;

    setLoading(true);

    try {
      const res = await fetch("/api/body-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: form.weightKg ? Number(form.weightKg) : null,
          bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : null,
          skeletalMuscleMassKg: form.skeletalMuscleMassKg
            ? Number(form.skeletalMuscleMassKg)
            : null,
          muscleMassKg: form.muscleMassKg ? Number(form.muscleMassKg) : null,
          bmi: form.bmi ? Number(form.bmi) : null,
          notes: form.notes || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setForm({
          weightKg: "",
          bodyFatPct: "",
          skeletalMuscleMassKg: "",
          muscleMassKg: "",
          bmi: "",
          notes: "",
        });
        setOpen(false);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"
      >
        + 체성분 수치 기록하기
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium">체성분 입력</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            체중 (kg) *
          </label>
          <input
            type="number"
            step="0.1"
            value={form.weightKg}
            onChange={(e) => handleChange("weightKg", e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="75.0"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            체지방률 (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={form.bodyFatPct}
            onChange={(e) => handleChange("bodyFatPct", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="15.0"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            골격근량 (kg)
          </label>
          <input
            type="number"
            step="0.1"
            value={form.skeletalMuscleMassKg}
            onChange={(e) =>
              handleChange("skeletalMuscleMassKg", e.target.value)
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="35.0"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            BMI
          </label>
          <input
            type="number"
            step="0.1"
            value={form.bmi}
            onChange={(e) => handleChange("bmi", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="23.5"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          메모
        </label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="측정 조건, 컨디션 등"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-md border border-border py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading || !form.weightKg}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          저장
        </button>
      </div>
    </form>
  );
}
