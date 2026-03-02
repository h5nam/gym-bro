import { createClient } from "@/lib/supabase/server";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import SyncButton from "@/components/workout/SyncButton";
import NormalizeButton from "@/components/workout/NormalizeButton";

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("started_at", { ascending: false })
    .limit(20);

  // Also get unprocessed raw sessions
  const { data: rawSessions } = await supabase
    .from("workout_sessions_raw")
    .select("id, activity_type, started_at, processed")
    .eq("user_id", user?.id ?? "")
    .eq("processed", false)
    .order("started_at", { ascending: false });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">운동 기록</h1>
        <SyncButton />
      </div>

      {/* Unprocessed Raw Sessions */}
      {rawSessions && rawSessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-warning">
            정규화 대기 ({rawSessions.length}건)
          </h2>
          {rawSessions.map((raw) => (
            <div
              key={raw.id}
              className="rounded-lg border border-warning/30 bg-warning/5 p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{raw.activity_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {raw.started_at
                      ? formatDate(raw.started_at)
                      : "날짜 없음"}
                  </p>
                </div>
                <NormalizeButton rawSessionId={raw.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Processed Sessions */}
      {sessions && sessions.length > 0 ? (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/workouts/${session.id}`}
              className="block rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {session.session_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(session.started_at)} ·{" "}
                    {Number(session.total_volume_kg).toLocaleString()}kg ·{" "}
                    {session.total_sets}세트
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    session.status === "confirmed"
                      ? "bg-positive/20 text-positive"
                      : "bg-warning/20 text-warning"
                  }`}
                >
                  {session.status === "confirmed" ? "확정" : "초안"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !rawSessions?.length && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
            <Dumbbell className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              운동 기록이 없습니다
            </p>
            <p className="text-xs text-muted-foreground">
              Garmin에서 동기화하거나 직접 입력하세요
            </p>
          </div>
        )
      )}
    </div>
  );
}

