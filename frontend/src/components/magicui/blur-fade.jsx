import { useRef } from "react"
import { motion, useInView } from "motion/react"
import { cn } from "@/lib/utils"

// Magic UI BlurFade — fade + de-blur entrance for lists and cards.
export function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  offset = 8,
  blur = "4px",
  ...props
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "0px" })
  return (
    <motion.div
      ref={ref}
      initial={{ y: offset, opacity: 0, filter: `blur(${blur})` }}
      animate={inView ? { y: 0, opacity: 1, filter: "blur(0px)" } : {}}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
