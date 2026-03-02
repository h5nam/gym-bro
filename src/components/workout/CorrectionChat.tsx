"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";

interface Props {
  sessionId: string;
}

interface CorrectionResponse {
  success: boolean;
  summary: string;
  corrections: Array<{
    setIndex: number;
    field: string;
    oldValue: string | number;
    newValue: string | number;
    reason: string;
  }>;
}

export default function CorrectionChat({ sessionId }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    Array<{ role: "user" | "ai"; text: string }>
  >([]);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage("");
    setHistory((h) => [...h, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/workouts/${sessionId}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data: CorrectionResponse = await res.json();

      if (data.success) {
        setHistory((h) => [...h, { role: "ai", text: data.summary }]);
        router.refresh(); // Refresh server component data
      } else {
        setHistory((h) => [
          ...h,
          { role: "ai", text: "보정에 실패했습니다. 다시 시도해주세요." },
        ]);
      }
    } catch {
      setHistory((h) => [
        ...h,
        { role: "ai", text: "오류가 발생했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        자연어 보정
      </h2>

      {/* Chat History */}
      {history.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {history.map((msg, i) => (
            <div
              key={i}
              className={`text-sm ${
                msg.role === "user"
                  ? "text-foreground"
                  : "text-primary"
              }`}
            >
              <span className="font-medium">
                {msg.role === "user" ? "나: " : "AI: "}
              </span>
              {msg.text}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="예: 체스트 프레스 말고 인클라인 머신 프레스였어"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      <p className="text-xs text-muted-foreground">
        운동 종목, 중량, 반복 횟수를 자연어로 수정할 수 있습니다
      </p>
    </div>
  );
}
