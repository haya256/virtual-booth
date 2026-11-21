/**
 * ブースの資料検索。
 *
 * content/knowledge/ 配下のファイル・guide.md の「参照ファイル」・「外部ソース」のURLを
 * 小さなチャンクに分けて索引化し、質問に関連する部分だけを取り出す。
 * Embedding やツール呼び出しに頼らないキーワード検索（BM25）なので、
 * どの OpenAI 互換 API・モデルでも同じように動く。
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { CONTENT_DIR, BoothGuide, ExternalSource, RelatedChunk } from "./guide";

const KNOWLEDGE_DIR = "knowledge";
const TEXT_EXTENSIONS = new Set([".md", ".txt", ".html", ".htm"]);
// content/ の外で、参照ファイルとして例外的に許可するもの
const ALLOWED_UPPER_FILES = new Set(["../README.md"]);

const CHUNK_TARGET = 600; // 1チャンクの目安文字数
const CHUNK_MAX = 800;
const RESULT_CHAR_BUDGET = 3000; // プロンプトに入れる抜粋の合計文字数
const RESULT_MAX_CHUNKS = 6;
const MIN_QUERY_COVERAGE = 0.35; // 質問の語のうち最低これだけ含むチャンクだけを候補にする

const FEED_MAX_ENTRIES = 12; // フィードは新しいものからこの件数まで
const FEED_DETAIL_CHARS = 120; // フィード1件あたりの本文の上限

const EXTERNAL_TIMEOUT_MS = 5000;
const EXTERNAL_MAX_CHARS = 60_000;
const EXTERNAL_TTL_MS = 60 * 60 * 1000; // 取得成功時のキャッシュ: 1時間
const EXTERNAL_RETRY_MS = 5 * 60 * 1000; // 取得失敗時の再試行間隔: 5分

type IndexedChunk = RelatedChunk & { tf: Map<string, number>; length: number; order: number };
type Index = { chunks: IndexedChunk[]; df: Map<string, number>; avgLength: number };

// ───────────────────────── テキスト変換 ─────────────────────────

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? whole;
    const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
  });
}

function stripTags(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|svg|head)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<h([1-3])\b[^>]*>/gi, (_, n: string) => `\n\n${"#".repeat(Number(n))} `)
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<br\b[^>]*>|<\/(p|div|h[1-6]|li|tr|section|pre)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

/** HTML / XML を、見出しを残したプレーンテキストにする */
export function htmlToText(html: string): string {
  return decodeEntities(stripTags(html))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tagText(xml: string, names: string): string {
  const m = new RegExp(`<(${names})\\b[^>]*>([\\s\\S]*?)</\\1>`, "i").exec(xml);
  if (!m) return "";
  const inner = m[2].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
  // 本文はエスケープされたHTMLのことが多いので、デコードしてからタグを落とす
  return htmlToText(decodeEntities(inner)).replace(/\s+/g, " ").trim();
}

/**
 * Atom / RSS フィードを「- 日付: タイトル」の一覧にする（フィードの並び順＝新しい順を保つ）。
 * フィードでなければ null を返す。
 */
export function feedToText(xml: string): string | null {
  const entries = xml.match(/<(entry|item)\b[\s\S]*?<\/\1>/gi);
  if (!entries) return null;
  const lines = entries.slice(0, FEED_MAX_ENTRIES).map((entry) => {
    const title = tagText(entry, "title");
    const date = tagText(entry, "updated|published|pubDate|dc:date");
    const day = /^\d{4}-\d{2}-\d{2}/.exec(date)?.[0] ?? date;
    let detail = tagText(entry, "content|summary|description");
    if (detail.startsWith(title)) detail = detail.slice(title.length).trim();
    // コミットメッセージ末尾の署名行（Co-Authored-By など）は情報にならないので落とす
    detail = detail.replace(/\s*\b[A-Z][A-Za-z]+(?:-[A-Za-z]+)+:\s[\s\S]*$/, "");
    if (detail.length > FEED_DETAIL_CHARS) detail = `${detail.slice(0, FEED_DETAIL_CHARS)}…`;
    return `- ${day ? `${day}: ` : ""}${title}${detail ? `\n  ${detail}` : ""}`;
  });
  return `新しい順の一覧です。\n\n${lines.join("\n\n")}`;
}

const JSON_NOISE_KEY = /(^|_)(url|id|sha)$|^node_id$|avatar|gravatar/i;

/** APIのJSONレスポンスを「キー: 値」の行に平たくする（URLやIDなどのノイズは落とす） */
export function jsonToText(value: unknown, prefix = ""): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "object") {
    const s = String(value);
    if (/^https?:\/\//.test(s)) return "";
    return prefix ? `${prefix}: ${s}` : s;
  }
  if (Array.isArray(value)) {
    const sep = value.some((v) => typeof v === "object" && v !== null) ? "\n\n" : "\n";
    return value.map((v) => jsonToText(v, prefix)).filter(Boolean).join(sep);
  }
  return Object.entries(value)
    .filter(([key]) => !JSON_NOISE_KEY.test(key))
    .map(([key, v]) => jsonToText(v, prefix ? `${prefix}.${key}` : key))
    .filter(Boolean)
    .join("\n");
}

