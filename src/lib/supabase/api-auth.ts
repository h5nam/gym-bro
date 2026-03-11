import { createClient as createCookieClient } from "./server";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

/**
 * API 라우트용 통합 인증 클라이언트.
 * 1) Authorization: Bearer <token> 헤더가 있으면 토큰 기반 (네이티브 앱)
 * 2) 없으면 기존 쿠키 기반 (웹)
 */
export async function getApiClient(request?: NextRequest) {
  const authHeader = request?.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = createJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );
    return supabase;
  }

  // 기존 쿠키 기반 (웹 브라우저)
  return createCookieClient();
}
