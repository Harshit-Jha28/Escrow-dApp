"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "info" | "error";
}

const variants = {
  default: "border-[#333] bg-[#1a1a1a] text-[#a1a1a1]",
  success: "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]",
  warning: "border-[#eab308]/30 bg-[#eab308]/10 text-[#eab308]",
  info: "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
  error: "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]",
};

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
