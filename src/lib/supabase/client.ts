import { createBrowserClient } from "@supabase/ssr";

/**
 * 클라이언트 사이드 Supabase 클라이언트.
 * Live URL 모드에서는 WebView도 쿠키 기반으로 동작하므로
 * 웹/네이티브 모두 createBrowserClient 사용.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
