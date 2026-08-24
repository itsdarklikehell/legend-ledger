import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { APP_NAME } from '../app-meta';
import type { ActionChoiceMap, ActionStatusMap, Hero, Polarity, StoryTagMode, Tag } from '../types';
import { ThemeCard } from './ThemeCard';
import { ActionPanel } from './ActionPanel';
import { PlayTools } from './PlayTools';
import { addChronicle, applyStatusMark, improveTrackLimit, makeTag, uid } from '../lib/rules';
import { FellowshipPanel } from './FellowshipPanel';
import { ScratchIcon } from './Icons';
import { QuickEdit } from './QuickEdit';
import { HeroRailQuintessences } from './HeroRailQuintessences';
import { TagGestureButton } from './TagGestureButton';
import { AppFooter } from './AppFooter';

interface HeroSheetProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  onToggleScratch: (themeId: string, tagId: string) => void;
  onTrack: (themeId: string, track: 'abandon' | 'improve' | 'milestone', value: number) => void;
  onResolve: (themeId: string, track: 'abandon' | 'improve' | 'milestone' | 'special') => void;
  actionChoices: ActionChoiceMap;
  actionStatuses: ActionStatusMap;
  onActionChoice: (tagId: string, polarity: Exclude<Polarity, 'unused'>) => void;
  onActionStatus: (statusId: string, polarity: Exclude<Polarity, 'unused'>) => void;
  onSetActionChoices: (choices: ActionChoiceMap | ((current: ActionChoiceMap) => ActionChoiceMap)) => void;
  onClearActionSelection: () => void;
  onFulfillment: () => void;
  onManageTheme: (themeId: string) => void;
  onOpenJourney: () => void;
  onOpenFellowship: () => void;
  onToggleSpecialUse: (themeId: string, name: string, scope: 'scene' | 'session') => void;
  appHeader: ComponentChildren;
}

