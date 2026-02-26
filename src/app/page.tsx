import { readFileSync } from "fs";
import { join } from "path";
import Booth from "@/components/Booth";
import BoothScaler from "@/components/BoothScaler";
import { parseSlides } from "@/lib/slides";

function getBoothConfig() {
  try {
    const guide = readFileSync(join(process.cwd(), "content", "guide.md"), "utf-8");
    const title = guide.match(/^- タイトル: (.+)$/m)?.[1]?.trim() ?? "VIRTUAL BOOTH";
    const subtitle = guide.match(/^- サブタイトル: (.+)$/m)?.[1]?.trim() ?? "";
    const attendantName = guide.match(/^- 担当者名: (.+)$/m)?.[1]?.trim() ?? "AI 担当者";
    const slides = parseSlides(guide);
    return { title, subtitle, attendantName, slides };
  } catch {
    return { title: "VIRTUAL BOOTH", subtitle: "", attendantName: "AI 担当者", slides: [] };
  }
}

function getAttendantSVG(): string {
  try {
    return readFileSync(join(process.cwd(), "content", "attendant.svg"), "utf-8");
  } catch {
    return "";
  }
}

export default function Home() {
  const { title, subtitle, attendantName, slides } = getBoothConfig();
  const attendantSVG = getAttendantSVG();
  return (
    <main style={{ position: "fixed", inset: 0, background: "var(--vb-bg)", overflow: "hidden" }}>
      <BoothScaler>
        <Booth title={title} subtitle={subtitle} slides={slides} attendantSVG={attendantSVG} attendantName={attendantName} />
      </BoothScaler>
    </main>
  );
}
