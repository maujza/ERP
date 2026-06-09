import * as React from "react";

import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "glow";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        variant === "default" &&
          "bg-[#ffd7fb] text-[#4660bc] shadow-[0_8px_30px_rgba(255,215,251,0.5)]",
        variant === "outline" &&
          "border border-[#9595db]/50 bg-white/70 text-[#4660bc] backdrop-blur-sm",
        variant === "glow" &&
          "bg-[#4660bc]/90 text-white shadow-[0_12px_36px_rgba(149,149,219,0.45)]",
        className,
      )}
      {...props}
    />
  );
}
