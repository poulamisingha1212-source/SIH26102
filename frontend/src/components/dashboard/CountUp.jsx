import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to `value` once the component mounts (or when the
 * value changes), with an ease-out curve — used for dashboard hero metrics.
 */
export default function useCountUp(value, duration = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number(value) || 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return display;
}

export function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-IN'), className }) {
  const display = useCountUp(value);
  return <span className={className}>{format(display)}</span>;
}
