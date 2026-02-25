type AttendantProps = {
  onChat: () => void;
  name?: string;
};

export default function Attendant({ onChat, name = "AI 担当者" }: AttendantProps) {
  return (
    <button
      onClick={onChat}
      className="flex flex-col items-center gap-1 cursor-pointer group"
      style={{ transition: "transform 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      aria-label={`${name}に話しかける`}
    >
      {/* 吹き出し (ホバー時表示) */}
      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded-full whitespace-nowrap mb-1"
        style={{ background: "#4488ff", color: "white" }}
      >
        話しかける ✨
      </div>

      {/* キャラクター */}
      <div className="relative flex flex-col items-center">
        {/* 頭部 */}
        <div
          className="w-12 h-12 rounded-full relative flex items-center justify-center"
          style={{
            background: "#FDDBB4",
            border: "2px solid #c9956a",
            zIndex: 1,
          }}
        >
          {/* 目 */}
          <div
            className="absolute rounded-full"
            style={{ width: 5, height: 5, background: "#333", top: 16, left: 11 }}
          />
          <div
            className="absolute rounded-full"
            style={{ width: 5, height: 5, background: "#333", top: 16, right: 11 }}
          />
          {/* 口 */}
          <div
            className="absolute"
            style={{
              width: 14,
              height: 6,
              borderBottom: "2px solid #c06060",
              borderRadius: "0 0 50% 50%",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />
        </div>

        {/* 胴体 (スーツ) */}
        <div
          className="w-10 rounded-t-sm relative"
          style={{
            height: 44,
            background: "#2c3e6b",
            marginTop: -2,
          }}
        >
          {/* 白シャツ */}
          <div
            className="absolute"
            style={{
              width: 12,
              top: 0,
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              background: "white",
              borderRadius: "0 0 4px 4px",
            }}
          />
          {/* ネクタイ */}
          <div
            className="absolute"
            style={{
              width: 5,
              height: 20,
              top: 2,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#e05050",
              borderRadius: "0 0 3px 3px",
            }}
          />
        </div>
      </div>

      {/* 名前 */}
      <span className="text-xs font-medium mt-1" style={{ color: "#e2d9ff" }}>
        {name}
      </span>

      {/* クリック促進テキスト */}
      <span
        className="text-xs group-hover:opacity-100 transition-opacity"
        style={{ color: "#8877aa", fontSize: 10 }}
      >
        クリックして質問
      </span>
    </button>
  );
}
