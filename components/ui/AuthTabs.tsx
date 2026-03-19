"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AuthTabs() {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <div className="flex bg-slate-950/40 p-1 rounded-xl mb-8">
      <Link 
        href="/login"
        className={`
          flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all
          ${isLogin ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}
        `}
      >
        Login
      </Link>
      <Link 
        href="/register"
        className={`
          flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all
          ${!isLogin ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}
        `}
      >
        Register
      </Link>
    </div>
  );
}
