"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { queryKeys } from "@/lib/queries";
import { isNativePlatform } from "@/lib/platform";
import { fetchWithAuth } from "@/lib/fetch";

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
  const queryClient = useQueryClient();

  const isMobile = useCallback(() => {
    if (isNativePlatform()) return true;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (isMobile()) return; // 모바일: Enter는 기본 줄바꿈, 버튼으로만 제출
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setHistory((h) => [...h, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const res = await fetchWithAuth(`/api/workouts/${sessionId}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data: CorrectionResponse = await res.json();

      if (data.success) {
        setHistory((h) => [...h, { role: "ai", text: data.summary }]);
        await queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all });
        await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        router.refresh();
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
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder="예: 체스트 프레스 말고 인클라인 머신 프레스였어"
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
