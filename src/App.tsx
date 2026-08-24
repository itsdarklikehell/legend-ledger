import { useEffect, useRef, useState } from 'preact/hooks';
import type { ActionChoiceMap, ActionStatusMap, Hero, Polarity } from './types';
import {
  addChronicle,
  clampTrack,
  emptyTheme,
  improvementValueOfTheme,
  improveTrackLimit,
  legacyThemeRecord,
  markImprove,
  resetAbilityUses,
  uid,
} from './lib/rules';
import {
  downloadHero,
  loadHeroLibrary,
  readHeroFile,
  saveHeroLibrary,
} from './lib/storage';
import { makeDemoHero } from './data/seed';
import { CreateHero } from './components/CreateHero';
import { HeroSheet } from './components/HeroSheet';
import { DevelopmentDialog } from './components/DevelopmentDialog';
import { FulfillmentDialog } from './components/FulfillmentDialog';
import { ThemeManager } from './components/ThemeManager';
import { JourneyDrawer } from './components/JourneyDrawer';
import { IdentityDrawer } from './components/IdentityDrawer';
import { FellowshipDrawer } from './components/FellowshipDrawer';
import { CampDrawer } from './components/CampDrawer';
import { CharacterLibraryDrawer } from './components/CharacterLibraryDrawer';
import { AppHeader } from './components/AppHeader';
import { APP_NAME } from './app-meta';
import { HowToPlayDialog } from './components/HowToPlayDialog';

interface DevelopmentState {
  themeId: string;
  track: 'abandon' | 'improve' | 'milestone' | 'special';
}

