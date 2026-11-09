import { materialSymbolNames } from "@/lib/material-symbols";
import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Manrope, Barlow_Condensed } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";

import ThemeListener from "@/components/settings/ThemeListener";
import Topbar from "@/components/shared/Topbar";
import { parseTheme, resolveTheme, THEME_COOKIE } from "@/lib/theme";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["600", "700"] });

const themeBootstrap = `(function(){var n='anitrack-theme';var c=document.cookie.split('; ').find(function(v){return v.indexOf(n+'=')===0});var p=c?c.slice(n.length+1):null;if(!p){try{p=localStorage.getItem(n)}catch(e){}}if(p==='dark')p='aurora-nocturna';if(p==='light')p='aurora-clara';if(['aurora-nocturna','aurora-clara','estreno','auto'].indexOf(p)<0)p='aurora-nocturna';var t=p==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'aurora-nocturna':'aurora-clara'):p;var h=document.documentElement;h.dataset.themePreference=p;h.dataset.theme=t;h.classList.toggle('dark',t!=='aurora-clara')})();`;

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
import { LibrarySyncProvider } from "@/components/favorites/LibrarySync";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value) ?? 'aurora-nocturna';
  const resolvedTheme = resolveTheme(theme);
  return (
    <html lang="es" data-theme={resolvedTheme} data-theme-preference={theme} className={resolvedTheme !== 'aurora-clara' ? 'dark' : ''} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0..1&icon_names=${materialSymbolNames}&display=block`} rel="stylesheet"/>
      </head>
      <body className={`${manrope.variable} ${barlow.variable} font-display antialiased bg-background text-foreground`}>
        <ThemeListener />
        <ToastProvider>
          <LibrarySyncProvider>
          <Suspense fallback={<TopbarFallback />}>
            <Topbar />
          </Suspense>
          <main className="page-frame min-h-[calc(100vh-4rem)] pb-16">
            {children}
          </main>
          </LibrarySyncProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
