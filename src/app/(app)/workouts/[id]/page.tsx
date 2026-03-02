import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import WorkoutSetList from "@/components/workout/WorkoutSetList";
import CorrectionChat from "@/components/workout/CorrectionChat";
import ConfirmButton from "@/components/workout/ConfirmButton";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) notFound();

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("session_id", id)
    .order("set_order", { ascending: true });

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/workouts"
          className="rounded-md p-1 hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{session.session_name}</h1>
          <p className="text-xs text-muted-foreground">
            {formatDate(session.started_at)}
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

      {/* Summary */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">총 볼륨</p>
          <p className="text-lg font-bold">
            {Number(session.total_volume_kg).toLocaleString()}kg
          </p>
        </div>
        <div className="flex-1 rounded-lg border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">세트 수</p>
          <p className="text-lg font-bold">{session.total_sets}</p>
        </div>
        <div className="flex-1 rounded-lg border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">근육군</p>
          <p className="text-sm font-medium">
            {(session.muscle_groups as string[])?.join(", ")}
          </p>
        </div>
      </div>

      {/* Sets */}
      <WorkoutSetList sets={sets ?? []} />

      {/* Correction Chat */}
      {session.status === "draft" && (
        <CorrectionChat sessionId={id} />
      )}

      {/* Confirm Button */}
      {session.status === "draft" && (
        <ConfirmButton sessionId={id} />
      )}
    </div>
  );
}
