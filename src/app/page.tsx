import { readFileSync } from "fs";
import { join } from "path";
import Booth from "@/components/Booth";
import BoothScaler from "@/components/BoothScaler";
import { CONTENT_DIR, loadGuide } from "@/lib/guide";

function getAttendantSVG(): string {
  try {
    return readFileSync(join(CONTENT_DIR, "attendant.svg"), "utf-8");
  } catch {
    return "";
  }
}

export default function Home() {
  const { title, subtitle, attendantName, slides, suggestedQuestions } = loadGuide();
  return (
    <main className="vb-venue">
      <BoothScaler>
        <Booth
          title={title}
          subtitle={subtitle}
          slides={slides}
          attendantSVG={getAttendantSVG()}
          attendantName={attendantName}
          suggestedQuestions={suggestedQuestions}
        />
      </BoothScaler>
    </main>
  );
}
