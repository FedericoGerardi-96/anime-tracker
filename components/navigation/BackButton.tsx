
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  label: string;
  fallback: string;
  className?: string;
}

export default function BackButton({ label, fallback, className }: BackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If the referrer is from our own domain, we can safely go back
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button 
      onClick={handleBack}
      className={className || "hover:text-primary transition-colors cursor-pointer"}
    >
      {label}
    </button>
  );
}
