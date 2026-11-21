"use client";

import { useState, useEffect, useCallback } from "react";
import Display from "./Display";
import Pamphlet from "./Pamphlet";
import Attendant, { AttendantState } from "./Attendant";
import ChatPanel from "./ChatPanel";
import { SlideData } from "@/lib/slides";

type BoothProps = {
  title: string;
  subtitle: string;
  slides: SlideData[];
  attendantSVG?: string;
  attendantName?: string;
  suggestedQuestions?: string[];
};

// 壁・机の高さ定数 (px)
// WALL_H + DESK_H + DESK_FRONT_H + SHADOW_H = 432 = 768 * 9/16 → 16:9 設計比率
const WALL_H = 261;
const DESK_H = 139;
const DESK_FRONT_H = 24;
const SHADOW_H = 8;

// 担当者の縦位置: 小さい値=上、大きい値=下 (attendant.svg のサイズ変更時は要調整)
const ATTENDANT_TOP = 96;
// 担当者の横位置 (ブース幅に対する中心の割合)
const ATTENDANT_LEFT = "62%";

// スポットライト: 横位置(px)・傾き・幅
const SPOTLIGHTS = [
  { left: 204, angle: "-3deg", width: 230 },
  { left: 476, angle: "1deg", width: 190 },
  { left: 662, angle: "4deg", width: 150 },
];

