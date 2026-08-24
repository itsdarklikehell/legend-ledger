import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

export type ToolLink = {
  id: string;
  name: string;
  href: string;
  description?: string;
  external?: boolean;
};

interface OtherToolsMenuProps {
  tools: readonly ToolLink[];
  currentId?: string;
  label?: string;
  menuLabel?: string;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
}

export function OtherToolsMenu({
  tools,
  currentId,
  label = 'Other tools',
  menuLabel = 'Other tabletop tools',
  placement = 'top-end',
}: OtherToolsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const visibleTools = useMemo(
    () => tools.filter((tool) => tool.id !== currentId),
    [tools, currentId],
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (visibleTools.length === 0) return null;

  return (
    <div
      ref={rootRef}
      class="other-tools-menu"
      data-open={open ? '' : undefined}
      data-placement={placement}
    >
      <button
        ref={triggerRef}
        type="button"
        class="other-tools-menu__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <span aria-hidden="true">⌃</span>
      </button>

      {open && (
        <nav class="other-tools-menu__panel" aria-label={menuLabel}>
          <p class="other-tools-menu__eyebrow">From the same workbench</p>
          <ul class="other-tools-menu__list">
            {visibleTools.map((tool) => (
              <li key={tool.id} class="other-tools-menu__item">
                <a
                  class="other-tools-menu__link"
                  href={tool.href}
                  target={tool.external ? '_blank' : undefined}
                  rel={tool.external ? 'noreferrer' : undefined}
                >
                  <span class="other-tools-menu__copy">
                    <strong>{tool.name}</strong>
                    {tool.description && <small>{tool.description}</small>}
                  </span>
                  {tool.external && <span class="other-tools-menu__external" aria-hidden="true">↗</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
