type PamphletProps = {
  title?: string;
  pdfSrc?: string;
};

export default function Pamphlet({
  title = "製品パンフレット",
  pdfSrc = "/pamphlet",
}: PamphletProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <a
        href={pdfSrc}
        target="_blank"
        rel="noopener noreferrer"
        className="relative group block"
        style={{ transform: "rotate(-3deg)", transition: "transform 0.2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "rotate(0deg) scale(1.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "rotate(-3deg)")}
      >
        {/* パンフレット本体 */}
        <div
          className="w-20 h-28 rounded-sm relative overflow-hidden"
          style={{
            background: "white",
            boxShadow: "2px 2px 6px rgba(0,0,0,0.4)",
            border: "1px solid #ddd",
          }}
        >
          {/* サムネイル */}
          <iframe
            src="/pamphlet"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 794,
              height: 1123,
              transform: `scale(${80 / 794})`,
              transformOrigin: "top left",
              border: "none",
              pointerEvents: "none",
            }}
            scrolling="no"
          />

          {/* ホバーオーバーレイ */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <span className="text-white text-xs font-bold text-center leading-tight">
              開く
            </span>
          </div>
        </div>
      </a>

      <span className="text-xs text-center leading-tight" style={{ color: "#c8b9e8" }}>
        {title}
      </span>
    </div>
  );
}
