"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { AttendantState } from "./Attendant";

const CHARS_PER_PAGE = 120;
// 会話ウィンドウは3行固定。改行を含む回答がはみ出さないよう、行数でもページを区切る。
const LINES_PER_PAGE = 3;
const CHARS_PER_LINE = 46; // 1行に確実に収まる全角文字数
const MAX_QUESTION_CHARS = 40; // api/chat/route.ts の上限と揃える
const TYPE_INTERVAL_MS = 26; // 文字送りの速さ（1文字あたり）
const MAX_CHIPS = 4;

type Message = { role: "user" | "assistant"; content: string };
type Section = { slide: number | null; pages: string[] };

type ChatPanelProps = {
  onClose: () => void;
  setCurrentSlide: (n: number) => void;
  slideCount: number;
  attendantName?: string;
  suggestedQuestions?: string[];
  onStateChange?: (state: AttendantState) => void;
};

const SENTENCE_ENDS = ["。", "！", "？", "\n"];

function lastSentenceEnd(text: string): number {
  return Math.max(...SENTENCE_ENDS.map((c) => text.lastIndexOf(c)));
}

/** text の先頭から、1ページ（文字数上限かつ3行以内）に収まる文字数を返す */
function pageCapacity(text: string): number {
  const max = Math.min(text.length, CHARS_PER_PAGE);
  let lines = 1;
  let column = 0;
  for (let i = 0; i < max; i++) {
    if (text[i] === "\n") {
      lines++;
      column = 0;
    } else if (++column > CHARS_PER_LINE) {
      lines++;
      column = 1;
    }
    if (lines > LINES_PER_PAGE) return i;
  }
  return max;
}

function splitIntoPages(text: string): string[] {
  const pages: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    const capacity = pageCapacity(remaining);
    if (remaining.length <= capacity) {
      pages.push(remaining);
      break;
    }
    const boundary = lastSentenceEnd(remaining.slice(0, capacity));
    let breakAt = boundary > capacity * 0.5 ? boundary + 1 : capacity;
    // 句読点や閉じ括弧が次ページの先頭に来ないよう、1文字だけこのページに含める
    if ("。、！？」）".includes(remaining[breakAt] ?? "\n")) breakAt++;
    pages.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  return pages.filter((p) => p.length > 0);
}

/**
 * [SLIDE:N] マーカーでテキストをセクションに分割する。
 * 各セクションは { slide: 表示するスライド番号(0-indexed) | null, pages: string[] }
 */
function parseIntoSections(rawText: string, slideCount: number): Section[] {
  const parts = stripMarkdown(rawText).split(/\[SLIDE:(\d+)\]/);
  const sections: Section[] = [];

  // マーカー前のテキスト
  if (parts[0].trim()) {
    sections.push({ slide: null, pages: splitIntoPages(parts[0]) });
  }

  // [SLIDE:N] + 後続テキストのペア
  for (let i = 1; i < parts.length; i += 2) {
    const n = parseInt(parts[i], 10);
    const slide = slideCount > 0 ? Math.max(0, Math.min(n - 1, slideCount - 1)) : null;
    const text = (parts[i + 1] ?? "").trim();
    if (text) sections.push({ slide, pages: splitIntoPages(text) });
  }

  return sections;
}

