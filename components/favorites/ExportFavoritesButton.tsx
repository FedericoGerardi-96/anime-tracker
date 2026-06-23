"use client";

import React, { useTransition } from "react";
import * as XLSX from "xlsx";
import { exportFavoritesAction } from "@/lib/actions/media";

export default function ExportFavoritesButton() {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      try {
        const data = await exportFavoritesAction();
        if (!data || data.length === 0) {
          alert("You have no favorites to export.");
          return;
        }

        // Create a worksheet
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Create a workbook and append worksheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Favorites");

        // Auto-fit column widths
        const colWidths = Object.keys(data[0]).map((key) => {
          const maxLen = data.reduce((max, row: any) => {
            const val = String(row[key] || "");
            return Math.max(max, val.length);
          }, key.length);
          return { wch: Math.min(Math.max(maxLen, 10), 50) };
        });
        worksheet["!cols"] = colWidths;

        // Trigger file download
        XLSX.writeFile(workbook, "my_favorites.xlsx");
      } catch (err) {
        console.error("Failed to export favorites to Excel:", err);
        alert("An error occurred while exporting your favorites.");
      }
    });
  };

  return (
    <button
      onClick={handleExport}
      disabled={isPending}
      className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <span
        className={`material-symbols-outlined ${isPending ? "animate-spin" : ""}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {isPending ? "sync" : "table_chart"}
      </span>
      <span className="uppercase text-xs tracking-widest">
        {isPending ? "Exporting..." : "Export to Excel"}
      </span>
    </button>
  );
}
