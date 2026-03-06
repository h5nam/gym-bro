"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/queries";

interface Props {
  sessionId: string;
}

export default function ConfirmButton({ sessionId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleConfirm() {
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("workout_sessions")
        .update({
          status: "confirmed",
          user_confirmed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Trigger AI analysis
      await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.reports.dates() });
      router.refresh();
    } catch (error) {
      console.error("Confirm error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-positive py-3 text-sm font-medium text-white hover:bg-positive/90 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      {loading ? "확정 처리 중..." : "운동 기록 확정"}
    </button>
  );
}
