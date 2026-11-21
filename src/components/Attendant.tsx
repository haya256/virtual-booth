export type AttendantState = "idle" | "thinking" | "talking";

type AttendantProps = {
  onChat: () => void;
  name?: string;
  svg?: string;
  state?: AttendantState;
};

/**
 * AI担当者のキャラクター。
 * ラッパーに data-state（idle / thinking / talking）が付くので、
 * globals.css や content/skin.css から状態ごとのアニメーションを当てられる。
 */
export default function Attendant({ onChat, name = "AI 担当者", svg, state = "idle" }: AttendantProps) {
  return (
    <button
      onClick={onChat}
      className="vb-attendant block cursor-pointer"
      data-state={state}
      style={{ transition: "transform 0.2s", transformOrigin: "50% 100%" }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      aria-label={`${name}に話しかける`}
    >
      <div className="vb-attendant-figure">
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} style={{ lineHeight: 0 }} />
        ) : (
          <DefaultCharacter />
        )}
      </div>
    </button>
  );
}

/** attendant.svg が無いときの既定キャラクター */
function DefaultCharacter() {
  return (
    <div className="relative flex flex-col items-center">
      {/* 頭部 */}
      <div
        className="w-12 h-12 rounded-full relative flex items-center justify-center"
        style={{ background: "#FDDBB4", border: "2px solid #c9956a", zIndex: 1 }}
      >
        {/* 目 */}
        <div className="absolute rounded-full" style={{ width: 5, height: 5, background: "#333", top: 16, left: 11 }} />
        <div className="absolute rounded-full" style={{ width: 5, height: 5, background: "#333", top: 16, right: 11 }} />
        {/* 口 */}
        <div
          className="absolute"
          style={{ width: 14, height: 6, bottom: 10, left: "50%", marginLeft: -7 }}
        >
          <div
            className="vb-attendant-mouth"
            style={{ width: "100%", height: "100%", borderBottom: "2px solid #c06060", borderRadius: "0 0 50% 50%" }}
          />
        </div>
      </div>

      {/* 胴体 (スーツ) */}
      <div className="w-10 rounded-t-sm relative" style={{ height: 44, background: "#2c3e6b", marginTop: -2 }}>
        {/* 白シャツ */}
        <div
          className="absolute"
          style={{ width: 12, top: 0, bottom: 0, left: "50%", transform: "translateX(-50%)", background: "white", borderRadius: "0 0 4px 4px" }}
        />
        {/* ネクタイ */}
        <div
          className="absolute"
          style={{ width: 5, height: 20, top: 2, left: "50%", transform: "translateX(-50%)", background: "#e05050", borderRadius: "0 0 3px 3px" }}
        />
      </div>
    </div>
  );
}
