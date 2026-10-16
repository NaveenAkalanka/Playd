"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function TitleListRow({
  title,
  year,
  posterUrl,
  onClick,
}: {
  title: string;
  year?: number | null;
  posterUrl: string | null;
  onClick?: () => void;
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
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2",
        interactive ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[4px] bg-surface-2">
        {posterUrl && (
          <Image src={posterUrl} alt={title} fill sizes="40px" className="object-cover" />
        )}
      </div>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
      {year ? <p className="shrink-0 text-xs text-text-muted">{year}</p> : null}
    </div>
  );
}
