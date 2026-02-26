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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: BOOTH_DESIGN_W,
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
