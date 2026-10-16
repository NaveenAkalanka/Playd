"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const HOLD_MS = 1300;
const FADE_MS = 450;

/** Netflix-style splash: the mark zooms in with a glow, holds, then fades to reveal the app. */
export function IntroAnimation() {
  const [stage, setStage] = useState<"playing" | "fading" | "done">("playing");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setStage("fading"), HOLD_MS);
    const doneTimer = setTimeout(() => setStage("done"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (stage === "done") return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-bg",
        stage === "fading" && "animate-intro-fade-out",
      )}
    >
      <Image
        src="/icon-mark.svg"
        alt=""
        width={547}
        height={550}
        priority
        className="h-20 w-auto animate-intro-zoom sm:h-24"
      />
    </div>
  );
}
