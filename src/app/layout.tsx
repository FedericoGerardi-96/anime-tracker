import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";

//@ts-ignore
import "./globals.css";

import Topbar from "@/components/shared/Topbar";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const themeBootstrap = `(function(){var name='${THEME_COOKIE}';var cookie=document.cookie.split('; ').find(function(item){return item.indexOf(name+'=')===0});if(cookie&&(cookie.endsWith('=dark')||cookie.endsWith('=light')))return;var saved;try{saved=localStorage.getItem(name)}catch(e){}var theme=saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',theme==='dark');document.cookie=name+'='+theme+'; Max-Age=31536000; Path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'')})();`;

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
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value) ?? 'dark';
  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : ''} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className={`${inter.variable} font-display antialiased bg-background text-foreground`}>
        <ToastProvider>
          <LibrarySyncProvider>
          <Suspense fallback={<TopbarFallback />}>
            <Topbar initialTheme={theme} />
          </Suspense>
          <main className="min-h-[calc(100vh-4rem)] pb-16">
            {children}
          </main>
          </LibrarySyncProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