// ───────────────────────── チャンク分割 ─────────────────────────

function splitLong(text: string): string[] {
  const pieces: string[] = [];
  let current = "";
  const push = () => {
    if (current.trim()) pieces.push(current.trim());
    current = "";
  };
  for (const paragraph of text.split(/\n{2,}/)) {
    if (current && current.length + paragraph.length > CHUNK_TARGET) push();
    if (paragraph.length <= CHUNK_MAX) {
      current += (current ? "\n\n" : "") + paragraph;
      continue;
    }
    // 1段落が長すぎる場合は行単位（それでも長ければ文字数）で切る
    for (const line of paragraph.split("\n")) {
      if (current && current.length + line.length > CHUNK_TARGET) push();
      for (let i = 0; i < line.length; i += CHUNK_MAX) {
        current += (current ? "\n" : "") + line.slice(i, i + CHUNK_MAX);
        if (current.length >= CHUNK_MAX) push();
      }
    }
  }
  push();
  return pieces;
}

/** Markdown（または見出し付きテキスト）を見出し単位のチャンクにする */
export function chunkText(source: string, text: string, baseTitle = ""): RelatedChunk[] {
  const chunks: RelatedChunk[] = [];
  const path: string[] = []; // 見出しの階層
  let body: string[] = [];
  let inFence = false;

  const flush = () => {
    const content = body.join("\n").trim();
    body = [];
    if (!content) return;
    const title = [baseTitle, ...path.filter(Boolean)].filter(Boolean).join(" > ");
    for (const piece of splitLong(content)) chunks.push({ source, title, text: piece });
  };

  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    const heading = !inFence ? /^(#{1,3})\s+(.+?)\s*$/.exec(line) : null;
    if (!heading) {
      body.push(line);
      continue;
    }
    flush();
    const level = heading[1].length;
    path.length = level - 1;
    path[level - 1] = heading[2];
  }
  flush();
  return chunks;
}

// ───────────────────────── トークン化と索引 ─────────────────────────