/**
 * 会話ウィンドウはプレーンテキスト表示なので、AIが書きがちな Markdown 記法を取り除く。
 * （`code` / **強調** / # 見出し / - 箇条書き）
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/`+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "・")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{2,}/g, "\n");
}

/** ストリーミング途中の、書きかけのマーカー（"[SL" など）を表示から外す */
function dropPartialMarker(text: string): string {
  return text.replace(/\[(?:S(?:L(?:I(?:D(?:E(?::\d*)?)?)?)?)?)?$/, "");
}

/**
 * ストリーミング中の最終ページのうち、後から次ページへ回されることのない文字数。
 * ここまでだけを文字送りすることで、表示済みの文字が消えて次ページに移るのを防ぐ。
 */
function stableLength(page: string): number {
  // ページの区切りは「前半を過ぎた最後の文末」か「容量いっぱい」のどちらか。
  // 最後の文末が前半にあるうちは、今ある文字はすべてこのページに残る。
  const boundary = lastSentenceEnd(page);
  return boundary > page.length * 0.5 ? boundary + 1 : page.length;
}

function sourceLabel(source: string): string {
  return source.split("/").at(-1) ?? source;
}

export default function ChatPanel({
  onClose,
  setCurrentSlide,
  slideCount,
  attendantName = "AI 担当者",
  suggestedQuestions = [],
  onStateChange,
}: ChatPanelProps) {
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // 送信〜ストリーミング完了まで
  const [rawText, setRawText] = useState(""); // 今回の回答（マーカー込み）
  const [sources, setSources] = useState<string[]>([]);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const [typed, setTyped] = useState(0); // 現在のページで表示済みの文字数

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    inputRef.current?.focus();
    return () => abortRef.current?.abort();
  }, []);

  // 回答完了時に入力欄へ自動フォーカス
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const sections = useMemo(
    () => parseIntoSections(dropPartialMarker(rawText), slideCount),
    [rawText, slideCount],
  );

  const currentSection = sections[sectionIdx];
  const currentText = currentSection?.pages[pageIdx] ?? "";
  const hasNextPage = !!currentSection && pageIdx < currentSection.pages.length - 1;
  const hasNextSection = sectionIdx < sections.length - 1;
  const hasNext = hasNextPage || hasNextSection;

  // 文字送りしてよい上限。ストリーミング中の最終ページだけは確定済みの部分まで。
  const typeLimit = isLoading && !hasNext ? stableLength(currentText) : currentText.length;
  const isTyping = typed < typeLimit;
  const shownText = currentText.slice(0, typed);
  const canAdvance = hasNext && !isTyping;
  const isWaiting = isLoading && sections.length === 0; // まだ1文字も届いていない

  // 文字送り
  useEffect(() => {
    if (typed >= typeLimit) return;
    const id = setTimeout(
      () => setTyped((t) => (reducedMotion.current ? typeLimit : Math.min(t + 1, typeLimit))),
      TYPE_INTERVAL_MS,
    );
    return () => clearTimeout(id);
  }, [typed, typeLimit]);

  // 読んでいる位置のスライドをディスプレイに映す
  const activeSlide = currentSection?.slide ?? null;
  useEffect(() => {
    if (activeSlide !== null) setCurrentSlide(activeSlide);
  }, [activeSlide, sectionIdx, setCurrentSlide]);

  // 担当者の状態（考え中 / 会話中 / 待機）を親へ伝える
  const attendantState: AttendantState = isWaiting ? "thinking" : isTyping || isLoading ? "talking" : "idle";
  useEffect(() => {
    onStateChange?.(attendantState);
  }, [attendantState, onStateChange]);

  // 文字送りをスキップ → 次のページ → 次のセクション（＝スライド）の順に進める
  const advance = useCallback(() => {
    if (sections.length === 0) return;
    if (isTyping) {
      setTyped(typeLimit);
    } else if (hasNextPage) {
      setPageIdx((p) => p + 1);
      setTyped(0);
    } else if (hasNextSection) {
      setSectionIdx((s) => s + 1);
      setPageIdx(0);
      setTyped(0);
    }
  }, [sections.length, isTyping, typeLimit, hasNextPage, hasNextSection]);

  // グローバルキーリスナー（入力欄の外で Space / Enter）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active === inputRef.current) return;
      // 会話ウィンドウ内のボタン（質問ボタン・閉じる等）は通常どおり押せるようにする
      if (active instanceof HTMLButtonElement && panelRef.current?.contains(active)) return;
      if (e.isComposing || e.shiftKey) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      advance();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance]);

  const showAnswer = (text: string) => {
    setRawText(text);
    setSectionIdx(0);
    setPageIdx(0);
    setTyped(0);
  };

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || question.length > MAX_QUESTION_CHARS || isLoading) return;

    const newHistory: Message[] = [...history, { role: "user", content: question }];
    setHistory(newHistory);
    setInput("");
    setIsLoading(true);
    setSources([]);
    showAnswer("");

    const abort = new AbortController();
    abortRef.current?.abort();
    abortRef.current = abort;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
        signal: abort.signal,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        showAnswer(errorData?.error ?? "エラーが発生しました。もう一度お試しください。");
        return;
      }
      if (!response.body) throw new Error("API error");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      const handleLine = (line: string) => {
        if (!line.startsWith("data: ")) return;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") return;
        try {
          const event = JSON.parse(data);
          if (Array.isArray(event.vb_sources)) {
            setSources(event.vb_sources.filter((s: unknown) => typeof s === "string"));
            return;
          }
          const delta = event.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            answer += delta;
            setRawText(answer); // 届いた分から順に表示する
          }
        } catch { /* 不完全な行は無視 */ }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // チャンクの境界が行の途中に来ることがあるので、改行までをためてから処理する
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handleLine);
      }
      handleLine(buffer);

      const cleanText = stripMarkdown(answer).replace(/\[SLIDE:\d+\]/g, "").trim();
      if (!cleanText) {
        showAnswer("申し訳ございません、うまく回答を作れませんでした。もう一度お試しください。");
        return;
      }
      setHistory((prev) => [...prev, { role: "assistant", content: cleanText }]);
    } catch {
      if (abort.signal.aborted) return;
      setSources([]);
      showAnswer("申し訳ございません、エラーが発生しました。もう一度お試しください。");
    } finally {
      if (abortRef.current === abort) setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.shiftKey) return;
    if (e.key === "Enter") {
      if (input.trim()) sendMessage(input);
      else advance();
    } else if (e.key === " " && !input.trim()) {
      e.preventDefault();
      advance();
    }
  };

  const tooLong = input.trim().length > MAX_QUESTION_CHARS;
  const canSend = !isLoading && !!input.trim() && !tooLong;
  const remainingSections = sections.length - 1 - sectionIdx;
  const chips = suggestedQuestions.filter((q) => q.length <= MAX_QUESTION_CHARS).slice(0, MAX_CHIPS);
  const shownSources = sources.slice(0, 2).map(sourceLabel).join("・") + (sources.length > 2 ? ` 他${sources.length - 2}件` : "");

  let hint = "";
  if (isTyping) hint = "Space / Enter → スキップ";
  else if (hasNextPage) hint = "Space / Enter → 次へ";
  else if (hasNextSection) hint = `Space / Enter → 次のスライドへ（残り ${remainingSections}）`;

  return (
    <div ref={panelRef} className="vb-chat" style={{ width: "100%", fontFamily: "var(--vb-font-dialog)" }}>
      <div style={{
        background: "var(--vb-chat-bg)",
        border: "2px solid var(--vb-chat-border)",
        borderRadius: 6,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 -4px 24px color-mix(in srgb, var(--vb-chat-border) 40%, transparent), inset 0 0 24px color-mix(in srgb, var(--vb-chat-border) 14%, transparent)",
        overflow: "hidden",
        backdropFilter: "blur(6px)",
      }}>
        {/* キャラクター名タグ + 状態表示 + 閉じるボタン */}
        <div style={{ paddingTop: 8, paddingLeft: 12, paddingRight: 8, display: "flex", alignItems: "flex-end", gap: 10 }}>
          <div style={{
            flexShrink: 0,
            background: "color-mix(in srgb, var(--vb-chat-border) 28%, transparent)",
            border: "2px solid var(--vb-chat-border)",
            borderBottom: "none",
            borderRadius: "4px 4px 0 0",
            padding: "2px 14px",
            color: "var(--vb-text-secondary)",
            fontSize: 12,
            letterSpacing: "0.12em",
          }}>{attendantName}</div>

          <div style={{
            flex: 1, minWidth: 0, paddingBottom: 3,
            display: "flex", justifyContent: "flex-end", gap: 12,
            color: "var(--vb-text-muted)", fontSize: 10, letterSpacing: "0.05em", whiteSpace: "nowrap",
          }}>
            {shownSources && sections.length > 0 && (
              <span title={sources.join("\n")} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                参照: {shownSources}
              </span>
            )}
            {currentSection && currentSection.pages.length > 1 && (
              <span>{pageIdx + 1} / {currentSection.pages.length}</span>
            )}
            {hint && <span>{hint}</span>}
          </div>

          <button
            onClick={onClose}
            aria-label="会話を閉じる"
            title="閉じる (Esc)"
            style={{
              flexShrink: 0,
              background: "transparent",
              color: "var(--vb-text-muted)",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 4px 3px",
              lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* テキスト表示エリア（3行ぶんの高さで固定） */}
        <div
          onClick={advance}
          aria-live="polite"
          style={{
            background: "color-mix(in srgb, var(--vb-chat-border) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--vb-chat-border) 70%, transparent)",
            margin: "0 12px",
            borderRadius: "0 4px 4px 4px",
            height: 88,
            padding: "8px 14px",
            color: "var(--vb-text-primary)",
            fontSize: 14,
            lineHeight: "24px",
            letterSpacing: "0.03em",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            cursor: isTyping || canAdvance ? "pointer" : "default",
          }}
        >
          {isWaiting ? (
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: "var(--vb-text-secondary)", fontSize: 13 }}>考え中</span>
              {[0, 150, 300].map((d) => (
                <span key={d} className="animate-bounce" style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "var(--vb-text-muted)", display: "inline-block",
                  animationDelay: `${d}ms`,
                }} />
              ))}
            </span>
          ) : sections.length === 0 ? (
            <>
              <div style={{ color: "var(--vb-text-secondary)", fontSize: 13 }}>
                こんにちは！何でもお気軽にご質問ください。
              </div>
              {chips.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {chips.map((q) => (
                    <button
                      key={q}
                      className="vb-chip"
                      onClick={(e) => { e.stopPropagation(); sendMessage(q); }}
                      style={{
                        borderRadius: 999,
                        padding: "0 10px",
                        fontSize: 11,
                        lineHeight: "20px",
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >{q}</button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {shownText}
              {canAdvance && (
                <span className="vb-caret" style={{
                  display: "inline-block", marginLeft: 6,
                  color: hasNextPage ? "var(--vb-text-secondary)" : "var(--vb-display-border)",
                  fontSize: 12, lineHeight: 1,
                }}>▼</span>
              )}
            </>
          )}
        </div>

        {/* 入力エリア */}
        <div style={{ display: "flex", gap: 6, padding: "6px 12px 7px", alignItems: "center" }}>
          <span style={{ color: "var(--vb-chat-border)", fontSize: 13, flexShrink: 0 }}>▶</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "回答中…" : "質問を入力..."}
            aria-label="質問"
            disabled={isLoading}
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              color: "var(--vb-text-primary)",
              border: "none",
              outline: "none",
              fontSize: 14,
              fontFamily: "inherit",
              letterSpacing: "0.03em",
            }}
          />
          {input && (
            <span style={{ flexShrink: 0, fontSize: 10, color: tooLong ? "#ff7a90" : "var(--vb-text-muted)" }}>
              {input.trim().length} / {MAX_QUESTION_CHARS}
            </span>
          )}
          <button
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            style={{
              background: canSend ? "color-mix(in srgb, var(--vb-chat-border) 35%, transparent)" : "transparent",
              color: canSend ? "var(--vb-text-primary)" : "var(--vb-text-muted)",
              border: `1px solid ${canSend ? "var(--vb-chat-border)" : "color-mix(in srgb, var(--vb-chat-border) 40%, transparent)"}`,
              borderRadius: 3,
              padding: "2px 12px",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: canSend ? "pointer" : "default",
              letterSpacing: "0.1em",
              flexShrink: 0,
            }}
          >送信</button>
        </div>
      </div>
    </div>
  );
}
