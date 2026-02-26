import { readFileSync } from "fs";
import { join } from "path";
import Booth from "@/components/Booth";

function getBoothConfig() {
  try {
    const guide = readFileSync(join(process.cwd(), "content", "guide.md"), "utf-8");
    const title = guide.match(/^- タイトル: (.+)$/m)?.[1]?.trim() ?? "VIRTUAL BOOTH";
    const subtitle = guide.match(/^- サブタイトル: (.+)$/m)?.[1]?.trim() ?? "";
    return { title, subtitle };
  } catch {
    return { title: "VIRTUAL BOOTH", subtitle: "" };
  }
}

export default function Home() {
  const { title, subtitle } = getBoothConfig();
  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0a0a1a" }}>
      <Booth title={title} subtitle={subtitle} />
    </main>
  );
}
