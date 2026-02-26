import { NextRequest } from "next/server";
import OpenAI from "openai";
import { readFileSync } from "fs";
import { join } from "path";

// content/ 内のファイル、および例外的に許可する上位ファイルのホワイトリスト
const ALLOWED_UPPER_FILES = new Set(["../README.md"]);

function getGuide(): string {
  try {
    const contentDir = join(process.cwd(), "content");
    const guide = readFileSync(join(contentDir, "guide.md"), "utf-8");

    // ## 参照ファイル セクションからパスを抽出
    const refSection = guide.match(/^## 参照ファイル$([\s\S]*?)^##/m);
    if (!refSection) return guide;

    const filePaths = [...refSection[1].matchAll(/^- (.+)$/gm)]
      .map(m => m[1].trim());

    const extras = filePaths
      .filter(p => {
        if (p.startsWith("..")) return ALLOWED_UPPER_FILES.has(p); // 上位はホワイトリストのみ
        return !p.includes("/.."); // content/ 内はトラバーサルなしのみ
      })
      .map(p => {
        try {
          const content = readFileSync(join(contentDir, p), "utf-8");
          return `---\n\n### 参照: ${p}\n\n${content}`;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return extras.length > 0 ? `${guide}\n\n${extras.join("\n\n")}` : guide;
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

    const lastMessage = messages.at(-1);
    if (typeof lastMessage?.content === "string" && lastMessage.content.length > 40) {
      return new Response(JSON.stringify({ error: "メッセージは40文字以内で入力してください。" }), {
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
