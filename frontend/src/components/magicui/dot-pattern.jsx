import React from "react"
import { cn } from "@/lib/utils"

// Magic UI DotPattern — subtle dotted texture for hero surfaces.
export function DotPattern({
  width = 20,
  height = 20,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  ...props
}) {
  const id = React.useId()
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 flex h-full w-full fill-slate-300",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
        >
          <circle cx={cx} cy={cy} r={cr} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  )
}