// 英数字の単語 / 漢字の連なり / カタカナの連なり（ひらがなは助詞・語尾が大半なので索引にしない）
const TOKEN_RUN = /[a-z0-9][a-z0-9_.+#-]*|[\u3400-\u9fff\u3005]+|[\u30a0-\u30ff]+/g;

/**
 * 検索用の語に分ける。辞書を使わずに日本語を扱うため、文字の種類で区切る。
 * - 英数字: 単語（"skin.css" は "skin" "css" でも引ける）
 * - 漢字・カタカナ: 同じ種類が続く部分を2文字ずつの組（バイグラム）に。1文字ならそのまま。
 * 例: 「履歴は何件まで送られる」→ 履歴 / 何件 / 送
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const run of text.normalize("NFKC").toLowerCase().match(TOKEN_RUN) ?? []) {
    if (/^[a-z0-9]/.test(run)) {
      const word = run.replace(/[.+#-]+$/, "");
      if (word.length >= 2) tokens.push(word);
      const parts = word.split(/[_.+#-]+/).filter((part) => part.length >= 2);
      if (parts.length > 1) tokens.push(...parts);
    } else if (run.length === 1) {
      tokens.push(run);
    } else {
      for (let i = 0; i < run.length - 1; i++) tokens.push(run.slice(i, i + 2));
    }
  }
  return tokens;
}

function buildIndex(raw: RelatedChunk[]): Index {
  const df = new Map<string, number>();
  let total = 0;
  const chunks = raw.map((chunk, order) => {
    // 見出しは本文より重く扱う（2回数える）
    const tokens = [...tokenize(chunk.title), ...tokenize(chunk.title), ...tokenize(chunk.text)];
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    total += tokens.length;
    return { ...chunk, tf, length: tokens.length, order };
  });
  return { chunks, df, avgLength: chunks.length ? total / chunks.length : 0 };
}

const BM25_K1 = 1.2;
const BM25_B = 0.75;

export type WeightedQuery = { text: string; weight: number };

function searchIndex(index: Index, queries: WeightedQuery[]): RelatedChunk[] {
  const weights = new Map<string, number>();
  for (const q of queries) {
    for (const t of new Set(tokenize(q.text))) {
      weights.set(t, Math.max(weights.get(t) ?? 0, q.weight));
    }
  }
  if (weights.size === 0 || index.chunks.length === 0) return [];

  const n = index.chunks.length;
  const idfOf = (term: string) => {
    const df = index.df.get(term) ?? 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  };
  // 質問の語（珍しい語ほど重い）のうち、どれだけをそのチャンクが含んでいるか。
  // 肝心の語を含まないチャンクが、ありふれた語の一致だけで選ばれるのを防ぐ。
  let queryMass = 0;
  for (const [term, weight] of weights) queryMass += weight * idfOf(term);

  const scored = index.chunks
    .map((chunk) => {
      let score = 0;
      let matchedMass = 0;
      for (const [term, weight] of weights) {
        const tf = chunk.tf.get(term);
        if (!tf) continue;
        const idf = idfOf(term);
        matchedMass += weight * idf;
        const norm = 1 - BM25_B + BM25_B * (chunk.length / (index.avgLength || 1));
        score += weight * idf * ((tf * (BM25_K1 + 1)) / (tf + BM25_K1 * norm));
      }
      return { chunk, score, coverage: matchedMass / queryMass };
    })
    .filter((s) => s.coverage >= MIN_QUERY_COVERAGE)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const cutoff = scored[0].score * 0.5;
  const picked: IndexedChunk[] = [];
  let used = 0;
  for (const { chunk, score } of scored) {
    if (score < cutoff || picked.length >= RESULT_MAX_CHUNKS) break;
    if (picked.length > 0 && used + chunk.text.length > RESULT_CHAR_BUDGET) continue;
    picked.push(chunk);
    used += chunk.text.length;
  }
  // 最も関連の高い資料がフィードなら、質問の主題はその一覧（「最近の更新は？」など）。
  // 先頭（＝最新）のチャンクが漏れていたら、同じ資料の最下位と入れ替えて必ず渡す。
  const lead = index.chunks.find((c) => c.lead && c.source === picked[0].source);
  if (lead && !picked.includes(lead)) {
    picked[picked.findLastIndex((c) => c.source === lead.source)] = lead;
  }

  // 最も関連の高い資料を先頭に、同じ資料の中では元の並び順（フィードなら新しい順）に戻す
  const sourceRank = new Map<string, number>();
  for (const chunk of picked) if (!sourceRank.has(chunk.source)) sourceRank.set(chunk.source, sourceRank.size);
  return picked
    .sort((a, b) => sourceRank.get(a.source)! - sourceRank.get(b.source)! || a.order - b.order)
    .map(({ source, title, text }) => ({ source, title, text }));
}

// ───────────────────────── 資料の読み込み ─────────────────────────

function toPlainText(path: string, content: string): string {
  const ext = extname(path).toLowerCase();
  return ext === ".html" || ext === ".htm" ? htmlToText(content) : content;
}

function walkKnowledge(relDir: string, depth = 0): string[] {
  if (depth > 4) return [];
  let entries: string[];
  try {
    entries = readdirSync(join(CONTENT_DIR, relDir)).sort();
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const rel = `${relDir}/${name}`;
    let stat;
    try {
      stat = statSync(join(CONTENT_DIR, rel));
    } catch {
      continue;
    }
    if (stat.isDirectory()) files.push(...walkKnowledge(rel, depth + 1));
    else if (TEXT_EXTENSIONS.has(extname(name).toLowerCase())) files.push(rel);
  }
  return files;
}

function isAllowedReference(path: string): boolean {
  if (path.startsWith("..")) return ALLOWED_UPPER_FILES.has(path); // 上位はホワイトリストのみ
  if (path.startsWith("/") || path.includes("\\")) return false;
  return !path.split("/").includes(".."); // content/ 内はトラバーサルなしのみ
}

function loadLocalChunks(guide: BoothGuide): RelatedChunk[] {
  const paths = [
    ...guide.referenceFiles.filter(isAllowedReference),
    ...walkKnowledge(KNOWLEDGE_DIR),
  ];
  const chunks: RelatedChunk[] = [];
  for (const path of new Set(paths)) {
    try {
      const content = readFileSync(join(CONTENT_DIR, path), "utf-8");
      const source = path.replace(/^\.\.\//, "");
      chunks.push(...chunkText(source, toPlainText(path, content)));
    } catch {
      // 読めないファイルは無視
    }
  }
  return chunks;
}

// ───────────────────────── 外部ソース ─────────────────────────

type ExternalEntry = { expires: number; chunks: RelatedChunk[] };
const externalCache = new Map<string, ExternalEntry>();
const externalInFlight = new Map<string, Promise<ExternalEntry>>();

async function fetchExternal(source: ExternalSource): Promise<ExternalEntry> {
  try {
    const res = await fetch(source.url, {
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
      headers: {
        "User-Agent": "booth-knowledge-fetcher",
        Accept: "application/json, application/atom+xml, text/html, text/plain, */*",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const type = res.headers.get("content-type") ?? "";
    const body = (await res.text()).slice(0, EXTERNAL_MAX_CHARS * 4);
    let text: string;
    let isFeed = false;
    if (type.includes("json")) {
      text = jsonToText(JSON.parse(body));
    } else if (/html|xml/.test(type) || /^\s*</.test(body)) {
      const feed = feedToText(body);
      isFeed = feed !== null;
      text = feed ?? htmlToText(body);
    } else {
      text = body;
    }

    const chunks = chunkText(source.label, text.slice(0, EXTERNAL_MAX_CHARS), source.label);
    if (isFeed && chunks[0]) chunks[0].lead = true;
    return { expires: Date.now() + EXTERNAL_TTL_MS, chunks };
  } catch (err) {
    console.warn(`[knowledge] 外部ソースの取得に失敗: ${source.url}`, err instanceof Error ? err.message : err);
    // 失敗しても、前回取得できた内容があればそれを使い続ける
    const previous = externalCache.get(source.url)?.chunks ?? [];
    return { expires: Date.now() + EXTERNAL_RETRY_MS, chunks: previous };
  }
}

