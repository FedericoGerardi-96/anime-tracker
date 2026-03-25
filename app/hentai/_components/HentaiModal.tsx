"use client";

import { createHentaiEntry } from "@/lib/actions/hentai";
import { useToast } from "@/components/ui/Toast";
import { useState, useRef } from "react";

interface HentaiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HentaiModal({ isOpen, onClose }: HentaiModalProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const result = await createHentaiEntry(formData);
    setLoading(false);

    if (result.error) {
      error(result.error);
    } else {
      success("Entry saved successfully to your vault.");
      formRef.current?.reset();
      onClose();
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="glass-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10 bg-slate-900/90 backdrop-blur-xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">security</span>
              New Vault Entry
            </h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
              Add private content to your collection
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <form ref={formRef} action={handleSubmit} className="space-y-8">
            {/* Basic Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Title</label>
                <input
                  name="title"
                  required
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl p-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="Enter title..."
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Type</label>
                <div className="relative">
                  <select
                    name="type"
                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl p-4 text-white appearance-none focus:ring-2 focus:ring-primary/50 outline-none transition-all cursor-pointer"
                  >
                    <option value="anime">Anime</option>
                    <option value="doujin">Doujin/Manga</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Image URL Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Image URL</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                  link
                </span>
                <input
                  name="image"
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl p-4 pl-12 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  placeholder="https://image-host.com/cover.jpg"
                  type="text"
                />
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Description</label>
              <textarea
                name="description"
                className="custom-scrollbar w-full bg-slate-900/50 border border-white/5 rounded-xl p-4 text-white placeholder:text-slate-600 resize-none focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                placeholder="Add a brief description..."
                rows={4}
              ></textarea>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end pt-6 gap-4">
              <button
                className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                type="submit"
                disabled={loading}
              >
                <span className="material-symbols-outlined text-sm">
                  {loading ? "sync" : "save"}
                </span>
                {loading ? "Saving..." : "Save to Vault"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
