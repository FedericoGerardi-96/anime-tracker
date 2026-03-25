import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/shared/Sidebar";
import Topbar from "@/components/shared/Topbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | AniTrack",
    default: "AniTrack - Your Ultimate Anime & Manga Tracker",
  },
  description: "Track your favorite anime, manga, and characters with AniTrack. Private vault, progress tracking, and personalized lists.",
  keywords: ["anime", "manga", "tracker", "anitrack", "watchlist", "favorites"],
};

import { ToastProvider } from "@/components/ui/Toast";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className={`${inter.variable} font-display antialiased text-text-primary bg-deep-navy`}>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 h-full overflow-y-auto flex flex-col relative">
              <Suspense fallback={<div className="h-20 w-full bg-deep-navy/80 backdrop-blur-md border-b border-white/5 z-40" />}>
                <Topbar />
              </Suspense>
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
