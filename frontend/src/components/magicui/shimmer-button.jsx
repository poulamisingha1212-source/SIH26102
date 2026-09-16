import React from "react"
import { cn } from "@/lib/utils"

// Magic UI ShimmerButton — conic-gradient shimmer sweeping a solid button.
export function ShimmerButton({
  shimmerColor = "rgb(165 180 252 / 85%)",
  shimmerSize = "0.06em",
  shimmerDuration = "3.2s",
  borderRadius = "100px",
  background = "rgba(79, 70, 229, 0.92)",
  className,
  children,
  ...props
}) {
  return (
    <button
      style={{
        "--spread": "90deg",
        "--shimmer-color": shimmerColor,
        "--radius": borderRadius,
        "--speed": shimmerDuration,
        "--cut": shimmerSize,
        "--bg": background,
      }}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-5 py-2 text-white",
        "[background:var(--bg)] [border-radius:var(--radius)]",
        "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
        className
      )}
      {...props}
    >
      {/* shimmer sweep layer */}
      <div
        className={cn(
          "-z-30 blur-[2px]",
          "absolute inset-0 overflow-visible [container-size:var] [container-type:size]"
        )}
      >
        <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [mask:none]">
          <div className="absolute -inset-full w-auto rotate-0 animate-spin-around [background:conic-gradient(from_transparent_25%,var(--shimmer-color),transparent_50%)] [mask:linear-gradient(to_left,transparent_50%,black)]" />
        </div>
      </div>
      {children}
      {/* inner glow */}
      <div
        className={cn(
          "absolute inset-0 size-full rounded-2xl px-4 py-1.5 text-xs font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",
          "transform-gpu transition-all duration-300 ease-in-out",
          "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
          "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
        )}
      />
      {/* cut-out background */}
      <div className="absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]" />
    </button>
  )
}
