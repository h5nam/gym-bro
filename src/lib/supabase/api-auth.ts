import { createClient as createCookieClient } from "./server";
import { createClient as createJsClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

interface ApiClientResult {
  supabase: SupabaseClient;
  user: User | null;
}

/**
 * API 라우트용 통합 인증 클라이언트 + 유저 정보.
 * 미들웨어가 이미 getUser()로 인증을 검증하므로,
 * API에서는 getSession() (JWT 디코드, 네트워크 왕복 없음)으로 유저를 가져옴.
 *
 * 1) Authorization: Bearer <token> 헤더 → 토큰 기반 (네이티브 앱)
 * 2) 없으면 쿠키 기반 (웹) + getSession()
 */
export async function getApiClient(request?: NextRequest): Promise<ApiClientResult> {
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
    // Bearer 토큰은 미들웨어 검증을 거치지 않으므로 getUser() 사용
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, user };
  }

  // 쿠키 기반 (웹) — 미들웨어가 이미 인증 검증 완료
  // getSession()은 JWT 디코드만 하므로 네트워크 왕복 없음
  const supabase = await createCookieClient();
  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, user: session?.user ?? null };
}
