import type { Metadata } from "next";
import { Geist, Geist_Mono, DotGothic16 } from "next/font/google";
import { readFileSync } from "fs";
import { join } from "path";
import "./globals.css";

function getSkinCSS(): string {
  try {
    return readFileSync(join(process.cwd(), "content", "skin.css"), "utf-8");
  } catch {
    return "";
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 看板・会話ウィンドウ用の日本語ドットフォント（--vb-font-dialog から参照）
const dotGothic = DotGothic16({
  variable: "--font-dot",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "バーチャルブース",
  description: "AIアシスタントがご質問にお答えするバーチャルブースです",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const skinCSS = getSkinCSS();
  // --font-dot は :root の --vb-font-dialog から参照するため、body ではなく html に付ける
  return (
    <html lang="ja" className={dotGothic.variable} suppressHydrationWarning>
      <head>
        {skinCSS && <style dangerouslySetInnerHTML={{ __html: skinCSS }} />}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
