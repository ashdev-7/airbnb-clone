"use client";

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export type ToastApi = { show: (message: string) => void };

export const ToastContext = createContext<ToastApi | null>(null);

/** Provisional: no capture shows how long a toast stays (plan §6.14, capture E3). */
const VISIBLE_MS = 4000;

type Toast = { id: number; message: string };

/**
 * One toast at a time, bottom left, with the surface measured in capture E4. A new
 * message replaces the one on screen.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback((message: string) => {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-[60px] left-8 z-[2002] max-w-[calc(100vw-64px)]"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-control border border-line bg-white px-4 py-3.5 text-sm leading-[18px] shadow-toast"
          >
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
