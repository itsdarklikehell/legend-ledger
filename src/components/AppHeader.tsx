import { useEffect, useRef, useState } from 'preact/hooks';
import type { Hero } from '../types';
import { CharacterSwitcher } from './CharacterSwitcher';

interface AppHeaderProps {
  heroes: Hero[];
  hero: Hero;
  undoCount: number;
  redoCount: number;
  storageHealthy: boolean;
  onSelectHero: (heroId: string) => void;
  onCreateHero: () => void;
  onManageCharacters: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onStartScene: () => void;
  onStartSession: () => void;
  onOpenCamp: () => void;
  onEditIdentity: () => void;
  onManageFellowship: () => void;
  onOpenPlayReference: () => void;
  onExportHero: () => void;
  onImportHero: () => void;
}

export function AppHeader({
  heroes,
  hero,
  undoCount,
  redoCount,
  storageHealthy,
  onSelectHero,
  onCreateHero,
  onManageCharacters,
  onUndo,
  onRedo,
  onStartScene,
  onStartSession,
  onOpenCamp,
  onEditIdentity,
  onManageFellowship,
  onOpenPlayReference,
  onExportHero,
  onImportHero,
}: AppHeaderProps) {
  const [menuPhase, setMenuPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuCloseTimer = useRef<number | null>(null);
  const menuOpen = menuPhase === 'open';
  const menuMounted = menuPhase !== 'closed';

  const closeMenu = (afterClose?: () => void) => {
    if (menuPhase === 'closed' || menuPhase === 'closing') return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setMenuPhase('closed');
      afterClose?.();
      return;
    }

    setMenuPhase('closing');
    menuCloseTimer.current = window.setTimeout(() => {
      menuCloseTimer.current = null;
      setMenuPhase('closed');
      afterClose?.();
    }, 140);
  };

  useEffect(() => {
    if (!menuMounted) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) closeMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuMounted, menuPhase]);

  useEffect(() => () => {
    if (menuCloseTimer.current !== null) window.clearTimeout(menuCloseTimer.current);
  }, []);

  const runAndClose = (action: () => void) => closeMenu(action);

  return (
    <header class="app-bar minimal-app-bar rail-app-header">
      <CharacterSwitcher
        heroes={heroes}
        activeHeroId={hero.id}
        onSelect={onSelectHero}
        onCreate={onCreateHero}
        onManage={onManageCharacters}
        triggerLabel="Characters"
      />
      <div class="app-actions compact-app-actions">
        <div class="header-history-controls" aria-label="Edit history">
          <button type="button" class="header-undo-button" onClick={onUndo} disabled={undoCount === 0} aria-label="Undo last sheet change" title="Undo last sheet change (Ctrl/Cmd+Z)">
            <span aria-hidden="true">↶</span><em>Undo</em>
          </button>
          <button type="button" class="header-undo-button header-redo-button" onClick={onRedo} disabled={redoCount === 0} aria-label="Redo last undone sheet change" title="Redo last undone sheet change (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)">
            <span aria-hidden="true">↷</span><em>Redo</em>
          </button>
        </div>


        <div class="utility-menu-wrap" ref={menuRef}>
          <button
            type="button"
            class="header-more-button"
            onClick={() => { if (menuMounted) closeMenu(); else setMenuPhase('open'); }}
            aria-label="Hero and table options"
            aria-expanded={menuOpen}
            aria-controls="hero-utility-menu"
            title="Hero and table options"
          >•••</button>

          {menuMounted && (
            <div class={`utility-menu ${menuPhase === 'closing' ? 'is-closing' : ''}`} id="hero-utility-menu">
              <div class="utility-menu-section">
                <span class="utility-menu-label">At the table</span>
                <button type="button" onClick={() => runAndClose(onStartScene)}><span>Start new scene</span><small>Reset scene-use abilities</small></button>
                <button type="button" onClick={() => runAndClose(onStartSession)}><span>Start new session</span><small>Reset scene + session uses</small></button>
                <button type="button" onClick={() => runAndClose(onOpenCamp)}><span>Camp / sojourn</span><small>Rest, reflect, prepare</small></button>
              </div>

              <div class="utility-menu-section">
                <span class="utility-menu-label">Character</span>
                <button type="button" onClick={() => runAndClose(onEditIdentity)}>Edit hero details</button>
                <button type="button" onClick={() => runAndClose(onManageFellowship)}>{hero.fellowship ? 'Manage Fellowship' : 'Add Fellowship'}</button>
                <button type="button" onClick={() => runAndClose(onManageCharacters)}><span>Characters</span><small>Switch, duplicate, or remove Heroes</small></button>
                <button type="button" onClick={() => runAndClose(onCreateHero)}>Create another Hero</button>
              </div>

              <div class="utility-menu-section">
                <span class="utility-menu-label">View</span>
                <button type="button" onClick={() => runAndClose(onOpenPlayReference)}>
                  <span><strong>How to Play reference</strong><small>Actions, reactions & development</small></span>
                </button>
              </div>

              <div class="utility-menu-section">
                <span class="utility-menu-label">Data</span>
                <button type="button" onClick={() => runAndClose(onExportHero)}>Export Hero</button>
                <button type="button" onClick={() => runAndClose(onImportHero)}>Import Hero</button>
              </div>

              <div class="utility-menu-footer">
                <span>{storageHealthy ? 'Saved locally' : 'Local save unavailable'}</span>
                <small>⌘/Ctrl+Z undo · ⇧⌘/Ctrl+Z redo · Esc clears an action</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
