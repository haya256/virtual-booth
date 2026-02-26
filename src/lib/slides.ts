export type SlideData = {
  label?: string;   // 上部の見出しラベル
  title?: string;   // 大きなタイトル文字（"|" で改行）
  body?: string;    // 本文テキスト（"\n" で改行）
  items?: string[]; // 箇条書き（"絵文字 テキスト" 形式）
  steps?: string[]; // 番号付きステップ
  code?: string;    // コードブロック
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

function parseSlideBlock(block: string): SlideData {
  const slide: SlideData = {};
  const lines = block.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("label: ")) {
      slide.label = line.slice(7).trim();
    } else if (line.startsWith("title: ")) {
      slide.title = line.slice(7).trim();
    } else if (line.startsWith("code: ")) {
      slide.code = line.slice(6).trim();
    } else if (line === "body: |") {
      // インデント付き複数行
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith("  ")) {
        bodyLines.push(lines[i].slice(2));
        i++;
      }
      slide.body = bodyLines.join("\n").trimEnd();
      continue;
    } else if (line.startsWith("body: ")) {
      slide.body = line.slice(6).trim();
    } else if (line === "items:" || line === "steps:") {
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

    i++;
  }

  return slide;
}
