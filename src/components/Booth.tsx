"use client";

import { useState } from "react";
import Display from "./Display";
import Pamphlet from "./Pamphlet";
import Attendant from "./Attendant";
import ChatPanel from "./ChatPanel";

type BoothProps = { title: string; subtitle: string };

export default function Booth({ title, subtitle }: BoothProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="w-full max-w-3xl relative select-none">

      {/* ブース背景壁 */}
      <div
        className="rounded-t-2xl px-8 pt-6 pb-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--vb-wall-start) 0%, var(--vb-wall-mid) 50%, var(--vb-wall-end) 100%)",
          border: "2px solid var(--vb-border)",
          borderBottom: "none",
          minHeight: 100,
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
        <div className="flex justify-center mb-6 relative">
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
              <p className="text-xs mt-0.5" style={{ color: "var(--vb-text-secondary)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* 机の上面 */}
      <div
        className="relative px-8 pt-6"
        style={{
          background: "linear-gradient(180deg, var(--vb-desk-top) 0%, var(--vb-desk-bottom) 100%)",
          border: "2px solid var(--vb-border)",
          borderTop: "4px solid #a06030",
          borderBottom: "none",
          minHeight: 380,
          paddingBottom: 24,
        }}
      >
        {/* 机の上の木目テクスチャ */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "repeating-linear-gradient(88deg, transparent, transparent 15px, rgba(0,0,0,0.15) 15px, rgba(0,0,0,0.15) 16px)",
          }}
        />

        {/* 机の上のアイテム配置 */}
        <div className="relative flex items-start justify-between gap-4">
          {/* 左: ディスプレイ */}
          <div className="flex-shrink-0">
            <Display currentSlide={currentSlide} setCurrentSlide={setCurrentSlide} />
          </div>

          {/* 右: パンフレット + 担当者 */}
          <div className="flex items-end gap-8 pb-1">
            <Pamphlet title="パンフレット" />
            <Attendant onChat={() => setIsChatOpen(true)} />
          </div>
        </div>

        {/* チャットパネル（机の下部に配置） */}
        {isChatOpen && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
            <ChatPanel
              onClose={() => setIsChatOpen(false)}
              setCurrentSlide={setCurrentSlide}
            />
          </div>
        )}
      </div>

      {/* 机の前面 (厚み表現) */}
      <div
        className="rounded-b-sm"
        style={{
          height: 24,
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
          height: 8,
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
