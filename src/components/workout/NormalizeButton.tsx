"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  rawSessionId: string;
}

export default function NormalizeButton({ rawSessionId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleNormalize() {
    setLoading(true);

    try {
      const res = await fetch("/api/ai/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawSessionId }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/workouts/${data.sessionId}`);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
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
      정규화
    </button>
  );
}
