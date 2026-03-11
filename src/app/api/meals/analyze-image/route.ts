import { getApiClient } from "@/lib/supabase/api-auth";
import { generateStructuredWithImage } from "@/lib/ai/gemini";
import { MealParseResultSchema } from "@/lib/ai/schemas";
import { buildMealImageParsePrompt } from "@/lib/ai/prompts/meal-image-parse";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = await getApiClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const { imageBase64, mimeType } = await request.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "이미지가 필요합니다" },
        { status: 400 }
      );
    }

    // Validate image size (max ~5MB base64)
    if (imageBase64.length > 7_000_000) {
      return NextResponse.json(
        { error: "이미지가 너무 큽니다 (최대 5MB)" },
        { status: 400 }
      );
    }

    // Validate MIME type
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "지원하지 않는 이미지 형식입니다" },
        { status: 400 }
      );
    }

    const prompt = buildMealImageParsePrompt();
    const parsed = await generateStructuredWithImage(
      prompt,
      imageBase64,
      mimeType,
      MealParseResultSchema
    );

    return NextResponse.json({ success: true, parsed });
  } catch (error) {
    console.error("Meal image analysis error:", error);
    return NextResponse.json(
      { error: "이미지 분석 실패" },
      { status: 500 }
    );
  }
}
