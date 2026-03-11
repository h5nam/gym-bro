import { isNativePlatform } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";

/**
 * 네이티브 앱에서는 Bearer 토큰을 포함하여 fetch.
 * 웹에서는 기존 동작 유지 (쿠키 자동 전송).
 */
export async function fetchWithAuth(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (typeof window !== "undefined" && isNativePlatform()) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  }

  return fetch(url, { ...init, headers });
}
