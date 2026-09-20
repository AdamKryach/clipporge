"use client";

import { createContext, useContext, useCallback, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(Ctx).toast;

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto animate-slide-up rounded-xl border px-4 py-3 text-sm shadow-card backdrop-blur",
              t.kind === "success" && "border-emerald-500/30 bg-emerald-950/80 text-emerald-100",
              t.kind === "error" && "border-rose-500/30 bg-rose-950/80 text-rose-100",
              t.kind === "info" && "border-brand-500/30 bg-surface-800/90 text-slate-100"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}