import { useEffect, useRef } from 'preact/hooks';
import { HowToPlayGuide } from './HowToPlayGuide';
import { useDismissTransition } from '../hooks/useDismissTransition';

export function HowToPlayDialog({ onClose: commitClose }: { onClose: () => void }) {
  const { closing, dismiss: onClose } = useDismissTransition(commitClose);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => closeButton.current?.focus());

    const onDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCloseRef.current();
        return;
      }

      // The reference is intentionally read-only; keep keyboard focus on its
      // single close control instead of allowing Tab to slip behind the modal.
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };

    document.body.classList.add('has-play-reference-open');
    window.addEventListener('keydown', onDialogKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onDialogKeyDown, true);
      document.body.classList.remove('has-play-reference-open');
      previousFocus.current?.focus();
    };
  }, []);

  return (
    <div
      class={`play-reference-overlay ${closing ? 'is-closing' : ''}`}
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div class="play-reference-dialog" role="dialog" aria-modal="true" aria-labelledby="how-to-play-title">
        <button ref={closeButton} type="button" class="play-reference-close" onClick={onClose} aria-label="Close How to Play reference" title="Close reference">×</button>
        <HowToPlayGuide />
      </div>
    </div>
  );
}
