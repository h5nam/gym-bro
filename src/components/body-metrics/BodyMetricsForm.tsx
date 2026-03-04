"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, X } from "lucide-react";
import { queryKeys } from "@/lib/queries";

export default function BodyMetricsForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    measuredAt: new Date().toISOString().split("T")[0],
    weightKg: "",
    bodyFatPct: "",
    skeletalMuscleMassKg: "",
    muscleMassKg: "",
    bmi: "",
    notes: "",
  });
  const queryClient = useQueryClient();

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
          measuredAt: form.measuredAt || null,
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
          measuredAt: new Date().toISOString().split("T")[0],
          weightKg: "",
          bodyFatPct: "",
          skeletalMuscleMassKg: "",
          muscleMassKg: "",
          bmi: "",
          notes: "",
        });
        onClose();
        queryClient.invalidateQueries({ queryKey: queryKeys.bodyMetrics.all });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative mb-[calc(env(safe-area-inset-bottom)+76px)] w-full max-w-lg animate-in slide-in-from-bottom rounded-2xl border border-border bg-card p-5 mx-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">체성분 입력</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              측정 날짜
            </label>
            <input
              type="date"
              value={form.measuredAt}
              onChange={(e) => handleChange("measuredAt", e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

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
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
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
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="측정 조건, 컨디션 등"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !form.weightKg}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
      </div>
    </div>
  );
}
