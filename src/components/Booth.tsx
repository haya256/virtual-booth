"use client";

import { useState } from "react";
import Display from "./Display";
import Pamphlet from "./Pamphlet";
import Attendant from "./Attendant";
import ChatPanel from "./ChatPanel";

export default function Booth() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="w-full max-w-3xl relative select-none" style={{ paddingBottom: isChatOpen ? 210 : 0 }}>

      {/* ブース背景壁 */}
      <div
        className="rounded-t-2xl px-8 pt-6 pb-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #3d2b79 0%, #2d1b69 50%, #1e1155 100%)",
          border: "2px solid #5544aa",
          borderBottom: "none",
          minHeight: 220,
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
              border: "2px solid #ff6ef7",
              boxShadow: "0 0 15px rgba(255,110,247,0.4), 0 0 30px rgba(255,110,247,0.1)",
            }}
          >
            <h1
              className="text-2xl font-bold tracking-widest"
              style={{
                color: "#ff6ef7",
                textShadow: "0 0 10px rgba(255,110,247,0.8)",
                fontFamily: "monospace",
              }}
            >
              VIRTUAL BOOTH
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#aa88cc" }}>
              AIがあなたの質問にお答えします
            </p>
          </div>
        </div>

        {/* 壁上のコンテンツエリア (ブース背景) */}
        <div className="flex justify-center items-end gap-16 pb-2">
          {/* ディスプレイ置き台 (壁面) */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="text-xs mb-1"
              style={{ color: "#88aaff", letterSpacing: "0.1em" }}
            >
              ── DEMO ──
            </div>
          </div>

          {/* 右側の装飾 */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs" style={{ color: "#8877aa" }}>
              ── INFO ──
            </div>
          </div>
        </div>
      </div>

      {/* 机の上面 */}
      <div
        className="relative px-8 py-5"
        style={{
          background: "linear-gradient(180deg, #8a5a30 0%, #7a4e2d 100%)",
          border: "2px solid #5544aa",
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

        {/* 机の上のアイテム配置 */}
        <div className="relative flex items-end justify-between gap-4">
          {/* 左: ディスプレイ */}
          <div className="flex-shrink-0">
            <Display currentSlide={currentSlide} setCurrentSlide={setCurrentSlide} />
          </div>

          {/* 右: パンフレット + 担当者 */}
          <div className="flex items-end gap-8 pb-1">
            <Pamphlet title="Virtual Booth 紹介資料" />
            <Attendant onChat={() => setIsChatOpen(true)} />
          </div>
        </div>
      </div>

      {/* 机の前面 (厚み表現) */}
      <div
        className="rounded-b-sm"
        style={{
          height: 24,
          background: "linear-gradient(180deg, #5c3a1e 0%, #4a2e18 100%)",
          border: "2px solid #5544aa",
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

      {/* チャットパネル（RPGダイアログ：ブース下部に全幅配置） */}
      {isChatOpen && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20 }}>
          <ChatPanel
            onClose={() => setIsChatOpen(false)}
            setCurrentSlide={setCurrentSlide}
          />
        </div>
      )}
    </div>
  );
}
