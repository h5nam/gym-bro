import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";

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
  const model = options?.model ?? "gemini-2.5-flash";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = zodToJsonSchema(schema as any);

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

  return schema.parse(JSON.parse(text));
}

export async function generateText(
  prompt: string,
  options?: { model?: string; systemPrompt?: string }
): Promise<string> {
  const model = options?.model ?? "gemini-2.5-flash";

  const fullPrompt = options?.systemPrompt
    ? `[System]: ${options.systemPrompt}\n\n${prompt}`
    : prompt;

  const response = await getAI().models.generateContent({
    model,
    contents: fullPrompt,
  });

  return response.text ?? "";
}
