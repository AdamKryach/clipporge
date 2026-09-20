"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  size?: "sm" | "md" | "lg";
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, variant = "primary", loading, size = "md", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "btn",
          variant === "primary" && "btn-primary",
          variant === "secondary" && "btn-secondary",
          variant === "ghost" && "btn-ghost",
          variant === "danger" && "btn-danger",
          size === "sm" && "px-3 py-1.5 text-xs",
          size === "lg" && "px-6 py-3 text-base",
          className
        )}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  }
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn("input", className)} {...props} />
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn("input", className)} {...props}>
      {children}
    </select>
  )
);

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "rose" | "brand" }) {
  const tones = {
    slate: "border-white/10 bg-white/5 text-slate-300",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    brand: "border-brand-500/30 bg-brand-500/10 text-brand-300",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-3xl">🎬</div>
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export { cn };