async function loadExternalChunks(sources: ExternalSource[]): Promise<RelatedChunk[]> {
  const entries = await Promise.all(
    sources.map((source) => {
      const cached = externalCache.get(source.url);
      if (cached && cached.expires > Date.now()) return cached;
      let pending = externalInFlight.get(source.url);
      if (!pending) {
        pending = fetchExternal(source).then((entry) => {
          externalCache.set(source.url, entry);
          externalInFlight.delete(source.url);
          return entry;
        });
        externalInFlight.set(source.url, pending);
      }
      return pending;
    }),
  );
  return entries.flatMap((e) => e.chunks);
}

// ───────────────────────── 公開API ─────────────────────────

let localCache: RelatedChunk[] | null = null;

/** 質問（と直前の質問）に関連する資料の抜粋を返す */
export async function findRelated(guide: BoothGuide, queries: WeightedQuery[]): Promise<RelatedChunk[]> {
  // 本番ではローカル資料は不変なので1回だけ読む。開発中は編集がすぐ反映されるよう毎回読む。
  const local =
    process.env.NODE_ENV === "production"
      ? (localCache ??= loadLocalChunks(guide))
      : loadLocalChunks(guide);
  const external = await loadExternalChunks(guide.externalSources);
  return searchIndex(buildIndex([...local, ...external]), queries);
}
