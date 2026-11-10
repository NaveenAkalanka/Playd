"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Typographic stand-in when a title has no poster: initial, title, year. */
function PosterFallback({ title, year }: { title: string; year?: number | null }) {
  const initial = title.trim().match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-br from-surface-2 via-surface to-bg p-2.5">
      <span
        aria-hidden="true"
        className="text-5xl font-black leading-none tracking-tight text-accent/80"
      >
        {initial}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-3 text-xs font-semibold leading-snug text-text">{title}</p>
        {year ? <p className="mt-0.5 text-[10px] tabular-nums text-text-muted">{year}</p> : null}
      </div>
    </div>
  );
}

export function PosterCard({
  title,
  year,
  posterUrl,
  onClick,
  className,
}: {
  title: string;
  year?: number | null;
  posterUrl: string | null;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const interactive = Boolean(onClick);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={title}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.(e as unknown as React.MouseEvent);
              }
            }
          : undefined
      }
      className={cn(
        "group relative aspect-[2/3] select-none overflow-hidden rounded-[6px] bg-surface-2 ring-1 ring-inset ring-white/5 transition-[transform,box-shadow] duration-200 ease-out hover:z-10 hover:scale-105 hover:shadow-[0_14px_32px_-10px_rgba(0,0,0,0.85)] focus-visible:z-10 focus-visible:scale-105",
        interactive ? "cursor-pointer" : "cursor-default",
        className,
      )}
    >
      {posterUrl ? (
        <>
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 34vw, 200px"
            className="object-cover"
          />
          {/* Poster art already carries the title, so on pointer devices the
              caption waits for hover/focus; touch has no hover, so it stays. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-2 pt-8 transition-opacity duration-200 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:opacity-100">
            <p className="truncate text-[11px] font-semibold text-white">{title}</p>
            {year ? <p className="text-[10px] tabular-nums text-white/70">{year}</p> : null}
          </div>
        </>
      ) : (
        <PosterFallback title={title} year={year} />
      )}
    </div>
  );
}
