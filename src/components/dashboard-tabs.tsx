"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Panels are rendered on the server and passed in as nodes; this only
// switches which one is visible.
export function DashboardTabs({
  tabs,
}: {
  tabs: { key: string; label: string; icon?: React.ReactNode; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <div className="space-y-8">
      <div
        role="tablist"
        className="flex w-full gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1 md:w-fit"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors md:flex-none md:px-5",
              active === t.key
                ? "bg-accent text-white shadow-[0_0_20px_-4px_var(--accent)]"
                : "text-text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          hidden={active !== t.key}
          className="animate-fade-up"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
