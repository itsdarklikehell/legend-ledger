import { useEffect, useRef, useState } from 'preact/hooks';
import { APP_NAME } from '../app-meta';
import type { Hero, Might } from '../types';

interface CharacterSwitcherProps {
  heroes: Hero[];
  activeHeroId: string | null;
  onSelect: (heroId: string) => void;
  onCreate: () => void;
  onManage: () => void;
  triggerLabel?: string;
}

const mightClass = (might: Might) => `might-${might.toLowerCase()}`;

export function CharacterSwitcher({ heroes, activeHeroId, onSelect, onCreate, onManage, triggerLabel }: CharacterSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeHero = heroes.find((item) => item.id === activeHeroId) ?? heroes[0];

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  if (!activeHero) return null;

  return (
    <div class="character-switcher" ref={rootRef}>
      <button
        type="button"
        class="character-switch-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch character"
      >
        <span class="brand-rune">L</span>
        <span class="character-switch-copy">
          <strong>{APP_NAME}</strong>
          <small>{triggerLabel ?? activeHero.name}<span aria-hidden="true">⌄</span></small>
        </span>
      </button>

      {open && (
        <div class="character-switch-popover" role="menu" aria-label="Saved characters">
          <div class="character-switch-heading">
            <div><strong>Characters</strong><small>{heroes.length} saved on this device</small></div>
          </div>
          <div class="character-switch-list">
            {heroes.map((hero) => (
              <button
                type="button"
                class={`character-switch-row ${hero.id === activeHero.id ? 'is-current' : ''}`}
                role="menuitem"
                onClick={() => {
                  onSelect(hero.id);
                  setOpen(false);
                }}
              >
                <span
                  class={`character-avatar ${hero.portrait ? 'has-portrait' : ''}`}
                  style={hero.portrait ? { backgroundImage: `url(${hero.portrait})` } : undefined}
                  aria-hidden="true"
                >{hero.portrait ? '' : hero.name.trim().slice(0, 1).toUpperCase()}</span>
                <span class="character-switch-meta">
                  <strong>{hero.name}</strong>
                  <small>{hero.concept || `${hero.themes.length} themes`}</small>
                  <span class="character-might-dots" aria-hidden="true">
                    {hero.themes.slice(0, 6).map((theme) => <i class={mightClass(theme.might)} />)}
                  </span>
                </span>
                <span class="character-current-mark" aria-hidden="true">{hero.id === activeHero.id ? '✓' : ''}</span>
              </button>
            ))}
          </div>
          <div class="character-switch-actions">
            <button type="button" class="character-create-quick" onClick={() => { setOpen(false); onCreate(); }}><span aria-hidden="true">＋</span> New Hero</button>
            <button type="button" onClick={() => { setOpen(false); onManage(); }}>Manage</button>
          </div>
        </div>
      )}
    </div>
  );
}
