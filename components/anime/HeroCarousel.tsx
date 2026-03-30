"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const imageUrl = item.images.webp.large_image_url || item.images.jpg.large_image_url;

  return (
    <section className="relative w-full h-[350px] sm:h-[420px] rounded-2xl overflow-hidden group glass">
      {/* Blurred background layer — intentionally blurred so low-res doesn't matter */}
      {anime.map((a, i) => (
        <div
          key={a.mal_id}
          className="absolute inset-0 bg-cover bg-center blur-3xl scale-110 opacity-30 transition-opacity duration-700"
          style={{
            backgroundImage: `url('${a.images.webp.large_image_url || a.images.jpg.large_image_url}')`,
            opacity: i === current ? 0.3 : 0,
          }}
        />
      ))}

      {/* Cinematic gradient overlay left-to-right */}
      <div className="absolute inset-0 bg-linear-to-r from-background-dark via-background-dark/80 to-background-dark/30" />
      {/* Bottom fade */}
      <div className="absolute inset-0 bg-linear-to-t from-background-dark/60 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex items-center px-6 sm:px-10 lg:px-12 gap-8 lg:gap-12">
        {/* Left: text */}
        <div className="flex-1 space-y-4 z-10 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-primary px-3 py-1 rounded-md text-xs font-bold text-white uppercase tracking-wider shadow-lg shadow-primary/20">
              Upcoming Season
            </span>
            {item.type && (
              <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-md text-xs font-bold text-slate-300 uppercase">
                {item.type}
              </span>
            )}
            {item.score && (
              <span className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/20 px-3 py-1 rounded-md text-xs font-bold text-yellow-400">
                ★ {item.score.toFixed(1)}
              </span>
            )}
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight line-clamp-2">
            {item.title_english || item.title}
          </h2>

          {item.synopsis && (
            <p className="text-sm sm:text-base text-slate-400 line-clamp-2 sm:line-clamp-3 leading-relaxed">
              {item.synopsis}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Link href={`/anime/${item.mal_id}-${slugify(item.title_english || item.title)}`}>
              <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 sm:px-8 rounded-xl font-bold flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-primary/25">
                <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                View Details
              </button>
            </Link>
          </div>
        </div>

        {/* Right: poster image at native size */}
        <div className="hidden md:block relative h-[300px] sm:h-[340px] lg:h-[370px] aspect-[2/3] shrink-0 z-10">
          {/* Glow behind poster */}
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-2xl transform scale-90 translate-y-4" />
          <Image
            key={imageUrl}
            src={imageUrl}
            alt={item.title_english || item.title}
            fill
            className="object-cover rounded-2xl border border-white/10 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 0px, 240px"
            priority
          />
        </div>
      </div>

      {/* Arrows */}
      {anime.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </>
      )}

      {/* Dots */}
      {anime.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {anime.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "bg-primary w-6" : "bg-white/30 w-1.5"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