export default function Booth({
  title,
  subtitle,
  slides,
  attendantSVG,
  attendantName = "AI 担当者",
  suggestedQuestions = [],
}: BoothProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [attendantState, setAttendantState] = useState<AttendantState>("idle");

  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setAttendantState("idle");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeChat]);

  return (
    // relative: チャットパネルの absolute 基準
    <div className="vb-booth w-full max-w-3xl relative select-none">

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
            boxShadow: "0 0 60px color-mix(in srgb, var(--vb-wall-mid) 70%, transparent)",
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

          {/* スポットライトの光 */}
          {SPOTLIGHTS.map((spot) => (
            <div
              key={spot.left}
              className="absolute pointer-events-none"
              style={{ top: 0, left: spot.left - spot.width / 2, width: spot.width, height: WALL_H }}
            >
              <div
                className="vb-spotlight w-full h-full"
                style={{
                  ["--vb-spot-angle" as string]: spot.angle,
                  background: "linear-gradient(180deg, var(--vb-spot) 0%, color-mix(in srgb, var(--vb-spot) 45%, transparent) 55%, transparent 100%)",
                  clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
                  filter: "blur(5px)",
                }}
              />
            </div>
          ))}

          {/* 照明レール */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{ height: 5, background: "linear-gradient(180deg, #0a0818, #1a1630)", boxShadow: "0 1px 0 rgba(255,255,255,0.06)" }}
          />
          {SPOTLIGHTS.map((spot) => (
            <div
              key={spot.left}
              className="absolute pointer-events-none"
              style={{
                top: 3,
                left: spot.left - 9,
                width: 18,
                height: 7,
                borderRadius: "0 0 6px 6px",
                background: "#0d0b1c",
                boxShadow: "0 3px 8px 1px var(--vb-spot)",
              }}
            />
          ))}

          {/* 机との境目の陰 */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{ height: 70, background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.38))" }}
          />

          {/* ブース名看板 */}
          <div className="flex justify-center pt-2 relative">
            <div
              className="px-8 py-2 rounded-md text-center relative"
              style={{
                maxWidth: 420,
                background: "var(--vb-sign-bg)",
                border: "2px solid var(--vb-accent)",
                boxShadow:
                  "0 0 15px color-mix(in srgb, var(--vb-accent) 40%, transparent), 0 0 34px color-mix(in srgb, var(--vb-accent) 14%, transparent), inset 0 0 12px color-mix(in srgb, var(--vb-accent) 12%, transparent)",
              }}
            >
              <h1
                className="vb-neon text-2xl font-bold tracking-widest"
                style={{
                  color: "var(--vb-accent)",
                  textShadow:
                    "0 0 6px color-mix(in srgb, var(--vb-accent) 90%, transparent), 0 0 18px color-mix(in srgb, var(--vb-accent) 55%, transparent)",
                  fontFamily: "var(--vb-font-dialog)",
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
                    fontFamily: "var(--vb-font-dialog)",
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
          className="absolute inset-x-0 overflow-hidden"
          style={{
            top: WALL_H,
            height: DESK_H,
            zIndex: 2,
            background: "linear-gradient(180deg, var(--vb-desk-top) 0%, var(--vb-desk-bottom) 100%)",
            border: "2px solid var(--vb-border)",
            borderTop: "4px solid var(--vb-desk-edge)",
            borderBottom: "none",
          }}
        >
          {/* 机の上の木目テクスチャ */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(88deg, transparent, transparent 15px, rgba(0,0,0,0.15) 15px, rgba(0,0,0,0.15) 16px), repeating-linear-gradient(91deg, transparent, transparent 43px, rgba(255,255,255,0.12) 43px, rgba(255,255,255,0.12) 44px)",
            }}
          />
          {/* 奥の縁のハイライトと、手前に向かう陰影 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 14%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.22) 100%)",
            }}
          />
          {/* ディスプレイの光の映り込み */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: 40,
              top: 18,
              width: 330,
              height: 70,
              background: "radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--vb-display-border) 38%, transparent) 0%, transparent 70%)",
              mixBlendMode: "screen",
            }}
          />
        </div>

        {/* ── AI担当者 本体（z=1: 机の背面） ── */}
        <div
          style={{
            position: "absolute",
            top: ATTENDANT_TOP,
            left: ATTENDANT_LEFT,
            transform: "translateX(-50%)",
            zIndex: 1,
          }}
        >
          <Attendant onChat={openChat} name={attendantName} svg={attendantSVG} state={attendantState} />
        </div>

        {/* ── 声かけの吹き出し（会話を始めるまで表示） ── */}
        {!isChatOpen && (
          <button
            onClick={openChat}
            className="vb-bubble"
            style={{
              position: "absolute",
              top: 112,
              left: "calc(62% + 68px)",
              zIndex: 3,
              padding: "6px 12px 7px",
              borderRadius: 12,
              background: "var(--vb-text-primary)",
              color: "var(--vb-sign-bg)",
              fontFamily: "var(--vb-font-dialog)",
              fontSize: 12,
              lineHeight: 1.35,
              textAlign: "left",
              whiteSpace: "nowrap",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            }}
          >
            ご質問をどうぞ！
            {/* しっぽ */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: -6,
                bottom: 8,
                width: 12,
                height: 12,
                background: "var(--vb-text-primary)",
                transform: "rotate(45deg)",
                borderRadius: 2,
              }}
            />
          </button>
        )}

        {/* ── AI担当者 ラベル（z=3: 机の前面。会話中は会話ウィンドウに名前が出るので隠す） ── */}
        <div
          style={{
            visibility: isChatOpen ? "hidden" : "visible",
            position: "absolute",
            top: WALL_H + 8,
            left: ATTENDANT_LEFT,
            transform: "translateX(-50%)",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            cursor: "pointer",
            textShadow: "0 1px 3px rgba(0,0,0,0.7)",
          }}
          onClick={openChat}
        >
          <span style={{ color: "var(--vb-text-primary)", fontSize: 12, fontWeight: 500 }}>{attendantName}</span>
          <span style={{ color: "var(--vb-text-secondary)", fontSize: 10, opacity: 0.8 }}>クリックして質問</span>
        </div>

        {/* ── ディスプレイ（z=3: 机の左、画面が壁面に突出） ── */}
        {/* 机にめり込むよう top を机面より下に設定 (zIndex:3 で机前面に表示) */}
        <div
          style={{
            position: "absolute",
            top: WALL_H - 171,
            left: 55,
            zIndex: 3,
          }}
        >
          <Display slides={slides} currentSlide={currentSlide} setCurrentSlide={setCurrentSlide} />
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
        className="rounded-b-sm relative overflow-hidden"
        style={{
          height: DESK_FRONT_H,
          background: "linear-gradient(180deg, var(--vb-desk-front-top) 0%, var(--vb-desk-front-bottom) 100%)",
          border: "2px solid var(--vb-border)",
          borderTop: "none",
          boxShadow: "0 8px 20px rgba(0,0,0,0.6)",
        }}
      >
        {/* 天板の縁の光 */}
        <div className="absolute inset-x-0 top-0" style={{ height: 1, background: "rgba(255,255,255,0.18)" }} />
        {/* アクセントのLEDライン */}
        <div
          className="absolute inset-x-6"
          style={{
            top: 11,
            height: 2,
            borderRadius: 2,
            background: "var(--vb-accent)",
            opacity: 0.75,
            boxShadow: "0 0 8px 1px color-mix(in srgb, var(--vb-accent) 70%, transparent)",
          }}
        />
      </div>

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
            onClose={closeChat}
            setCurrentSlide={setCurrentSlide}
            slideCount={slides.length}
            attendantName={attendantName}
            suggestedQuestions={suggestedQuestions}
            onStateChange={setAttendantState}
          />
        </div>
      )}
    </div>
  );
}
