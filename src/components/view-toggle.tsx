"use client";

import { List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/use-view-mode";

const sizes: { mode: ViewMode; label: string }[] = [
  { mode: "sm", label: "S" },
  { mode: "md", label: "M" },
  { mode: "lg", label: "L" },
];

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-1">
      {sizes.map((size) => (
        <button
          key={size.mode}
          type="button"
          onClick={() => onChange(size.mode)}
          aria-label={`${size.label === "S" ? "Small" : size.label === "M" ? "Medium" : "Large"} cards`}
          className={cn(
            "size-6 rounded-sm text-xs font-semibold transition-colors",
            mode === size.mode
              ? "bg-accent text-white"
              : "text-text-muted hover:text-foreground",
          )}
        >
          {size.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        className={cn(
          "flex size-6 items-center justify-center rounded-sm transition-colors",
          mode === "list"
            ? "bg-accent text-white"
            : "text-text-muted hover:text-foreground",
        )}
      >
        <List className="size-3.5" />
      </button>
    </div>
  );
}
