"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const CHARS_PER_PAGE = 120;

type Message = { role: "user" | "assistant"; content: string };
type Section = { slide: number | null; pages: string[] };

type ChatPanelProps = {
  onClose: () => void;
  setCurrentSlide: (n: number) => void;
};

function splitIntoPages(text: string): string[] {
  const pages: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    if (remaining.length <= CHARS_PER_PAGE) {
      pages.push(remaining);
      break;
    }
    const slice = remaining.slice(0, CHARS_PER_PAGE);
    const boundary = Math.max(
      slice.lastIndexOf("。"),
      slice.lastIndexOf("！"),
      slice.lastIndexOf("？"),
      slice.lastIndexOf("\n"),
    );
    const breakAt = boundary > CHARS_PER_PAGE * 0.5 ? boundary + 1 : CHARS_PER_PAGE;
    pages.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  return pages.filter(p => p.length > 0);
}

/**
 * [SLIDE:N] マーカーでテキストをセクションに分割する。
 * 各セクションは { slide: 表示するスライド番号(0-indexed) | null, pages: string[] }
 */
function parseIntoSections(rawText: string): Section[] {
  const parts = rawText.split(/\[SLIDE:(\d+)\]/);
  const sections: Section[] = [];

  // マーカー前のテキスト
  if (parts[0].trim()) {
    sections.push({ slide: null, pages: splitIntoPages(parts[0].trim()) });
  }

  // [SLIDE:N] + 後続テキストのペア
  for (let i = 1; i < parts.length; i += 2) {
    const slide = Math.max(0, Math.min(parseInt(parts[i], 10) - 1, 4));
    const text = (parts[i + 1] ?? "").trim();
    if (text) {
      sections.push({ slide, pages: splitIntoPages(text) });
    }
  }

  return sections.length > 0 ? sections : [{ slide: null, pages: [""] }];
}

