import { useEffect, useRef, useState } from 'preact/hooks';

interface QuickEditProps {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  className?: string;
  placeholder?: string;
  allowEmpty?: boolean;
}

export function QuickEdit({ value, onCommit, label, className = '', placeholder, allowEmpty = false }: QuickEditProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = (save: boolean) => {
    if (save) {
      const next = draft.trim();
      if ((allowEmpty || next) && next !== value) onCommit(next);
    } else {
      setDraft(value);
    }
    setOpen(false);
  };

  return (
    <span class={`quick-edit ${open ? 'is-open' : ''} ${className}`}>
      <button type="button" class="quick-edit-trigger" onClick={() => { setDraft(value); setOpen(true); }} aria-label={label} title={label}>✎</button>
      {open && (
        <span class="quick-edit-popover">
          <input
            ref={inputRef}
            value={draft}
            placeholder={placeholder}
            onInput={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); close(true); }
              if (event.key === 'Escape') { event.preventDefault(); close(false); }
            }}
            onBlur={() => close(true)}
          />
        </span>
      )}
    </span>
  );
}
