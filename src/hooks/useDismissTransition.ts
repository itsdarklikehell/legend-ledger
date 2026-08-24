import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const prefersReducedMotion = () => typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Keeps an overlay mounted just long enough for its paper/backdrop exit motion.
 * The parent still owns the actual open state, so this can be reused by every
 * drawer and modal without changing their data flow.
 */
export function useDismissTransition(onDismiss: () => void, duration = 240) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    if (prefersReducedMotion()) {
      dismissRef.current();
      return;
    }

    closingRef.current = true;
    setClosing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      dismissRef.current();
    }, duration);
  }, [duration]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return { closing, dismiss };
}
