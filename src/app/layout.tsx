import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  return (
    <html lang="ja" suppressHydrationWarning>
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
