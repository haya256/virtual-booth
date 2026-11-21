"use client";

import { useEffect, useState } from "react";

// Booth の設計解像度 (16:9)
export const BOOTH_DESIGN_W = 768;
export const BOOTH_DESIGN_H = 432;

export default function BoothScaler({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      setScale(
        Math.min(
          window.innerWidth / BOOTH_DESIGN_W,
          window.innerHeight / BOOTH_DESIGN_H,
        ),
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1, // 会場背景（.vb-venue の疑似要素）より手前
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: BOOTH_DESIGN_W,
          flexShrink: 0, // 画面が設計幅より狭くても縮めない（縮小は transform で行う）
          transformOrigin: "center center",
          transform: `scale(${scale ?? 0})`,
          transition: scale === null ? "none" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
