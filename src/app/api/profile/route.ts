import { getApiClient } from "@/lib/supabase/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const ProfileUpdateSchema = z.object({
  displayName: z.string().min(1).max(50),
  heightCm: z.number().min(100).max(250).nullable().optional(),
  birthYear: z.number().min(1940).max(new Date().getFullYear()).nullable().optional(),
  trainingGoal: z.enum(["bulk", "cut", "maintain", "recomp", "health"]).nullable().optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "display_name, height_cm, birth_year, training_goal, experience_level"
      )
      .eq("id", user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({
      profile: {
        email: user.email,
        ...profile,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const { displayName, heightCm, birthYear, trainingGoal, experienceLevel } = parsed.data;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        height_cm: heightCm ?? null,
        birth_year: birthYear ?? null,
        training_goal: trainingGoal ?? null,
        experience_level: experienceLevel ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "저장 실패" },
      { status: 500 }
    );
  }
}
