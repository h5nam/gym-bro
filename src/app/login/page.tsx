"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Mail, Lock, Eye, EyeOff, Shield, Zap, Award } from "lucide-react";
import { isNativePlatform } from "@/lib/platform";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  // 네이티브 앱: 딥링크 콜백으로 OAuth 세션 처리
  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { App } = await import("@capacitor/app");
      const listener = await App.addListener("appUrlOpen", async ({ url }) => {
        // gymbro://auth/callback#access_token=...&refresh_token=...
        const hashParams = new URLSearchParams(url.split("#")[1] || "");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const supabase = createClient();
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          router.push("/dashboard");
        }
      });
      cleanup = () => listener.remove();
    })();

    return () => cleanup?.();
  }, [router]);

  async function handleGoogleLogin() {
    const supabase = createClient();

    if (isNativePlatform()) {
      // 네이티브: 인앱 브라우저로 OAuth → 딥링크 콜백
      const { data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "gymbro://auth/callback",
          skipBrowserRedirect: true,
        },
      });
      if (data.url) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url });
      }
      return;
    }

    // 웹: 기존 동작
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      {/* Background Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-primary/15 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-2">
        {/* Glass Card */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/20 backdrop-blur-sm">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-2 text-3xl font-bold leading-tight text-foreground">
              오직 hona.mind을 위한
              <br />
              운동 코치 앱
            </h1>
            <p className="text-sm font-medium tracking-widest text-primary/70 uppercase">
              by hona.mind
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 ml-1 block text-sm font-medium text-muted-foreground"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-primary/15 bg-white/[0.03] py-4 pl-12 pr-4 text-foreground outline-none backdrop-blur-sm transition-all placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/50"
                  placeholder="example@email.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 ml-1 block text-sm font-medium text-muted-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-primary/15 bg-white/[0.03] py-4 pl-12 pr-12 text-foreground outline-none backdrop-blur-sm transition-all placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-4 font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "로그인 중..." : "SIGN IN"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-10 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted" />
            </div>
            <span className="relative bg-transparent px-4 text-xs text-muted-foreground uppercase">
              Or continue with
            </span>
          </div>

          {/* Google Login */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="group flex items-center justify-center gap-3 rounded-full border border-primary/15 bg-white/[0.03] px-8 py-3 backdrop-blur-sm transition-colors hover:bg-white/[0.06]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                Google Login
              </span>
            </button>
          </div>
        </div>

        {/* Decorative Footer */}
        <div className="mt-8 flex justify-center gap-8 text-[10px] tracking-tight text-muted-foreground/60 uppercase">
          <span className="flex items-center gap-1">
            <Award className="h-3 w-3" /> Premium Quality
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" /> High-Tech Coach
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" /> Secure Access
          </span>
        </div>
      </div>
    </div>
  );
}
