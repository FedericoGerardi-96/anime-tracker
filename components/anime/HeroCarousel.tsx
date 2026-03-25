"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { JikanAnime } from "@/types/jikan";
import { slugify } from "@/lib/utils";

interface HeroCarouselProps {
  anime: JikanAnime[];
}

export default function HeroCarousel({ anime: rawAnime }: HeroCarouselProps) {
  const anime = rawAnime.filter((a, i, arr) => arr.findIndex(b => b.mal_id === a.mal_id) === i);
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent(prev => (prev + 1) % anime.length), [anime.length]);
  const prev = useCallback(() => setCurrent(prev => (prev - 1 + anime.length) % anime.length), [anime.length]);

  useEffect(() => {
    if (anime.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [anime.length, next]);

  if (!anime.length) return null;

  const item = anime[current];

  return (
    <section className="relative w-full h-[350px] sm:h-[400px] rounded-2xl overflow-hidden group">
      {anime.map((a, i) => (
        <div
          key={a.mal_id}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{
            backgroundImage: `url('${a.images.webp.large_image_url || a.images.jpg.large_image_url}')`,
            opacity: i === current ? 1 : 0,
          }}
        />
      ))}

      {/* Dark overlay to ensure text readability on bright images */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-linear-to-t from-background-dark via-background-dark/60 to-transparent" />

      <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 space-y-3 sm:space-y-4 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="bg-primary px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">
            Upcoming Season
          </span>
          {item.type && (
            <span className="bg-white/10 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase">
              {item.type}
            </span>
          )}
          {item.score && (
            <span className="bg-yellow-500/20 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-yellow-400 uppercase">
              ★ {item.score.toFixed(1)}
            </span>
          )}
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight line-clamp-2">
          {item.title_english || item.title}
        </h2>

        {item.synopsis && (
          <p className="text-sm sm:text-base text-slate-300 line-clamp-2">
            {item.synopsis}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
          <Link href={`/anime/${item.mal_id}-${slugify(item.title_english || item.title)}`}>
            <button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all transform hover:translate-y-[-2px]">
              <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
              <span>View Details</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Arrows */}
      {anime.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </>
      )}

      {/* Dots */}
      {anime.length > 1 && (
        <div className="absolute bottom-5 right-6 flex gap-1.5">
          {anime.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "bg-primary w-6" : "bg-white/40 w-1.5"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
