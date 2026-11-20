"use client";
import { useState } from "react";

import HentaiModal from "./HentaiModal";

export default function HentaiActions({ sourceAnimes = [] }: { sourceAnimes?: string[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          add_circle
        </span>
        <span className="text-sm">Agregar título</span>
      </button>

      {isModalOpen && <HentaiModal
        isOpen={isModalOpen}
        sourceAnimes={sourceAnimes}
        onClose={() => setIsModalOpen(false)}
      />}
    </>
  );
}
