import * as React from "react";

import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
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
          "bg-[#ff2d55] text-white shadow-[0_8px_30px_rgba(255,45,85,0.3)]",
        variant === "outline" &&
          "border border-black/15 bg-white text-[#1a1a1a]",
        variant === "glow" &&
          "bg-[#111111]/90 text-white shadow-[0_12px_36px_rgba(0,0,0,0.35)]",
        className,
      )}
      {...props}
    />
  );
}
