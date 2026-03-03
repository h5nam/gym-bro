import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return _ai;
}

export async function generateStructured<T>(
  prompt: string,
  schema: { parse: (data: unknown) => T },
  options?: { model?: string; systemPrompt?: string }
): Promise<T> {
  const model = options?.model ?? "gemini-3-flash-preview";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = z.toJSONSchema(schema as any);
  console.log("[Gemini] JSON Schema:", JSON.stringify(jsonSchema).slice(0, 500));

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (options?.systemPrompt) {
    contents.push({
      role: "user",
      parts: [{ text: `[System]: ${options.systemPrompt}\n\n${prompt}` }],
    });
  } else {
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });
  }

  const response = await getAI().models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: jsonSchema as Record<string, unknown>,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response");

  const parsed = JSON.parse(text);
  console.log("[Gemini] Response keys:", Object.keys(parsed));
  console.log("[Gemini] Response preview:", JSON.stringify(parsed).slice(0, 500));

  return schema.parse(parsed);
}

export async function generateStructuredWithImage<T>(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  schema: { parse: (data: unknown) => T },
  options?: { model?: string; systemPrompt?: string }
): Promise<T> {
  const model = options?.model ?? "gemini-3-flash-preview";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = z.toJSONSchema(schema as any);

  const textPart = options?.systemPrompt
    ? `[System]: ${options.systemPrompt}\n\n${prompt}`
    : prompt;

  const contents = [
    {
      role: "user" as const,
      parts: [
        { text: textPart },
        { inlineData: { data: imageBase64, mimeType } },
      ],
    },
  ];

  const response = await getAI().models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: jsonSchema as Record<string, unknown>,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response");

  const parsed = JSON.parse(text);
  return schema.parse(parsed);
}

export async function generateText(
  prompt: string,
  options?: { model?: string; systemPrompt?: string }
): Promise<string> {
  const model = options?.model ?? "gemini-3-flash-preview";

  const fullPrompt = options?.systemPrompt
    ? `[System]: ${options.systemPrompt}\n\n${prompt}`
    : prompt;

  const response = await getAI().models.generateContent({
    model,
    contents: fullPrompt,
  });

  return response.text ?? "";
}
