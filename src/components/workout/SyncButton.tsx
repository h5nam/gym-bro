"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2 } from "lucide-react";
import { queryKeys } from "@/lib/queries";

interface SyncButtonProps {
  variant?: "compact" | "full";
}

export default function SyncButton({ variant = "compact" }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function handleSync() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/sync/garmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSync: true }),
      });
      const data = await res.json();

      if (data.success) {
        setResult(`${data.synced}건 동기화 완료`);
        await queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
        await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      } else {
        setResult(`실패: ${data.error}`);
      }
    } catch {
      setResult("동기화 오류");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "full") {
    return (
      <div className="w-full space-y-2">
        <button
          onClick={handleSync}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-4 font-bold text-foreground transition-all hover:bg-secondary/80 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
          Garmin 기기와 동기화
        </button>
        {result && (
          <p className="text-center text-sm text-muted-foreground">{result}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        동기화
      </button>
    </div>
  );
}
