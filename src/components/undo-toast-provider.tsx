"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface UndoToastState {
  title: string;
  // Omitted for a plain status message (e.g. "Copied") with no undo step.
  onUndo?: () => void;
  action?: string;
}

const UndoToastContext = createContext<{
  showUndoToast: (state: UndoToastState) => void;
} | null>(null);

export function UndoToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<UndoToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showUndoToast = useCallback((state: UndoToastState) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(state);
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  return (
    <UndoToastContext.Provider value={{ showUndoToast }}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-2.5 text-sm shadow-lg">
            <span>
              {toast.action ?? "Added"} <span className="font-medium">{toast.title}</span>
            </span>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  setToast(null);
                  if (timerRef.current) clearTimeout(timerRef.current);
                }}
                className="font-semibold text-accent hover:text-accent-hover"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      )}
    </UndoToastContext.Provider>
  );
}

export function useUndoToast() {
  const ctx = useContext(UndoToastContext);
  if (!ctx) {
    throw new Error("useUndoToast must be used within UndoToastProvider");
  }
  return ctx;
}
