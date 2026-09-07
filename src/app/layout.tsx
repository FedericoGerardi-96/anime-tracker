import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

//@ts-ignore
import "./globals.css";

import Topbar from "@/components/shared/Topbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | AniTrack",
    default: "AniTrack - Seguí tus animes y mangas favoritos",
  },
  description: "Seguí tus animes y mangas favoritos con AniTrack: progreso, listas personalizadas y sincronización con MyAnimeList.",
  keywords: ["anime", "manga", "tracker", "anitrack", "watchlist", "favorites"],
};

import { ToastProvider } from "@/components/ui/Toast";
import { TopbarFallback } from "@/components/fallbacks/TopbarFallback";

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
      <body className={`${inter.variable} font-display antialiased bg-background text-foreground`}>
        <ToastProvider>
          <Suspense fallback={<TopbarFallback />}>
            <Topbar />
          </Suspense>
          <main className="min-h-[calc(100vh-4rem)] pb-16">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
