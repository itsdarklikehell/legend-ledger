import { useMemo, useState } from 'preact/hooks';
import type { Hero, Might } from '../types';
import { useDismissTransition } from '../hooks/useDismissTransition';

interface CharacterLibraryDrawerProps {
  heroes: Hero[];
  activeHeroId: string | null;
  onSelect: (heroId: string) => void;
  onCreate: () => void;
  onImport: () => void;
  onDuplicate: (heroId: string) => void;
  onExport: (hero: Hero) => void;
  onDelete: (heroId: string) => void;
  onClose: () => void;
}

const mightClass = (might: Might) => `might-${might.toLowerCase()}`;

export function CharacterLibraryDrawer({ heroes, activeHeroId, onSelect, onCreate, onImport, onDuplicate, onExport, onDelete, onClose: commitClose }: CharacterLibraryDrawerProps) {
  const { closing, dismiss: onClose } = useDismissTransition(commitClose);
  const [query, setQuery] = useState('');
  const visibleHeroes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return heroes;
    return heroes.filter((hero) => `${hero.name} ${hero.concept}`.toLowerCase().includes(needle));
  }, [heroes, query]);

  const removeHero = (hero: Hero) => {
    if (!window.confirm(`Remove ${hero.name} from this device? Export first if you want a backup.`)) return;
    onDelete(hero.id);
  };

  return (
    <div class={`drawer-backdrop ${closing ? 'is-closing' : ''}`} role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside class="sheet-drawer character-library-drawer has-structured-scroll" role="dialog" aria-modal="true" aria-labelledby="character-library-title">
        <header class="drawer-header character-library-header">
          <div><p class="eyebrow">Local library</p><h2 id="character-library-title">Characters</h2><small>Switch quickly. Every Hero is saved independently in this browser.</small></div>
          <button type="button" class="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div class="drawer-scroll-region">
        <section class="character-library-toolbar">
          <button type="button" class="button primary" onClick={onCreate}>＋ New Hero</button>
          <button type="button" class="button secondary" onClick={onImport}>Import</button>
          {heroes.length > 4 && <input type="search" value={query} onInput={(event) => setQuery(event.currentTarget.value)} placeholder="Find a character…" aria-label="Find a character" />}
        </section>

        <section class="character-library-grid">
          {visibleHeroes.map((hero) => {
            const current = hero.id === activeHeroId;
            return (
              <article class={`character-library-card ${current ? 'is-current' : ''}`}>
                <button
                  type="button"
                  class="character-library-open"
                  onClick={() => { onSelect(hero.id); onClose(); }}
                  aria-label={`Open ${hero.name}`}
                >
                  <span
                    class={`character-library-portrait ${hero.portrait ? 'has-portrait' : ''}`}
                    style={hero.portrait ? { backgroundImage: `url(${hero.portrait})` } : undefined}
                    aria-hidden="true"
                  >{hero.portrait ? '' : hero.name.trim().slice(0, 1).toUpperCase()}</span>
                  <span class="character-library-copy">
                    <span class="character-library-name-line"><strong>{hero.name}</strong>{current && <em>Current</em>}</span>
                    <small>{hero.concept || 'No concept yet'}</small>
                    <span class="character-library-facts">
                      <span>{hero.themes.length} themes</span><span>Promise {hero.promise}/5</span>
                    </span>
                    <span class="character-might-dots" aria-hidden="true">
                      {hero.themes.slice(0, 8).map((theme) => <i class={mightClass(theme.might)} />)}
                    </span>
                  </span>
                </button>
                <div class="character-library-actions">
                  <button type="button" onClick={() => onDuplicate(hero.id)}>Duplicate</button>
                  <button type="button" onClick={() => onExport(hero)}>Export</button>
                  <button type="button" class="danger-text" onClick={() => removeHero(hero)}>Remove</button>
                </div>
              </article>
            );
          })}
          {visibleHeroes.length === 0 && <div class="character-library-empty">No characters match “{query}”.</div>}
        </section>
        </div>
      </aside>
    </div>
  );
}
