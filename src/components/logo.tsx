import { cn } from "@/lib/utils";

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
          <path d="M4 8l6-4v16l-6-4V8z" fill="white" />
          <rect x="12" y="5" width="8" height="3" rx="1.5" fill="white" opacity="0.9" />
          <rect x="12" y="11" width="8" height="3" rx="1.5" fill="white" opacity="0.6" />
          <rect x="12" y="17" width="8" height="3" rx="1.5" fill="white" opacity="0.35" />
        </svg>
      </div>
      <span className={cn("text-lg font-bold tracking-tight", dark ? "text-white" : "text-slate-100")}>
        Clip<span className="text-brand-400">Forge</span>
      </span>
    </div>
  );
}