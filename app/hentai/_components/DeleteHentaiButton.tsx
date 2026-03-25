"use client";

import { useState } from "react";
import { deleteHentaiEntry } from "@/lib/actions/hentai";
import { useToast } from "@/components/ui/Toast";

interface DeleteHentaiButtonProps {
  id: string;
}

export default function DeleteHentaiButton({ id }: DeleteHentaiButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { success, error } = useToast();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to remove this from your Vault?")) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteHentaiEntry(id);
    
    if (result.error) {
      error("Failed to delete entry: " + result.error);
    } else {
      success("Entry successfully removed from your Vault.");
    }
    
    setIsDeleting(false);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="absolute top-4 right-4 group/delete z-20 cursor-pointer disabled:cursor-not-allowed"
      title="Remove from Vault"
    >
      <div className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg transition-all hover:bg-red-500 hover:text-white">
        {isDeleting ? (
          <span className="material-symbols-outlined text-xl animate-spin">
            progress_activity
          </span>
        ) : (
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            delete
          </span>
        )}
      </div>
    </button>
  );
}
