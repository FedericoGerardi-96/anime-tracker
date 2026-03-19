import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
  forgotLink?: string;
}

export default function Input({ label, icon, error, forgotLink, ...props }: InputProps) {
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between items-center ml-1">
        {label && (
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        {forgotLink && (
          <a className="text-xs font-semibold text-primary hover:underline" href={forgotLink}>
            Forgot?
          </a>
        )}
      </div>
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
            {icon}
          </span>
        )}
        <input 
          className={`
            w-full bg-slate-dark/50 border-white/5 border rounded-xl py-3 
            ${icon ? "pl-12" : "pl-4"} pr-4 text-sm 
            focus:ring-1 focus:ring-primary focus:bg-slate-dark/80 
            transition-all outline-none text-white placeholder:text-slate-600
            ${error ? "border-red-500" : "border-white/5"}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
    </div>
  );
}
