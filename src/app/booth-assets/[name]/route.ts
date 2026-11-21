import { readFile } from "fs/promises";
import { join, extname } from "path";
import { CONTENT_DIR } from "@/lib/guide";

// content/images/ 直下の画像だけを配信する（スライドの image: から参照される）
const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const type = MIME_TYPES[extname(name).toLowerCase()];

  // 英数字・ハイフン・アンダースコア・ドットのみ（パストラバーサル禁止）
  if (!type || !/^[\w-][\w.-]*$/.test(name) || name.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readFile(join(CONTENT_DIR, "images", name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        // SVG を直接開かれてもスクリプトが動かないようにする
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
