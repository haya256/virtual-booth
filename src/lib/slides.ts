export type SlideData = {
  label?: string;   // 上部の見出しラベル
  title?: string;   // 大きなタイトル文字（"|" で改行）
  body?: string;    // 本文テキスト（"\n" で改行）
  items?: string[]; // 箇条書き（"絵文字 テキスト" 形式）
  steps?: string[]; // 番号付きステップ
  code?: string;    // コードブロック
  image?: string;   // 画像ファイル名（content/images/ 内）
  note?: string;    // AI向けの説明ポイント・使いどころ（画面には表示されない）
};

export function parseSlides(guide: string): SlideData[] {
  const marker = "\n## ディスプレイスライド\n";
  const sectionStart = guide.indexOf(marker);
  if (sectionStart === -1) return [];

  const contentStart = sectionStart + marker.length;
  const nextH2 = guide.indexOf("\n## ", contentStart);
  const section = guide.slice(contentStart, nextH2 === -1 ? undefined : nextH2);

  // "### SLIDE:N\n" で分割し、最初の要素（スライド前のコメント等）を除外
  const parts = section.split(/### SLIDE:\d+\n/);
  return parts.slice(1).map(parseSlideBlock).filter((s) => Object.keys(s).length > 0);
}

const TEXT_FIELDS = ["label", "title", "code", "image", "body", "note"] as const;
const MULTILINE_FIELDS = new Set<string>(["body", "note"]);

function parseSlideBlock(block: string): SlideData {
  const slide: SlideData = {};
  const lines = block.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // "body: |" / "note: |" + インデント付き複数行
    const multi = /^(\w+): \|$/.exec(line);
    if (multi && MULTILINE_FIELDS.has(multi[1])) {
      const collected: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith("  ")) {
        collected.push(lines[i].slice(2));
        i++;
      }
      slide[multi[1] as "body" | "note"] = collected.join("\n").trimEnd();
      continue;
    }

    if (line === "items:" || line === "steps:") {
      const list: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith("  - ")) {
        list.push(lines[i].slice(4));
        i++;
      }
      if (line === "steps:") slide.steps = list;
      else slide.items = list;
      continue;
    }

    const field = TEXT_FIELDS.find((f) => line.startsWith(`${f}: `));
    if (field) slide[field] = line.slice(field.length + 2).trim();

    i++;
  }

  return slide;
}

/** スライド1枚の表示内容を、AIに渡すための1行テキストにする */
export function describeSlide(slide: SlideData): string {
  const parts: string[] = [];
  if (slide.label) parts.push(slide.label);
  if (slide.title) parts.push(slide.title.replace(/\|/g, " "));
  if (slide.body) parts.push(slide.body.replace(/\n/g, ""));
  if (slide.code) parts.push(`コード: ${slide.code}`);
  if (slide.items?.length) parts.push(slide.items.join("、"));
  if (slide.steps?.length) parts.push(slide.steps.map((s, i) => `${i + 1}. ${s}`).join(" "));
  if (slide.image) parts.push("（図・画像）");
  return parts.join(" / ");
}
