"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AuthTabs() {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <div className="flex bg-muted p-1 rounded-xl mb-8">
      <Link 
        href="/login"
        className={`
          flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all
          ${isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}
        `}
      >
        Login
      </Link>
      <Link 
        href="/register"
        className={`
          flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all
          ${isLogin ? "text-muted-foreground hover:text-foreground" : "bg-card text-foreground shadow-sm"}
        `}
      >
        Register
      </Link>
    </div>
  );
}