export function App() {
  const [library, setLibrary] = useState(() => loadHeroLibrary());
  const hero = library.heroes.find((item) => item.id === library.activeHeroId) ?? library.heroes[0] ?? null;
  const [creating, setCreating] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [development, setDevelopment] = useState<DevelopmentState | null>(null);
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false);
  const [reforgeBase, setReforgeBase] = useState<Hero | null>(null);
  const [successorBase, setSuccessorBase] = useState<Hero | null>(null);
  const [actionChoices, setActionChoices] = useState<ActionChoiceMap>({});
  const [actionStatuses, setActionStatuses] = useState<ActionStatusMap>({});
  const [importError, setImportError] = useState('');
  const [themeManagerId, setThemeManagerId] = useState<string | null>(null);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [fellowshipOpen, setFellowshipOpen] = useState(false);
  const [campOpen, setCampOpen] = useState(false);
  const [characterLibraryOpen, setCharacterLibraryOpen] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [playReferenceOpen, setPlayReferenceOpen] = useState(false);
  const [storageHealthy, setStorageHealthy] = useState(true);
  const undoStack = useRef<Hero[]>([]);
  const redoStack = useRef<Hero[]>([]);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStorageHealthy(saveHeroLibrary(library.heroes, library.activeHeroId));
  }, [library]);

  useEffect(() => {
    if (!importError) return;
    const timeout = window.setTimeout(() => setImportError(''), 4800);
    return () => window.clearTimeout(timeout);
  }, [importError]);

  const clearUndoHistory = () => {
    undoStack.current = [];
    redoStack.current = [];
    setUndoCount(0);
    setRedoCount(0);
  };

  const changeHero = (next: Hero) => {
    if (hero) {
      undoStack.current = [...undoStack.current.slice(-39), hero];
      setUndoCount(undoStack.current.length);
    }
    redoStack.current = [];
    setRedoCount(0);
    setLibrary((current) => {
      const exists = current.heroes.some((item) => item.id === next.id);
      const heroes = exists ? current.heroes.map((item) => item.id === next.id ? next : item) : [...current.heroes, next];
      return { heroes, activeHeroId: next.id };
    });
  };

  const undoHero = () => {
    const previous = undoStack.current.pop();
    if (!previous || !hero) return;
    redoStack.current = [...redoStack.current.slice(-39), hero];
    setLibrary((current) => ({
      ...current,
      heroes: current.heroes.map((item) => item.id === previous.id ? previous : item),
      activeHeroId: previous.id,
    }));
    setUndoCount(undoStack.current.length);
    setRedoCount(redoStack.current.length);
    setActionChoices({});
    setActionStatuses({});
  };

  const redoHero = () => {
    const next = redoStack.current.pop();
    if (!next || !hero) return;
    undoStack.current = [...undoStack.current.slice(-39), hero];
    setLibrary((current) => ({
      ...current,
      heroes: current.heroes.map((item) => item.id === next.id ? next : item),
      activeHeroId: next.id,
    }));
    setUndoCount(undoStack.current.length);
    setRedoCount(redoStack.current.length);
    setActionChoices({});
    setActionStatuses({});
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing = Boolean(target?.matches('input, textarea, select, [contenteditable="true"]'));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey && !isEditing) {
        event.preventDefault();
        undoHero();
      }
      if ((event.metaKey || event.ctrlKey) && ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y') && !isEditing) {
        event.preventDefault();
        redoHero();
      }
      if (event.key === 'Escape' && !isEditing && (Object.keys(actionChoices).length > 0 || Object.keys(actionStatuses).length > 0)) {
        setActionChoices({});
        setActionStatuses({});
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actionChoices, actionStatuses, undoCount, redoCount, hero]);

  const toggleScratch = (themeId: string, tagId: string) => {
    if (!hero) return;
    const theme = hero.themes.find((item) => item.id === themeId);
    const tag = theme?.powerTags.find((item) => item.id === tagId);
    if (!tag) return;
    const themes = hero.themes.map((item) => item.id !== themeId ? item : {
      ...item,
      powerTags: item.powerTags.map((powerTag) => powerTag.id === tagId ? { ...powerTag, scratched: !powerTag.scratched } : powerTag),
    });
    setActionChoices((current) => ({ ...current, [tagId]: { polarity: 'unused', burn: false } }));
    changeHero(addChronicle({ ...hero, themes }, `${tag.name} ${tag.scratched ? 'recovered' : 'scratched'}.`));
  };

  const toggleActionChoice = (tagId: string, polarity: Exclude<Polarity, 'unused'>) => {
    setActionChoices((current) => {
      const existing = current[tagId];
      const nextPolarity = existing?.polarity === polarity ? 'unused' : polarity;
      return {
        ...current,
        [tagId]: {
          polarity: nextPolarity,
          burn: nextPolarity === 'helpful' ? existing?.burn ?? false : false,
        },
      };
    });
  };

  const toggleActionStatus = (statusId: string, polarity: Exclude<Polarity, 'unused'>) => {
    setActionStatuses((current) => ({
      ...current,
      [statusId]: current[statusId] === polarity ? 'unused' : polarity,
    }));
  };

  const clearActionSelection = () => {
    setActionChoices({});
    setActionStatuses({});
  };

  const setTrack = (themeId: string, track: 'abandon' | 'improve' | 'milestone', value: number) => {
    if (!hero) return;
    const theme = hero.themes.find((item) => item.id === themeId);
    if (!theme) return;
    const old = theme[track];

    if (track === 'improve') {
      if (theme.nascentPowerTagsNeeded > theme.pendingNascentPowerTags && value > theme.improve) {
        changeHero(addChronicle(markImprove(hero, themeId, 1), `${theme.title}: Improve opened a nascent power-tag choice.`));
        return;
      }
      const limit = improveTrackLimit(hero);
      const nextValue = clampTrack(value, limit);
      const themes = hero.themes.map((item) => item.id === themeId ? { ...item, improve: nextValue } : item);
      changeHero(addChronicle({ ...hero, themes }, `${theme.title}: Improve ${old} → ${nextValue}.`));
      return;
    }

    const nextValue = clampTrack(value, 3);
    const themes = hero.themes.map((item) => item.id === themeId ? { ...item, [track]: nextValue } : item);
    changeHero(addChronicle({ ...hero, themes }, `${theme.title}: ${track} ${old} → ${nextValue}.`));
  };


  const prepareDevelopment = (themeId: string, track: DevelopmentState['track']) => {
    if (!hero || track !== 'improve') {
      setDevelopment({ themeId, track });
      return;
    }
    const theme = hero.themes.find((item) => item.id === themeId);
    if (!theme) return;
    if (theme.pendingImprovements > 0 || theme.pendingNascentPowerTags > 0) {
      setDevelopment({ themeId, track });
      return;
    }
    const limit = improveTrackLimit(hero);
    if (theme.improve >= limit) {
      const themes = hero.themes.map((item) => {
        if (item.id !== themeId) return item;
        if (item.nascentPowerTagsNeeded > 0) return { ...item, improve: Math.max(0, item.improve - limit), pendingNascentPowerTags: item.pendingNascentPowerTags + 1 };
        return { ...item, improve: Math.max(0, item.improve - limit), pendingImprovements: item.pendingImprovements + (limit === 5 ? 2 : 1) };
      });
      changeHero(addChronicle({ ...hero, themes }, `${theme.title}: full Improve track converted into development.`));
    }
    setDevelopment({ themeId, track });
  };

  const toggleSpecialUse = (themeId: string, name: string, scope: 'scene' | 'session') => {
    if (!hero) return;
    const theme = hero.themes.find((item) => item.id === themeId);
    if (!theme) return;
    const state = theme.specialStates?.[name] ?? {};
    const nextState = scope === 'scene' ? { ...state, usedScene: !state.usedScene } : { ...state, usedSession: !state.usedSession };
    const used = scope === 'scene' ? Boolean(nextState.usedScene) : Boolean(nextState.usedSession);
    const themes = hero.themes.map((item) => item.id === themeId ? { ...item, specialStates: { ...item.specialStates, [name]: nextState } } : item);
    changeHero(addChronicle({ ...hero, themes }, `${name} marked ${used ? 'used' : 'ready'} for this ${scope}.`));
  };

  const resetUseScope = (scope: 'scene' | 'session') => {
    if (!hero) return;
    const next = addChronicle({ ...resetAbilityUses(hero, scope), previousAction: undefined }, `Started a new ${scope}; limited-use abilities reset.`);
    changeHero(next);
    clearActionSelection();
  };

  const closeHeroTransientUi = () => {
    setDevelopment(null);
    setFulfillmentOpen(false);
    setThemeManagerId(null);
    setJourneyOpen(false);
    setIdentityOpen(false);
    setFellowshipOpen(false);
    setCampOpen(false);
  };

  const switchHero = (heroId: string) => {
    if (heroId === hero?.id) return;
    setLibrary((current) => ({ ...current, activeHeroId: heroId }));
    clearUndoHistory();
    clearActionSelection();
    closeHeroTransientUi();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const beginNewHero = () => {
    setReforgeBase(null);
    setSuccessorBase(null);
    setCreatingNew(true);
    setCreating(true);
    setCharacterLibraryOpen(false);
    clearActionSelection();
  };

  const beginSuccessor = () => {
    if (!hero?.retired) return;
    const inheritedImprovements = hero.themes.reduce((sum, theme) => sum + improvementValueOfTheme(theme), 0) + hero.globalImprovementCredits;
    const fellowship = hero.fellowship ? { ...structuredClone(hero.fellowship), relationships: [] } : undefined;
    const seed: Hero = {
      id: uid('hero'),
      name: '',
      pronouns: '',
      concept: '',
      themes: Array.from({ length: 4 }, (_, index) => emptyTheme(index)),
      backpack: [],
      sceneTags: [],
      worldTags: structuredClone(hero.worldTags),
      statuses: [],
      fellowship,
      safeHavens: structuredClone(hero.safeHavens),
      legacyNotes: [...hero.legacyNotes],
      pastThemes: [],
      promise: hero.promise,
      fulfillmentCredits: 0,
      fulfillmentHistory: [],
      quintessences: [],
      globalImprovementCredits: inheritedImprovements,
      globalSpecialImprovementCredits: 0,
      savedMagicPower: 0,
      savedPackingPower: 0,
      lostPowerTags: [],
      retired: false,
      chronicle: [],
    };
    setReforgeBase(null);
    setSuccessorBase(seed);
    setCreatingNew(true);
    setCreating(true);
    setCharacterLibraryOpen(false);
    clearActionSelection();
  };

  const addHeroToLibrary = (next: Hero) => {
    setLibrary((current) => ({ heroes: [...current.heroes, next], activeHeroId: next.id }));
    clearUndoHistory();
    clearActionSelection();
  };

  const duplicateHero = (heroId: string) => {
    const source = library.heroes.find((item) => item.id === heroId);
    if (!source) return;
    const copy: Hero = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      name: `${source.name} Copy`,
    };
    setLibrary((current) => ({ heroes: [...current.heroes, copy], activeHeroId: copy.id }));
    clearUndoHistory();
    clearActionSelection();
    setCharacterLibraryOpen(false);
  };

  const deleteHero = (heroId: string) => {
    const deletingActive = heroId === hero?.id;
    setLibrary((current) => {
      const heroes = current.heroes.filter((item) => item.id !== heroId);
      const activeHeroId = deletingActive ? heroes[0]?.id ?? null : current.activeHeroId;
      return { heroes, activeHeroId };
    });
    if (deletingActive) {
      clearUndoHistory();
      clearActionSelection();
      closeHeroTransientUi();
    }
    if (library.heroes.length <= 1) setCharacterLibraryOpen(false);
  };

  const importHero = async (file?: File) => {
    if (!file) return;
    try {
      const imported = await readHeroFile(file);
      if (!imported.name || !Array.isArray(imported.themes)) throw new Error('Invalid hero file');
      const importedHero = library.heroes.some((item) => item.id === imported.id)
        ? { ...imported, id: crypto.randomUUID(), name: `${imported.name} (imported)` }
        : imported;
      setLibrary((current) => ({ heroes: [...current.heroes, importedHero], activeHeroId: importedHero.id }));
      clearUndoHistory();
      setCreating(false);
      clearActionSelection();
      setImportError('');
      setCharacterLibraryOpen(false);
    } catch {
      setImportError(`That file does not look like a ${APP_NAME} Hero export.`);
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  if (creating) {
    const creatorBase = reforgeBase ?? successorBase;
    const creatorMode = reforgeBase ? 'reforge' : successorBase ? 'successor' : 'create';
    return (
      <CreateHero
        initial={creatorBase ?? undefined}
        mode={creatorMode}
        onCancel={reforgeBase ? undefined : hero ? () => { setCreating(false); setCreatingNew(false); setSuccessorBase(null); } : undefined}
        onSave={(next) => {
          if (creatingNew || !hero) addHeroToLibrary(next);
          else changeHero(next);
          setCreating(false);
          setCreatingNew(false);
          setReforgeBase(null);
          setSuccessorBase(null);
          clearActionSelection();
        }}
      />
    );
  }

  if (!hero) {
    return (
      <main class="welcome-shell">
        <section class="welcome-card">
          <p class="eyebrow">{APP_NAME}</p>
          <h1>Your character sheet, made for the table.</h1>
          <p>Create a Hero, then play directly from the same sheet: tap the tags you invoke, roll, track statuses and story tags, and develop the Hero across sessions. The standard four-theme structure is the default, not a hard limit.</p>
          <div class="button-row">
            <button class="button primary" type="button" onClick={beginNewHero}>Create a hero</button>
            <button class="button secondary" type="button" onClick={() => { clearUndoHistory(); addHeroToLibrary(makeDemoHero()); setCreating(false); }}>Open demo hero</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div class="app-shell" id="top">
      <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={(event) => importHero(event.currentTarget.files?.[0])} />
      {importError && <div class="toast-error" role="alert"><span>{importError}</span><button type="button" onClick={() => setImportError('')} aria-label="Dismiss import error">×</button></div>}

      <HeroSheet
        hero={hero}
        onChange={changeHero}
        onToggleScratch={toggleScratch}
        onTrack={setTrack}
        onResolve={prepareDevelopment}
        actionChoices={actionChoices}
        actionStatuses={actionStatuses}
        onActionChoice={toggleActionChoice}
        onActionStatus={toggleActionStatus}
        onSetActionChoices={setActionChoices}
        onClearActionSelection={clearActionSelection}
        onFulfillment={() => setFulfillmentOpen(true)}
        onManageTheme={setThemeManagerId}
        onOpenJourney={() => setJourneyOpen(true)}
        onOpenFellowship={() => setFellowshipOpen(true)}
        onToggleSpecialUse={toggleSpecialUse}
        appHeader={(
          <AppHeader
                  heroes={library.heroes}
                  hero={hero}
                  undoCount={undoCount}
                  redoCount={redoCount}
                  storageHealthy={storageHealthy}
                  onSelectHero={switchHero}
                  onCreateHero={beginNewHero}
                  onManageCharacters={() => setCharacterLibraryOpen(true)}
                  onUndo={undoHero}
                  onRedo={redoHero}
                  onStartScene={() => resetUseScope('scene')}
                  onStartSession={() => resetUseScope('session')}
                  onOpenCamp={() => setCampOpen(true)}
                  onEditIdentity={() => setIdentityOpen(true)}
                  onManageFellowship={() => setFellowshipOpen(true)}
                  onOpenPlayReference={() => setPlayReferenceOpen(true)}
                  onExportHero={() => downloadHero(hero)}
                  onImportHero={() => fileInput.current?.click()}
                />
        )}
      />

      {playReferenceOpen && <HowToPlayDialog onClose={() => setPlayReferenceOpen(false)} />}


      {characterLibraryOpen && (
        <CharacterLibraryDrawer
          heroes={library.heroes}
          activeHeroId={hero.id}
          onSelect={switchHero}
          onCreate={beginNewHero}
          onImport={() => fileInput.current?.click()}
          onDuplicate={duplicateHero}
          onExport={downloadHero}
          onDelete={deleteHero}
          onClose={() => setCharacterLibraryOpen(false)}
        />
      )}

      {themeManagerId && (
        <ThemeManager
          hero={hero}
          themeId={themeManagerId}
          onChange={changeHero}
          onClose={() => setThemeManagerId(null)}
          onDevelop={prepareDevelopment}
        />
      )}

      {journeyOpen && (
        <JourneyDrawer
          hero={hero}
          onChange={changeHero}
          onClose={() => setJourneyOpen(false)}
          onOpenTheme={prepareDevelopment}
          onFulfillment={() => setFulfillmentOpen(true)}
          onOpenCamp={() => setCampOpen(true)}
          onCreateSuccessor={beginSuccessor}
        />
      )}

      {identityOpen && (
        <IdentityDrawer hero={hero} onChange={changeHero} onClose={() => setIdentityOpen(false)} />
      )}

      {fellowshipOpen && (
        <FellowshipDrawer hero={hero} onChange={changeHero} onClose={() => setFellowshipOpen(false)} />
      )}

      {campOpen && (
        <CampDrawer hero={hero} onChange={changeHero} onClose={() => setCampOpen(false)} />
      )}

      {development && (
        <DevelopmentDialog
          hero={hero}
          themeId={development.themeId}
          track={development.track}
          onChange={changeHero}
          onClose={() => setDevelopment(null)}
        />
      )}

      {fulfillmentOpen && (
        <FulfillmentDialog
          hero={hero}
          onChange={changeHero}
          onClose={() => setFulfillmentOpen(false)}
          onReforge={(heroAfterFulfillment) => {
            const seed: Hero = {
              ...heroAfterFulfillment,
              themes: Array.from({ length: 4 }, (_, index) => emptyTheme(index)),
              pastThemes: [...heroAfterFulfillment.themes.map((theme) => legacyThemeRecord(theme, 'reforged')), ...heroAfterFulfillment.pastThemes],
              quintessences: heroAfterFulfillment.quintessences.map((item) => item.themeId ? { ...item, themeId: undefined } : item),
              retired: false,
            };
            setSuccessorBase(null);
            setReforgeBase(seed);
            setCreatingNew(false);
            setFulfillmentOpen(false);
            setCreating(true);
          }}
        />
      )}
    </div>
  );
}
