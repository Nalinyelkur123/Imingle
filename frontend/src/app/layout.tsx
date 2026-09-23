import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Umingle | Chat with Strangers Instantly",
  description:
    "Ready to meet new people? Umingle connects you with strangers for instant text or video chat based on your interests. Start chatting now!",
  keywords: ["umingle", "video chat", "chat with strangers", "random video chat", "meet people"],
};

import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