export default function ChatPanel({ onClose, setCurrentSlide }: ChatPanelProps) {
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const accumulatedContent = useRef("");

  useEffect(() => { inputRef.current?.focus(); }, []);

  const currentSection = sections[sectionIdx];
  const currentText = currentSection?.pages[pageIdx] ?? "";
  const hasNextPage = !!currentSection && pageIdx < currentSection.pages.length - 1;
  const hasNextSection = sectionIdx < sections.length - 1;
  const canAdvance = !isLoading && sections.length > 0 && (hasNextPage || hasNextSection);

  // ページ or セクション（＝スライド）を進める
  const advance = useCallback(() => {
    if (isLoading) return;
    if (hasNextPage) {
      setPageIdx(p => p + 1);
      return;
    }
    if (hasNextSection) {
      const nextIdx = sectionIdx + 1;
      const nextSection = sections[nextIdx];
      if (nextSection.slide !== null) {
        setCurrentSlide(nextSection.slide);
      }
      setSectionIdx(nextIdx);
      setPageIdx(0);
    }
  }, [isLoading, hasNextPage, hasNextSection, sectionIdx, sections, setCurrentSlide]);

  // グローバルキーリスナー
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;
      if (e.isComposing || e.shiftKey) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      if (isLoading) return;
      e.preventDefault();
      advance();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isLoading, advance]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: input };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setInput("");
    setIsLoading(true);

    accumulatedContent.current = "";
    setSections([]);
    setSectionIdx(0);
    setPageIdx(0);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });
      if (!response.ok || !response.body) throw new Error("API error");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstSlideApplied = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? "";
            if (!delta) continue;
            accumulatedContent.current += delta;

            // 最初の [SLIDE:N] だけ即時適用（ストリーミング中の視覚的フィードバック）
            if (!firstSlideApplied) {
              const m = /\[SLIDE:(\d+)\]/.exec(accumulatedContent.current);
              if (m) {
                const n = Math.max(0, Math.min(parseInt(m[1], 10) - 1, 4));
                setCurrentSlide(n);
                firstSlideApplied = true;
              }
            }
          } catch { /* ignore */ }
        }
      }

      // ストリーミング完了 → セクション分割して表示
      const rawText = accumulatedContent.current;
      const newSections = parseIntoSections(rawText);
      const cleanText = rawText.replace(/\[SLIDE:\d+\]/g, "").trim();
      setHistory(prev => [...prev, { role: "assistant", content: cleanText }]);
      setSections(newSections);
      setSectionIdx(0);
      setPageIdx(0);
      // 先頭セクションのスライドを確定適用
      if (newSections[0]?.slide !== null) {
        setCurrentSlide(newSections[0].slide!);
      }
    } catch {
      setSections([{ slide: null, pages: ["申し訳ございません、エラーが発生しました。もう一度お試しください。"] }]);
      setSectionIdx(0);
      setPageIdx(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.shiftKey) return;
    if (e.key === "Enter") {
      if (input.trim()) sendMessage();
      else advance();
    } else if (e.key === " " && !input.trim()) {
      e.preventDefault();
      advance();
    }
  };

  const remainingSections = sections.length - 1 - sectionIdx;

  return (
    <div style={{ width: "100%", fontFamily: "monospace" }}>
      <div style={{
        background: "rgba(6, 6, 20, 0.96)",
        border: "2px solid #5544bb",
        borderRadius: 4,
        boxShadow: "0 0 0 1px #110033, 0 -4px 24px rgba(68, 51, 170, 0.4)",
        overflow: "hidden",
      }}>
        {/* キャラクター名タグ */}
        <div style={{ paddingTop: 8, paddingLeft: 12 }}>
          <div style={{
            display: "inline-block",
            background: "#16113a",
            border: "2px solid #5544bb",
            borderBottom: "2px solid #16113a",
            borderRadius: "4px 4px 0 0",
            padding: "2px 14px",
            color: "#c8a0f0",
            fontSize: 11,
            fontWeight: "bold",
            letterSpacing: "0.15em",
            marginBottom: -2,
            position: "relative",
            zIndex: 1,
          }}>AI 担当者</div>
        </div>

        {/* テキスト表示エリア */}
        <div style={{
          background: "#16113a",
          border: "1px solid #332266",
          margin: "0 12px",
          borderRadius: "0 4px 4px 4px",
          minHeight: 72,
          padding: "10px 14px",
          color: "#e8e0ff",
          fontSize: 13,
          lineHeight: 1.85,
          letterSpacing: "0.04em",
        }}>
          {isLoading ? (
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
              <span style={{ color: "#9977cc", fontSize: 12 }}>考え中</span>
              {[0, 150, 300].map(d => (
                <span key={d} className="animate-bounce" style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#7755aa", display: "inline-block",
                  animationDelay: `${d}ms`,
                }} />
              ))}
            </span>
          ) : sections.length === 0 ? (
            <span style={{ color: "#554477", fontSize: 12 }}>
              何でもお気軽にご質問ください。
            </span>
          ) : (
            <>
              {currentText}
              {canAdvance && (
                <span className="animate-bounce" style={{
                  display: "inline-block", marginLeft: 6,
                  color: hasNextPage ? "#c8a0f0" : "#88aaff",
                  fontSize: 13, lineHeight: 1, verticalAlign: "middle",
                }}>▼</span>
              )}
            </>
          )}
        </div>

        {/* ページ・セクション情報 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "3px 14px 0",
          color: "#443366", fontSize: 10, letterSpacing: "0.05em",
        }}>
          <span>
            {!isLoading && currentSection && currentSection.pages.length > 1 &&
              `${pageIdx + 1} / ${currentSection.pages.length}`}
          </span>
          <span>
            {!isLoading && canAdvance && (
              hasNextPage
                ? "Space / Enter → 次へ"
                : `Space / Enter → 次のスライドへ（残り ${remainingSections}）`
            )}
          </span>
        </div>

        {/* 区切り */}
        <div style={{ height: 1, background: "#1e1650", margin: "6px 12px 0" }} />

        {/* 入力エリア */}
        <div style={{ display: "flex", gap: 6, padding: "7px 12px", alignItems: "center" }}>
          <span style={{ color: "#5544aa", fontSize: 13, flexShrink: 0 }}>▶</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力..."
            disabled={isLoading}
            style={{
              flex: 1,
              background: "transparent",
              color: "#e8e0ff",
              border: "none",
              outline: "none",
              fontSize: 13,
              fontFamily: "monospace",
              letterSpacing: "0.04em",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              background: "transparent",
              color: isLoading || !input.trim() ? "#332255" : "#9977cc",
              border: `1px solid ${isLoading || !input.trim() ? "#221144" : "#6655aa"}`,
              borderRadius: 3,
              padding: "2px 12px",
              fontSize: 11,
              fontFamily: "monospace",
              cursor: isLoading || !input.trim() ? "default" : "pointer",
              letterSpacing: "0.1em",
              flexShrink: 0,
            }}
          >送信</button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#443366",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 2px",
              flexShrink: 0,
            }}
          >✕</button>
        </div>
      </div>
    </div>
  );
}
