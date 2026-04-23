import { useEffect, useState } from "react";

export function useDelayedFlag(active: boolean, delayMs = 1200) {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!active) {
      setDelayed(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDelayed(true);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [active, delayMs]);

  return delayed;
}
