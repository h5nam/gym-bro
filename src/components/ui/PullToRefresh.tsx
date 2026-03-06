"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({
  onRefresh,
  children,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const isAtTop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return false;
    // Check if the scrollable container (or window) is at top
    let node: HTMLElement | null = el;
    while (node) {
      if (node.scrollTop > 0) return false;
      node = node.parentElement;
    }
    return true;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      if (isAtTop()) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    },
    [refreshing, isAtTop]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const deltaY = e.touches[0].clientY - startY.current;
      if (deltaY > 0 && isAtTop()) {
        const distance = Math.min(deltaY * 0.5, MAX_PULL);
        setPullDistance(distance);
      } else {
        setPullDistance(0);
      }
    },
    [refreshing, isAtTop]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{
          height: pullDistance > 0 || refreshing ? `${pullDistance}px` : "0px",
          transition: pulling.current ? "none" : undefined,
        }}
      >
        {refreshing ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <div
            className="flex flex-col items-center gap-1 text-muted-foreground"
            style={{ opacity: progress }}
          >
            <svg
              className="h-6 w-6 transition-transform"
              style={{
                transform: `rotate(${progress * 180}deg)`,
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            {progress >= 1 && (
              <span className="text-xs font-medium">놓으면 새로고침</span>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
