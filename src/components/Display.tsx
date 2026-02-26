"use client";

import { SlideData } from "@/lib/slides";

function SlideRenderer({ slide }: { slide: SlideData }) {
  const isTitle = !!slide.title;

  return (
    <div
      className={`w-full h-full flex flex-col p-3 ${isTitle ? "items-center justify-center gap-1.5" : "justify-center gap-2"}`}
      style={{
        background: isTitle
          ? "linear-gradient(135deg, #1a0f40 0%, #2d1b69 100%)"
          : "#0a0a1f",
      }}
    >
      {slide.label && (
        <div
          className="text-xs font-bold tracking-wider"
          style={{ color: "var(--vb-display-border)" }}
        >
          {slide.label}
        </div>
      )}

      {slide.title && (
        <div
          className="text-lg font-black tracking-widest text-center leading-tight"
          style={{
            color: "var(--vb-accent)",
            textShadow: "0 0 12px color-mix(in srgb, var(--vb-accent) 80%, transparent)",
            fontFamily: "monospace",
          }}
        >
          {slide.title.split("|").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </div>
      )}

      {slide.code && (
        <div
          className="text-xs rounded px-2 py-1.5 font-mono"
          style={{ background: "#1a1a35", color: "#88ffaa", border: "1px solid #334" }}
        >
          {slide.code}
        </div>
      )}

      {slide.items?.map((item, i) => {
        const firstSpace = item.indexOf(" ");
        const hasIcon = firstSpace > 0 && (item.codePointAt(0) ?? 0) > 127;
        const icon = hasIcon ? item.slice(0, firstSpace) : "";
        const text = hasIcon ? item.slice(firstSpace + 1) : item;
        return (
          <div key={i} className="flex items-center gap-1.5">
            {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
            <span style={{ color: "#bbaade", fontSize: 10 }}>{text}</span>
          </div>
        );
      })}

      {slide.steps?.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
            style={{ background: "var(--vb-display-border)", fontSize: 8 }}
          >
            {i + 1}
          </div>
          <span style={{ color: "#bbaade", fontSize: 10 }}>{step}</span>
        </div>
      ))}

      {slide.body && (
        <p
          className={`text-xs leading-relaxed${isTitle ? " text-center mt-1" : ""}`}
          style={{ color: isTitle ? "#9977cc" : "#ccc0ee" }}
        >
          {slide.body.split("\n").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </p>
      )}
    </div>
  );
}

type DisplayProps = {
  slides: SlideData[];
  currentSlide: number;
  setCurrentSlide: (n: number) => void;
};

export default function Display({ slides, currentSlide: current, setCurrentSlide: setCurrent }: DisplayProps) {
  const prev = () => setCurrent((current - 1 + slides.length) % slides.length);
  const next = () => setCurrent((current + 1) % slides.length);

  if (slides.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* モニター本体 */}
      <div
        className="relative w-72 h-44 rounded-sm overflow-hidden group"
        style={{
          background: "#0d0d1a",
          border: "3px solid var(--vb-display-border)",
          boxShadow: "0 0 20px color-mix(in srgb, var(--vb-display-border) 50%, transparent), inset 0 0 10px color-mix(in srgb, var(--vb-display-border) 10%, transparent)",
        }}
      >
        {/* スライドコンテンツ */}
        <SlideRenderer slide={slides[current]} />

        {/* 走査線オーバーレイ */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
          }}
        />

        {/* 前へボタン */}
        <button
          onClick={prev}
          className="absolute left-0 top-0 bottom-0 w-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.5), transparent)" }}
          aria-label="前のスライド"
        >
          <span style={{ color: "white", fontSize: 14 }}>‹</span>
        </button>

        {/* 次へボタン */}
        <button
          onClick={next}
          className="absolute right-0 top-0 bottom-0 w-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "linear-gradient(270deg, rgba(0,0,0,0.5), transparent)" }}
          aria-label="次のスライド"
        >
          <span style={{ color: "white", fontSize: 14 }}>›</span>
        </button>

        {/* ページインジケーター */}
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all"
              style={{
                width: i === current ? 12 : 5,
                height: 5,
                background: i === current ? "#4488ff" : "rgba(255,255,255,0.3)",
              }}
              aria-label={`スライド ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* モニタースタンド */}
      <div className="w-10 h-3 rounded-sm" style={{ background: "#334" }} />
      <div className="w-20 h-1.5 rounded" style={{ background: "#445" }} />
    </div>
  );
}
