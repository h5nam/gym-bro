import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Implement cron-based sync
  // This will iterate over all users with Garmin data sources
  // and trigger sync for each. For now it's a single-user app.

  return NextResponse.json({
    success: true,
    message: "Daily sync triggered",
  });
}
