"use client";

import { useState } from "react";
import HentaiModal from "./HentaiModal";

export default function HentaiActions() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          add_circle
        </span>
        <span className="uppercase text-xs tracking-widest">Add New Entry</span>
      </button>

      <HentaiModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
