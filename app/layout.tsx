import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/shared/Sidebar";
import Topbar from "@/components/shared/Topbar";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AniTrack - Dashboard",
  description: "Track your journey",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    profile = data;
  }

  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className={`${inter.variable} font-display antialiased text-text-primary bg-deep-navy`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar user={user} profile={profile} />
          <main className="flex-1 h-full overflow-y-auto flex flex-col relative">
            <Suspense fallback={<div className="h-20 w-full bg-deep-navy/80 backdrop-blur-md border-b border-white/5 z-40" />}>
              <Topbar user={user} profile={profile} />
            </Suspense>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
