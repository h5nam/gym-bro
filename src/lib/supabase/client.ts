import { createBrowserClient } from "@supabase/ssr";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { isNativePlatform } from "@/lib/platform";

/**
 * 클라이언트 사이드 Supabase 클라이언트.
 * - 웹: createBrowserClient (쿠키 기반, SSR 호환)
 * - 네이티브: createClient (토큰 기반, localStorage)
 */
export function createClient() {
  if (typeof window !== "undefined" && isNativePlatform()) {
    return createJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
