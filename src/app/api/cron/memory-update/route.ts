import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndSaveMemory } from "@/lib/ai/memory";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id") as { data: { id: string }[] | null };

  let succeeded = 0;
  let failed = 0;
  for (const profile of profiles ?? []) {
    const result = await generateAndSaveMemory(supabase, profile.id);
    if (result.success) succeeded++;
    else failed++;
    console.log(
      `[MemoryCron] ${profile.id.slice(0, 8)}…: ${result.success ? "OK" : result.error}`
    );
  }

  console.log(
    `[MemoryCron] Completed: ${succeeded} succeeded, ${failed} failed`
  );

  return NextResponse.json({
    success: true,
    total: (profiles ?? []).length,
    succeeded,
    failed,
  });
}
