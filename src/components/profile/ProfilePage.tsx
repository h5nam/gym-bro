"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Ruler,
  Cake,
  Target,
  Trophy,
  LogOut,
  Loader2,
  Check,
  ChevronRight,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@supabase/ssr";
import { fetchWithAuth } from "@/lib/fetch";

// --- Types ---

export interface ProfileData {
  email: string;
  displayName: string;
  heightCm: number | null;
  birthYear: number | null;
  trainingGoal: string | null;
  experienceLevel: string | null;
}

const GOAL_OPTIONS = [
  { value: "muscle_gain", label: "근육 증가" },
  { value: "fat_loss", label: "체지방 감량" },
  { value: "strength", label: "근력 향상" },
  { value: "endurance", label: "지구력 향상" },
  { value: "maintenance", label: "현재 유지" },
  { value: "general_health", label: "건강 관리" },
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "초급", desc: "운동 경력 1년 미만" },
  { value: "intermediate", label: "중급", desc: "운동 경력 1~3년" },
  { value: "advanced", label: "고급", desc: "운동 경력 3년 이상" },
];

// --- Main Component ---

export default function ProfilePage({
  initialProfile,
}: {
  initialProfile: ProfileData;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const hasChanges =
    profile.displayName !== initialProfile.displayName ||
    profile.heightCm !== initialProfile.heightCm ||
    profile.birthYear !== initialProfile.birthYear ||
    profile.trainingGoal !== initialProfile.trainingGoal ||
    profile.experienceLevel !== initialProfile.experienceLevel;

  async function handleSave() {
    if (!hasChanges || saving) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetchWithAuth("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.displayName,
          heightCm: profile.heightCm,
          birthYear: profile.birthYear,
          trainingGoal: profile.trainingGoal,
          experienceLevel: profile.experienceLevel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const age = profile.birthYear ? currentYear - profile.birthYear : null;

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 pt-6">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">프로필 설정</h1>
      </header>

      <main className="flex-1 space-y-5 px-4 pb-8">
        {/* Avatar & Name Section */}
        <section className="flex flex-col items-center gap-3 py-4">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background bg-positive" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{profile.displayName}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
        </section>

        {/* Basic Info Card */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            기본 정보
          </h3>
          <div className="space-y-px overflow-hidden rounded-2xl border border-border bg-card">
            {/* Display Name */}
            <div className="flex items-center gap-3 bg-card p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  닉네임
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, displayName: e.target.value }))
                  }
                  className="w-full border-none bg-transparent text-sm font-medium text-foreground focus:outline-none focus:ring-0"
                  placeholder="닉네임을 입력하세요"
                />
              </div>
            </div>

            <div className="ml-16 border-t border-border" />

            {/* Email (read-only) */}
            <div className="flex items-center gap-3 bg-card p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Mail className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  이메일
                </label>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            <div className="ml-16 border-t border-border" />

            {/* Height */}
            <div className="flex items-center gap-3 bg-card p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Ruler className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  키
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={profile.heightCm ?? ""}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        heightCm: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="w-20 border-none bg-transparent text-sm font-medium text-foreground focus:outline-none focus:ring-0"
                    placeholder="175"
                    min={100}
                    max={250}
                    step={0.1}
                  />
                  <span className="text-xs text-muted-foreground">cm</span>
                </div>
              </div>
            </div>

            <div className="ml-16 border-t border-border" />

            {/* Birth Year */}
            <div className="flex items-center gap-3 bg-card p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cake className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  출생연도
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={profile.birthYear ?? ""}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        birthYear: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    className="w-20 border-none bg-transparent text-sm font-medium text-foreground focus:outline-none focus:ring-0"
                    placeholder="1995"
                    min={1940}
                    max={currentYear}
                  />
                  {age !== null && (
                    <span className="text-xs text-muted-foreground">
                      만 {age}세
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Training Goal */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            운동 목표
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {GOAL_OPTIONS.map((goal) => (
              <button
                key={goal.value}
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    trainingGoal:
                      p.trainingGoal === goal.value ? null : goal.value,
                  }))
                }
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
                  profile.trainingGoal === goal.value
                    ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                    : "border-border bg-card hover:bg-secondary/50"
                )}
              >
                <Target
                  className={cn(
                    "h-4 w-4 shrink-0",
                    profile.trainingGoal === goal.value
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    profile.trainingGoal === goal.value
                      ? "text-primary"
                      : "text-foreground"
                  )}
                >
                  {goal.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Experience Level */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            운동 경력
          </h3>
          <div className="space-y-2">
            {EXPERIENCE_OPTIONS.map((exp) => (
              <button
                key={exp.value}
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    experienceLevel:
                      p.experienceLevel === exp.value ? null : exp.value,
                  }))
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all",
                  profile.experienceLevel === exp.value
                    ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                    : "border-border bg-card hover:bg-secondary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      profile.experienceLevel === exp.value
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-bold",
                        profile.experienceLevel === exp.value && "text-primary"
                      )}
                    >
                      {exp.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{exp.desc}</p>
                  </div>
                </div>
                {profile.experienceLevel === exp.value && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Save Button */}
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving || !profile.displayName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : saved ? (
              <Check className="h-5 w-5" />
            ) : null}
            {saving ? "저장 중..." : saved ? "저장 완료!" : "변경사항 저장"}
          </button>
        )}

        {/* Logout */}
        <section className="pt-4">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition-all hover:bg-secondary/50 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-red-500">로그아웃</span>
            </div>
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </section>

        {/* Bottom spacer */}
        <div className="h-4" />
      </main>
    </div>
  );
}
