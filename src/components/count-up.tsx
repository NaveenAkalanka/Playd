"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 1100;

// Counts from 0 to `value` the first time it scrolls into view. Until then
// (server render, no JS, hidden tab panels) it shows the real value, so the
// page never displays placeholder zeros. After the first run it just follows
// `value` without re-animating.
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const finished = useRef(false);
  // null = show `value` as-is; a number = mid-animation.
  const [animated, setAnimated] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || finished.current) return;

    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / DURATION_MS, 1);
        if (t >= 1) {
          finished.current = true;
          setAnimated(null);
          return;
        }
        setAnimated(Math.round(value * (1 - Math.pow(1 - t, 3))));
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{(animated ?? value).toLocaleString()}</span>;
}
