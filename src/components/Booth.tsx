"use client";

import { useState, useEffect } from "react";
import Display from "./Display";
import Pamphlet from "./Pamphlet";
import Attendant from "./Attendant";
import ChatPanel from "./ChatPanel";

type BoothProps = { title: string; subtitle: string; attendantSVG?: string; attendantName?: string };

// 壁・机の高さ定数 (px)
// WALL_H + DESK_H + DESK_FRONT_H + SHADOW_H = 432 = 768 * 9/16 → 16:9 設計比率
const WALL_H = 261;
const DESK_H = 139;
const DESK_FRONT_H = 24;
const SHADOW_H = 8;

// 担当者の縦位置: 小さい値=上、大きい値=下 (attendant.svg のサイズ変更時は要調整)
const ATTENDANT_TOP = 46;

export default function Booth({ title, subtitle, attendantSVG, attendantName = "AI 担当者" }: BoothProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsChatOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    // relative: チャットパネルの absolute 基準
    <div className="w-full max-w-3xl relative select-none">

      {/* 壁・机・各アイテムの配置コンテナ */}
      <div className="relative" style={{ height: WALL_H + DESK_H }}>

        {/* ── 壁（最背面） ── */}
        <div
          className="absolute inset-x-0 top-0 rounded-t-2xl overflow-hidden"
          style={{
            height: WALL_H,
            background: "linear-gradient(160deg, var(--vb-wall-start) 0%, var(--vb-wall-mid) 50%, var(--vb-wall-end) 100%)",
            border: "2px solid var(--vb-border)",
            borderBottom: "none",
          }}
        >
          {/* 壁の格子模様 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* ブース名看板 */}
          <div className="flex justify-center pt-3 relative">
            <div
              className="px-8 py-2 rounded-md text-center relative"
              style={{
                background: "#1a0f40",
                border: "2px solid var(--vb-accent)",
                boxShadow: "0 0 15px color-mix(in srgb, var(--vb-accent) 40%, transparent), 0 0 30px color-mix(in srgb, var(--vb-accent) 10%, transparent)",
              }}
            >
              <h1
                className="text-2xl font-bold tracking-widest"
                style={{
                  color: "var(--vb-accent)",
                  textShadow: "0 0 10px color-mix(in srgb, var(--vb-accent) 80%, transparent)",
                  fontFamily: "monospace",
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <div style={{ overflow: "hidden", marginTop: 2, textAlign: "left" }}>
                  <span style={{
                    display: "inline-block",
                    paddingLeft: "100%",
                    whiteSpace: "nowrap",
                    color: "var(--vb-text-secondary)",
                    fontSize: 11,
                    fontFamily: "monospace",
                    letterSpacing: "0.05em",
                    animation: "vb-marquee 20s linear infinite",
                  }}>
                    {subtitle}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 机の上面（z=2: 担当者の下半身を隠すカウンター） ── */}
        <div
          className="absolute inset-x-0"
          style={{
            top: WALL_H,
            height: DESK_H,
            zIndex: 2,
            background: "linear-gradient(180deg, var(--vb-desk-top) 0%, var(--vb-desk-bottom) 100%)",
            border: "2px solid var(--vb-border)",
            borderTop: "4px solid #a06030",
            borderBottom: "none",
          }}
        >
          {/* 机の上の木目テクスチャ */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: "repeating-linear-gradient(88deg, transparent, transparent 15px, rgba(0,0,0,0.15) 15px, rgba(0,0,0,0.15) 16px)",
            }}
          />
        </div>

        {/* ── AI担当者 本体（z=1: 机の背面） ── */}
        <div
          style={{
            position: "absolute",
            top: ATTENDANT_TOP,
            left: "62%",
            transform: "translateX(-50%)",
            zIndex: 1,
          }}
        >
          <Attendant onChat={() => setIsChatOpen(true)} svg={attendantSVG} hideLabel />
        </div>

        {/* ── AI担当者 ラベル（z=3: 机の前面） ── */}
        <div
          style={{
            position: "absolute",
            top: WALL_H + 8,
            left: "62%",
            transform: "translateX(-50%)",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            cursor: "pointer",
          }}
          onClick={() => setIsChatOpen(true)}
        >
          <span style={{ color: "#e2d9ff", fontSize: 12, fontWeight: 500 }}>{attendantName}</span>
          <span style={{ color: "#8877aa", fontSize: 10 }}>クリックして質問</span>
        </div>

        {/* ── ディスプレイ（z=3: 机の左、画面が壁面に突出） ── */}
        {/* 机にめり込むよう top を机面より下に設定 (zIndex:3 で机前面に表示) */}
        <div
          style={{
            position: "absolute",
            top: WALL_H - 163,
            left: 40,
            zIndex: 3,
          }}
        >
          <Display currentSlide={currentSlide} setCurrentSlide={setCurrentSlide} />
        </div>

        {/* ── パンフレット（z=3: 机の右端） ── */}
        {/* 机にめり込むよう top を机面より下に設定 (zIndex:3 で机前面に表示) */}
        <div
          style={{
            position: "absolute",
            top: WALL_H - 90,
            right: 66,
            zIndex: 3,
          }}
        >
          <Pamphlet title="パンフレット" />
        </div>

      </div>

      {/* 机の前面 (厚み表現) */}
      <div
        className="rounded-b-sm"
        style={{
          height: DESK_FRONT_H,
          background: "linear-gradient(180deg, var(--vb-desk-front-top) 0%, var(--vb-desk-front-bottom) 100%)",
          border: "2px solid var(--vb-border)",
          borderTop: "none",
          boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
        }}
      />

      {/* 床の影 */}
      <div
        className="mx-4 rounded-b-full"
        style={{
          height: SHADOW_H,
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)",
        }}
      />

      {/* ── チャットパネル（机前面+影の分だけ上に配置） ── */}
      {isChatOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
          }}
        >
          <ChatPanel
            onClose={() => setIsChatOpen(false)}
            setCurrentSlide={setCurrentSlide}
            attendantName={attendantName}
          />
        </div>
      )}
    </div>
  );
}
