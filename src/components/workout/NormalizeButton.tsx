"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  rawSessionId: string;
}

export default function NormalizeButton({ rawSessionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleNormalize() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawSessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "정규화에 실패했습니다");
        return;
      }

      if (data.success) {
        router.push(`/workouts/${data.sessionId}`);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleNormalize}
        disabled={loading}
        className="flex items-center gap-1 rounded-md bg-warning/20 px-2 py-1 text-xs font-medium text-warning hover:bg-warning/30 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        {loading ? "정규화 중…" : "정규화"}
      </button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
