"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

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
        "group relative aspect-[2/3] select-none overflow-hidden rounded-[6px] bg-surface-2 transition-transform duration-200 hover:z-10 hover:scale-105 hover:shadow-xl",
        interactive ? "cursor-pointer" : "cursor-default",
        className,
      )}
    >
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt={title}
          fill
          sizes="200px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-text-muted">
          {title}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1.5 pt-6">
        <p className="truncate text-[11px] font-medium text-white">{title}</p>
        {year ? <p className="text-[10px] text-white/70">{year}</p> : null}
      </div>
    </div>
  );
}
