"use client";

const slides = [
  // スライド 1: タイトル
  {
    content: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3"
        style={{ background: "linear-gradient(135deg, #1a0f40 0%, #2d1b69 100%)" }}>
        <div className="text-xs tracking-widest" style={{ color: "#c8a0f0" }}>WELCOME TO</div>
        <div
          className="text-lg font-black tracking-widest text-center leading-tight"
          style={{ color: "#ff6ef7", textShadow: "0 0 12px rgba(255,110,247,0.8)", fontFamily: "monospace" }}
        >
          VIRTUAL<br />BOOTH
        </div>
        <div className="text-xs text-center mt-1" style={{ color: "#9977cc" }}>
          AIが対応する<br />オンラインブース
        </div>
      </div>
    ),
  },
  // スライド 2: 概要
  {
    content: (
      <div className="w-full h-full flex flex-col justify-center gap-2 p-4"
        style={{ background: "#0d0d1f" }}>
        <div className="text-xs font-bold tracking-wider mb-1" style={{ color: "#4488ff" }}>
          WHAT IS THIS?
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#ccc0ee" }}>
          イベントブースを<br />
          Webで再現する<br />
          オープンソースの<br />
          プラットフォームです。
        </p>
        <div className="w-8 h-0.5 rounded" style={{ background: "#4488ff" }} />
      </div>
    ),
  },
  // スライド 3: 特徴
  {
    content: (
      <div className="w-full h-full flex flex-col justify-center gap-1.5 p-3"
        style={{ background: "#0a0a1f" }}>
        <div className="text-xs font-bold tracking-wider mb-0.5" style={{ color: "#4488ff" }}>
          FEATURES
        </div>
        {[
          { icon: "🤖", text: "AIがリアルタイムで質問対応" },
          { icon: "📝", text: "guide.md を書き換えるだけ" },
          { icon: "🖥️", text: "ブースを忠実に再現" },
          { icon: "⚡", text: "ストリーミング応答対応" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-1.5">
            <span style={{ fontSize: 10 }}>{item.icon}</span>
            <span className="text-xs" style={{ color: "#bbaade", fontSize: 10 }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  // スライド 4: カスタマイズ
  {
    content: (
      <div className="w-full h-full flex flex-col justify-center gap-2 p-3"
        style={{ background: "#0d0d1f" }}>
        <div className="text-xs font-bold tracking-wider" style={{ color: "#4488ff" }}>
          CUSTOMIZE
        </div>
        <div
          className="text-xs rounded px-2 py-1.5 font-mono"
          style={{ background: "#1a1a35", color: "#88ffaa", border: "1px solid #334" }}
        >
          content/guide.md
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#bbaade", fontSize: 10 }}>
          このファイルを書き換えるだけで<br />
          AIの知識・口調・対応内容を<br />
          自由にカスタマイズできます。
        </p>
      </div>
    ),
  },
  // スライド 5: 使い方
  {
    content: (
      <div className="w-full h-full flex flex-col justify-center gap-2 p-3"
        style={{ background: "#0a0a1f" }}>
        <div className="text-xs font-bold tracking-wider mb-0.5" style={{ color: "#4488ff" }}>
          GET STARTED
        </div>
        {[
          { n: "1", label: "リポジトリをクローン" },
          { n: "2", label: "guide.md を編集" },
          { n: "3", label: "APIキーを設定" },
          { n: "4", label: "デプロイして公開！" },
        ].map((step) => (
          <div key={step.n} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
              style={{ background: "#4455cc", fontSize: 8 }}
            >
              {step.n}
            </div>
            <span style={{ color: "#bbaade", fontSize: 10 }}>{step.label}</span>
          </div>
        ))}
      </div>
    ),
  },
];

type DisplayProps = {
  currentSlide: number;
  setCurrentSlide: (n: number) => void;
};

export default function Display({ currentSlide: current, setCurrentSlide: setCurrent }: DisplayProps) {

  const prev = () => setCurrent((current - 1 + slides.length) % slides.length);
  const next = () => setCurrent((current + 1) % slides.length);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* モニター本体 */}
      <div
        className="relative w-56 h-36 rounded-sm overflow-hidden group"
        style={{
          background: "#0d0d1a",
          border: "3px solid #4488ff",
          boxShadow: "0 0 20px rgba(68,136,255,0.5), inset 0 0 10px rgba(68,136,255,0.1)",
        }}
      >
        {/* スライドコンテンツ */}
        {slides[current].content}

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
      <div className="w-8 h-3 rounded-sm" style={{ background: "#334" }} />
      <div className="w-16 h-1.5 rounded" style={{ background: "#445" }} />
    </div>
  );
}
