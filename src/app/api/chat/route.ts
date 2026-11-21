import { NextRequest } from "next/server";
import OpenAI from "openai";
import { loadGuide, buildSystemPrompt } from "@/lib/guide";
import { findRelated } from "@/lib/knowledge";

const MAX_QUESTION_CHARS = 40;
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_CHARS = 2000; // 履歴1件あたりの上限

type ChatMessage = { role: "user" | "assistant"; content: string };

function createClient() {
  return new OpenAI({
    baseURL: process.env.AI_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: process.env.AI_API_KEY ?? "dummy",
  });
}

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** クライアントから届いた履歴を検証し、user / assistant の発言だけを取り出す */
function sanitizeMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;
  const messages: ChatMessage[] = [];
  for (const m of input) {
    if (typeof m?.content !== "string") return null;
    if (m.role !== "user" && m.role !== "assistant") return null;
    messages.push({ role: m.role, content: m.content });
  }
  return messages;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const all = sanitizeMessages(body?.messages);
    const last = all?.at(-1);
    if (!all || !last || last.role !== "user" || !last.content.trim()) {
      return jsonError("Invalid messages", 400);
    }
    if (last.content.length > MAX_QUESTION_CHARS) {
      return jsonError(`メッセージは${MAX_QUESTION_CHARS}文字以内で入力してください。`, 400);
    }

    const messages = all
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ ...m, content: m.content.slice(0, MAX_HISTORY_CHARS) }));

    // 今回の質問を主に、直前の質問も少し加味して資料を検索する（「それはどうやるの？」対策）
    const previousQuestion = all.slice(0, -1).findLast((m) => m.role === "user");
    const guide = loadGuide();
    const related = await findRelated(guide, [
      { text: last.content, weight: 1 },
      ...(previousQuestion ? [{ text: previousQuestion.content.slice(0, 200), weight: 0.4 }] : []),
    ]);
    const sources = [...new Set(related.map((c) => c.source))];

    const stream = await createClient().chat.completions.create({
      model: process.env.AI_MODEL ?? "llama3",
      stream: true,
      messages: [{ role: "system", content: buildSystemPrompt(guide, related) }, ...messages],
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: string) => controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        try {
          // 最初に、今回の回答で参照した資料名を知らせる（独自イベント）
          send(JSON.stringify({ vb_sources: sources }));
          for await (const chunk of stream) send(JSON.stringify(chunk));
          send("[DONE]");
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        stream.controller.abort();
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
    return jsonError("Internal server error", 500);
  }
}