export function HeroSheet({
  hero,
  onChange,
  onToggleScratch,
  onTrack,
  onResolve,
  actionChoices,
  actionStatuses,
  onActionChoice,
  onActionStatus,
  onSetActionChoices,
  onClearActionSelection,
  onFulfillment,
  onManageTheme,
  onOpenJourney,
  onOpenFellowship,
  onToggleSpecialUse,
  appHeader,
}: HeroSheetProps) {
  const improveLimit = improveTrackLimit(hero);
  const [backpackDraft, setBackpackDraft] = useState('');
  const [backpackMode, setBackpackMode] = useState<StoryTagMode>('standard');
  const [backpackGroup, setBackpackGroup] = useState('');
  const backpackAddDetails = useRef<HTMLDetailsElement | null>(null);

  const toggleActionBurn = (tagId: string) => {
    onSetActionChoices((current) => {
      const choice = current[tagId];
      if (!choice || choice.polarity !== 'helpful') return current;
      return { ...current, [tagId]: { ...choice, burn: !choice.burn } };
    });
  };

  const scratchBackpackTag = (tagId: string) => {
    const tag = hero.backpack.find((item) => item.id === tagId);
    if (!tag) return;
    onSetActionChoices((current) => ({ ...current, [tagId]: { polarity: 'unused', burn: false } }));
    onChange(addChronicle({ ...hero, backpack: hero.backpack.filter((item) => item.id !== tagId) }, `${tag.name} scratched from the backpack.`));
  };

  const addBackpackTag = () => {
    const name = backpackDraft.trim();
    if (!name) return;
    const group = backpackGroup.trim();
    const tag: Tag = {
      ...makeTag(name, 'story'),
      storyMode: backpackMode,
      storyGroupId: group ? group.toLowerCase().replace(/[^a-z0-9]+/g, '-') || uid('story-theme') : undefined,
      storyGroupName: group || undefined,
    };
    onChange(addChronicle({ ...hero, backpack: [...hero.backpack, tag] }, `${name} added to the backpack${group ? ` as part of ${group}` : ''}.`));
    setBackpackDraft('');
    if (backpackAddDetails.current) backpackAddDetails.current.open = false;
  };

  const addInlineSceneTag = (rawName: string) => {
    const name = rawName.trim();
    if (!name) return;
    const tag: Tag = { ...makeTag(name, 'story'), storyMode: 'standard' };
    onChange(addChronicle({ ...hero, sceneTags: [...hero.sceneTags, tag] }, `${name} added to the scene from game text.`));
  };

  const addInlineStatus = (rawName: string, tier: number) => {
    const name = rawName.trim();
    if (!name) return;
    const existing = hero.statuses.find((status) => status.name.toLowerCase() === name.toLowerCase());
    const statuses = existing
      ? hero.statuses.map((status) => status.id === existing.id ? applyStatusMark(status, tier) : status)
      : [...hero.statuses, { id: uid('status'), name, polarity: 'hindering' as const, marks: [tier] }];
    onChange(addChronicle({ ...hero, statuses }, `${name}-${tier} added from game text.`));
  };

  const renameHeroField = (field: 'name' | 'concept', value: string) => {
    if (hero[field] === value) return;
    onChange(addChronicle({ ...hero, [field]: value }, `${field === 'name' ? 'Hero name' : 'Hero concept'} updated.`));
  };

  const renameBackpackTag = (tagId: string, value: string) => {
    const tag = hero.backpack.find((item) => item.id === tagId);
    if (!tag || tag.name === value) return;
    onChange(addChronicle({ ...hero, backpack: hero.backpack.map((item) => item.id === tagId ? { ...item, name: value } : item) }, `Backpack tag ${tag.name} renamed to ${value}.`));
  };

  const renameThemeTitle = (themeId: string, value: string) => {
    const theme = hero.themes.find((item) => item.id === themeId);
    if (!theme || theme.title === value) return;
    const themes = hero.themes.map((item) => {
      if (item.id !== themeId) return item;
      const first = item.powerTags[0];
      return {
        ...item,
        title: value,
        powerTags: first?.name === item.title ? item.powerTags.map((tag, index) => index === 0 ? { ...tag, name: value } : tag) : item.powerTags,
      };
    });
    onChange(addChronicle({ ...hero, themes }, `${theme.title} renamed to ${value}.`));
  };

  const toggleThemeTagActive = (themeId: string, tagId: string) => {
    const themes = hero.themes.map((theme) => theme.id !== themeId ? theme : {
      ...theme,
      powerTags: theme.powerTags.map((tag) => tag.id === tagId ? { ...tag, active: tag.active === false } : tag),
    });
    onChange({ ...hero, themes });
  };

  const renameThemeQuest = (themeId: string, value: string) => {
    const theme = hero.themes.find((item) => item.id === themeId);
    if (!theme || theme.quest === value) return;
    onChange(addChronicle({ ...hero, themes: hero.themes.map((item) => item.id === themeId ? { ...item, quest: value } : item) }, `${theme.title}: Quest updated.`));
  };

  const reorderThemeTag = (themeId: string, kind: 'power' | 'weakness', fromId: string, toId: string) => {
    if (fromId === toId) return;
    const themes = hero.themes.map((theme) => {
      if (theme.id !== themeId) return theme;
      const key = kind === 'power' ? 'powerTags' : 'weaknessTags';
      const list = [...theme[key]];
      const fromIndex = list.findIndex((tag) => tag.id === fromId);
      const toIndex = list.findIndex((tag) => tag.id === toId);
      if (fromIndex < 0 || toIndex < 0 || (kind === 'power' && (fromIndex === 0 || toIndex === 0))) return theme;
      const [moved] = list.splice(fromIndex, 1);
      if (!moved) return theme;
      // Insert at the target's original index. When dragging downward this places the
      // moved tag after the row the pointer crossed, so adjacent rows actually swap.
      list.splice(toIndex, 0, moved);
      return { ...theme, [key]: list };
    });
    onChange({ ...hero, themes });
  };

  return (
    <main class="character-sheet">
      <aside
        class={`hero-portrait-rail ${hero.portrait ? 'has-image' : ''}`}
        style={hero.portrait ? { backgroundImage: `url(${hero.portrait})` } : undefined}
      >
        {appHeader}
        <div class={`portrait-art ${hero.portrait ? 'has-image' : ''}`}>
          {!hero.portrait && (
            <div class="mist-figure" aria-hidden="true">
              <span class="mist-sun" />
              <span class="ridge ridge-back" />
              <span class="ridge ridge-front" />
              <span class="pine pine-a" />
              <span class="pine pine-b" />
              <span class="pine pine-c" />
            </div>
          )}
          <div class="hero-title-lockup">
            <p class="mini-brand">{APP_NAME}</p>
            <div class="hero-name-edit-line"><h1>{hero.name}</h1><QuickEdit value={hero.name} onCommit={(value) => renameHeroField('name', value)} label="Rename Hero" className="hero-name-quick-edit" /></div>
            {hero.pronouns && <span>{hero.pronouns}</span>}
            {hero.retired && <button type="button" class="journeys-end-marker" onClick={onOpenJourney}>Journey's End · retired</button>}
          </div>
        </div>
        <div class="hero-concept-card">
          <div class="hero-concept-edit-line"><p>{hero.concept || 'No concept yet.'}</p><QuickEdit value={hero.concept} onCommit={(value) => renameHeroField('concept', value)} label="Edit Hero concept" placeholder="Hero concept" className="hero-concept-quick-edit" /></div>
          <button
            type="button"
            class="promise-track-button"
            onClick={onOpenJourney}
            aria-label={`Open Hero development. Promise ${hero.promise} of 5.`}
          >
            <span class="promise-track-heading"><strong>Promise</strong><small>Development</small></span>
            <span class="promise-track-pips" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((pip) => <span class={pip <= hero.promise ? 'is-marked' : ''} key={pip} />)}
            </span>
          </button>
          {hero.fulfillmentCredits > 0 && <button type="button" class="portrait-fulfillment-button" onClick={onFulfillment}>{hero.fulfillmentCredits} Moment{hero.fulfillmentCredits === 1 ? '' : 's'} of Fulfillment ready</button>}
          <HeroRailQuintessences hero={hero} onChange={onChange} onOpenJourney={onOpenJourney} onAddInlineTag={addInlineSceneTag} onAddInlineStatus={addInlineStatus} />
        </div>
      </aside>

      <section class="sheet-content">
        <div class="sheet-top-strip is-focus-mode">
          <section class="reference-card backpack-card">
            <div class="backpack-banner">
              <div class="reference-title backpack-title">
                <div><span>Backpack</span><small>Packed items & preparations</small></div>
                <em>tap + · − hinder · scratch</em>
              </div>
              <details class="backpack-add-details" ref={backpackAddDetails}>
                <summary>＋ Pack / prepare</summary>
                <div class="backpack-add-controls">
                  <div class="backpack-quick-entry"><input value={backpackDraft} onInput={(event) => setBackpackDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addBackpackTag(); } }} placeholder="Item, ally, spell, preparation…" /><button type="button" onClick={addBackpackTag}>Add</button></div>
                  <details class="story-tag-options">
                    <summary>Tag options</summary>
                    <div class="backpack-add-options">
                      <label><span>Type</span><select value={backpackMode} onChange={(event) => setBackpackMode(event.currentTarget.value as StoryTagMode)}><option value="standard">Standard · reusable</option><option value="single-use">Single-use · removed after use</option><option value="consumable">Consumable · burn when spent</option></select></label>
                      <label><span>Story theme</span><input value={backpackGroup} onInput={(event) => setBackpackGroup(event.currentTarget.value)} placeholder="Optional group" /></label>
                    </div>
                  </details>
                </div>
              </details>
            </div>
            <div class="backpack-pocket" aria-label="Backpack story tags">
              {hero.backpack.map((tag) => {
                const choice = actionChoices[tag.id];
                const detail = [tag.storyMode && tag.storyMode !== 'standard' ? tag.storyMode : '', tag.storyGroupName ?? ''].filter(Boolean).join(' · ');
                return (
                  <div class={`backpack-entry ${choice?.polarity === 'helpful' ? 'is-helpful-selected' : choice?.polarity === 'hindering' ? 'is-hindering-selected' : ''}`} key={tag.id}>
                    <span class="backpack-entry-mark" aria-hidden="true">◇</span>
                    <TagGestureButton
                      tagId={tag.id}
                      normalPolarity="helpful"
                      oppositePolarity="hindering"
                      onInvoke={onActionChoice}
                      className="backpack-entry-main"
                      title="Tap/click to invoke helpfully. Shift/Alt-click, right-click, or hold to invoke as hindering."
                      ariaLabel={`Invoke backpack tag ${tag.name}. Normal use is helpful; Shift-click, right-click, or hold to invoke it as hindering.`}
                    >
                      <strong>{tag.name}</strong>
                      {detail && <small>{detail}</small>}
                    </TagGestureButton>
                    {choice?.polarity && choice.polarity !== 'unused' && <em class={`backpack-entry-power is-${choice.polarity}`}>{choice.polarity === 'helpful' ? (choice.burn ? '+3' : '+1') : '−1'}</em>}
                    <div class="backpack-entry-actions">
                      <QuickEdit value={tag.name} onCommit={(value) => renameBackpackTag(tag.id, value)} label={`Rename ${tag.name}`} />
                      <button
                        type="button"
                        class={`backpack-entry-scratch ${choice?.burn ? 'is-roll-burn' : ''}`}
                        onClick={() => choice?.polarity === 'helpful' ? toggleActionBurn(tag.id) : scratchBackpackTag(tag.id)}
                        aria-label={choice?.polarity === 'helpful' ? `${choice.burn ? 'Cancel burn for' : 'Burn'} ${tag.name}` : `Scratch ${tag.name}`}
                        title={choice?.polarity === 'helpful'
                          ? choice.burn
                            ? 'Cancel burn for this roll'
                            : tag.storyMode === 'single-use'
                              ? 'Burn for +3 Power as a table ruling · standard single-use tags are not burned for Power'
                              : 'Burn this selected tag for +3 Power'
                          : 'Scratch / remove tag'}
                      ><ScratchIcon filled={Boolean(choice?.burn)} /></button>
                    </div>
                  </div>
                );
              })}
              {hero.backpack.length === 0 && <p class="backpack-empty">Nothing packed or prepared yet.</p>}
            </div>
          </section>
        </div>

        <div class="themes-row">
          {hero.themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              onToggleScratch={onToggleScratch}
              onTrack={onTrack}
              onResolve={onResolve}
              onManage={onManageTheme}
              actionChoices={actionChoices}
              onActionChoice={onActionChoice}
              onToggleBurn={toggleActionBurn}
              onToggleSpecialUse={onToggleSpecialUse}
              improveLimit={improveLimit}
              onRenameTitle={renameThemeTitle}
              onRenameQuest={renameThemeQuest}
              onReorderTag={reorderThemeTag}
              onToggleTagActive={toggleThemeTagActive}
              onAddInlineTag={addInlineSceneTag}
              onAddInlineStatus={addInlineStatus}
            />
          ))}
        </div>

        <div class="action-dock-wrap" id="action-tray">
          <ActionPanel
            hero={hero}
            onChange={onChange}
            choices={actionChoices}
            statusSelection={actionStatuses}
            onSetChoices={onSetActionChoices}
            onClearSelection={onClearActionSelection}
            onToggleStatus={onActionStatus}
          />
        </div>

        <FellowshipPanel hero={hero} onChange={onChange} actionChoices={actionChoices} onActionChoice={onActionChoice} onToggleBurn={toggleActionBurn} onOpen={onOpenFellowship} onAddInlineTag={addInlineSceneTag} onAddInlineStatus={addInlineStatus} />

        <section class="tabletop-section" aria-label="Play tracking">
          <PlayTools
            hero={hero}
            onChange={onChange}
            actionChoices={actionChoices}
            actionStatuses={actionStatuses}
            onActionChoice={onActionChoice}
            onActionStatus={onActionStatus}
            onToggleBurn={toggleActionBurn}
          />
        </section>

        <AppFooter />
      </section>
    </main>
  );
}
