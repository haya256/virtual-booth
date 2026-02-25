import { NextRequest } from "next/server";
import OpenAI from "openai";
import { readFileSync } from "fs";
import { join } from "path";

function getGuide(): string {
  try {
    const guidePath = join(process.cwd(), "content", "guide.md");
    return readFileSync(guidePath, "utf-8");
  } catch {
    return "あなたはイベントブースの担当者AIです。訪問者の質問に丁寧に回答してください。";
  }
}

function createClient() {
  return new OpenAI({
    baseURL: process.env.AI_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: process.env.AI_API_KEY ?? "dummy",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const guide = getGuide();
    const model = process.env.AI_MODEL ?? "llama3";
    const client = createClient();

    const stream = await client.chat.completions.create({
      model,
      stream: true,
      messages: [
        {
          role: "system",
          content: guide,
        },
        ...messages,
      ],
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const data = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("[chat/route] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
