import { readFileSync } from "fs";
import { join } from "path";

function getPamphletFile(): string {
  try {
    const guide = readFileSync(join(process.cwd(), "content", "guide.md"), "utf-8");
    const match = guide.match(/^- パンフレット: (.+)$/m);
    const filename = match?.[1]?.trim() ?? "pamphlet.html";
    // content/ 内のファイルのみ許可（パストラバーサル禁止）
    if (filename.includes("..") || filename.includes("/")) {
      return "pamphlet.html";
    }
    return filename;
  } catch {
    return "pamphlet.html";
  }
}

export async function GET() {
  try {
    const filename = getPamphletFile();
    const html = readFileSync(join(process.cwd(), "content", filename), "utf-8");
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("パンフレットが見つかりません。", { status: 404 });
  }
}
