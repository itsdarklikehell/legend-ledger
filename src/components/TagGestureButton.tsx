import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import type { Polarity } from '../types';

interface TagGestureButtonProps {
  tagId: string;
  normalPolarity: Exclude<Polarity, 'unused'>;
  oppositePolarity: Exclude<Polarity, 'unused'>;
  onInvoke?: (tagId: string, polarity: Exclude<Polarity, 'unused'>) => void;
  className?: string;
  disabled?: boolean;
  draggable?: boolean;
  onDragStart?: (event: any) => void;
  onDragEnd?: (event: any) => void;
  title?: string;
  ariaLabel?: string;
  children: ComponentChildren;
}

/**
 * Keeps the printed tag row free of extra buttons while still exposing both
 * polarities on mouse, keyboard-assisted desktop play, and touch screens.
 *
 * - tap/click: normal polarity
 * - Shift/Alt + click: opposite polarity
 * - right click: opposite polarity
 * - touch/pen hold: opposite polarity
 */
export function TagGestureButton({
  tagId,
  normalPolarity,
  oppositePolarity,
  onInvoke,
  className = '',
  disabled = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  title,
  ariaLabel,
  children,
}: TagGestureButtonProps) {
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const suppressContextUntil = useRef(0);

  const clearHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdStart.current = null;
  };

  const invokeOpposite = () => {
    if (disabled) return;
    onInvoke?.(tagId, oppositePolarity);
  };

  return (
    <button
      type="button"
      class={`gesture-tag-button ${className}`}
      disabled={disabled}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={title}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          event.preventDefault();
          return;
        }
        const opposite = event.shiftKey || event.altKey;
        onInvoke?.(tagId, opposite ? oppositePolarity : normalPolarity);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        if (Date.now() < suppressContextUntil.current) return;
        invokeOpposite();
      }}
      onPointerDown={(event) => {
        if (disabled || event.pointerType === 'mouse') return;
        clearHold();
        suppressClick.current = false;
        holdStart.current = { x: event.clientX, y: event.clientY };
        holdTimer.current = window.setTimeout(() => {
          holdTimer.current = null;
          suppressClick.current = true;
          suppressContextUntil.current = Date.now() + 900;
          invokeOpposite();
        }, 430);
      }}
      onPointerMove={(event) => {
        const start = holdStart.current;
        if (!start || holdTimer.current === null) return;
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) clearHold();
      }}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onPointerLeave={clearHold}
    >
      {children}
    </button>
  );
}
