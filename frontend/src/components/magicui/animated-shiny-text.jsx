import React from "react"
import { cn } from "@/lib/utils"

// Magic UI AnimatedShinyText — a light sweep across label text.
// The gradient spans 250% so the base colour always paints every glyph;
// only the bright band sweeps across (fixed: with a 100% band most text
// was transparent and invisible between sweeps).
export function AnimatedShinyText({ children, className, shimmerWidth = 100, baseColor = "#94a3b8", shinyColor = "#e0e7ff" }) {
  return (
    <p
      style={{
        "--shiny-width": `${shimmerWidth}px`,
        "--base-color": baseColor,
        "--shiny-color": shinyColor,
      }}
      className={cn(
        "max-w-full text-pretty animate-shiny-text bg-clip-text text-transparent",
        "[--bg:linear-gradient(110deg,var(--base-color),40%,var(--shiny-color),50%,var(--base-color))]",
        "[background-image:var(--bg)] [background-size:250%_100%] [background-position:0_0] [background-repeat:no-repeat]",
        className
      )}
    >
      {children}
    </p>
  )
}
