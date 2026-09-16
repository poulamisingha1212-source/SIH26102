import { motion } from "motion/react"
import { cn } from "@/lib/utils"

// Magic UI BorderBeam — a light beam travelling along a container's border.
export function BorderBeam({
  className,
  size = 60,
  duration = 7,
  delay = 0,
  colorFrom = "#6366f1",
  colorTo = "#38bdf8",
  reverse = false,
}) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn(
          "absolute aspect-square bg-gradient-to-l from-transparent via-(--color-via) to-transparent",
          className
        )}
        style={{
          width: size,
          "--color-via": colorFrom,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
        }}
        animate={{
          offsetDistance: reverse ? ["100%", "0%"] : ["0%", "100%"],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
        }}
      />
      <motion.div
        className={cn(
          "absolute aspect-square bg-gradient-to-l from-transparent via-(--color-via) to-transparent",
          className
        )}
        style={{
          width: size,
          "--color-via": colorTo,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
        }}
        animate={{
          offsetDistance: reverse ? ["0%", "100%"] : ["100%", "0%"],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
        }}
      />
    </div>
  )
}
