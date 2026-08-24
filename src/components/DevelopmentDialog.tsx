import { useMemo, useState } from 'preact/hooks';
import type { AbilityState, Hero, Might, Theme } from '../types';
import { specialImprovementsByThemebook } from '../data/advancement';
import { mightOptions, themebookById, themebooks } from '../data/themebooks';
import { addChronicle, gainPromise, legacyThemeRecord, makeTag, replacementPromiseValue } from '../lib/rules';
import { useDismissTransition } from '../hooks/useDismissTransition';

type TrackName = 'abandon' | 'improve' | 'milestone' | 'special';
type ImproveChoice = 'power' | 'add-weakness' | 'remove-weakness' | 'special' | 'reset-abandon' | 'reset-milestone' | 'reset-both' | 'promise';

const CUSTOM_SPECIAL = '__custom__';

interface DevelopmentDialogProps {
  hero: Hero;
  themeId: string;
  track: TrackName;
  onChange: (hero: Hero) => void;
  onClose: () => void;
}

const makeNascentTheme = (original: Theme, typeId: string, typeName: string, might: Might, title: string, weakness: string, quest: string): Theme => ({
  ...original,
  typeId,
  typeName: typeId === 'custom' ? typeName.trim() || 'Custom theme' : '',
  might,
  title,
  powerTags: [makeTag(title, 'power')],
  weaknessTags: [makeTag(weakness, 'weakness')],
  quest,
  improve: 0,
  abandon: 0,
  milestone: 0,
  specialImprovements: [],
  specialStates: {},
  pendingImprovements: 0,
  nascentPowerTagsNeeded: 2,
  pendingNascentPowerTags: 0,
});

export function DevelopmentDialog({ hero, themeId, track, onChange, onClose: commitClose }: DevelopmentDialogProps) {
  const { closing, dismiss: onClose } = useDismissTransition(commitClose);
  const original = hero.themes.find((theme) => theme.id === themeId);
  const [choice, setChoice] = useState<ImproveChoice>('power');
  const [newValue, setNewValue] = useState('');
  const [removeWeaknessId, setRemoveWeaknessId] = useState(original?.weaknessTags[0]?.id ?? '');
  const [special, setSpecial] = useState('');
  const [bonusSpecial, setBonusSpecial] = useState('');
  const [customSpecialName, setCustomSpecialName] = useState('');
  const [customSpecialDescription, setCustomSpecialDescription] = useState('');
  const [customSpecialCadence, setCustomSpecialCadence] = useState<AbilityState['cadence']>('manual');
  const [rewriteTagId, setRewriteTagId] = useState('');
  const [rewriteValue, setRewriteValue] = useState('');

  const [transformationMode, setTransformationMode] = useState<'evolve' | 'expand'>('evolve');
  const [typeId, setTypeId] = useState(original?.typeId ?? 'trait');
  const [typeName, setTypeName] = useState(original?.typeName ?? '');
  const [might, setMight] = useState<Might>(original?.might ?? 'Origin');
  const [title, setTitle] = useState(original?.title ?? '');
  const [quest, setQuest] = useState(original?.quest ?? '');
  const [powerTags, setPowerTags] = useState(original?.powerTags.map((tag) => ({ ...tag })) ?? []);
  const [weaknessTags, setWeaknessTags] = useState(original?.weaknessTags.map((tag) => ({ ...tag })) ?? []);
  const [tradeIds, setTradeIds] = useState<Set<string>>(new Set());
  const [expandTargetId, setExpandTargetId] = useState(hero.themes.find((theme) => theme.id !== themeId)?.id ?? '');
  const [expandQuest, setExpandQuest] = useState(original?.quest ?? '');
  const [expandTypeId, setExpandTypeId] = useState('trait');
  const [expandTypeName, setExpandTypeName] = useState('');
  const [expandMight, setExpandMight] = useState<Might>('Origin');
  const [expandTitle, setExpandTitle] = useState('');
  const [expandWeakness, setExpandWeakness] = useState('');
  const [expandNewQuest, setExpandNewQuest] = useState('');

  if (!original) return null;

  const book = themebookById[typeId];
  const expandBook = themebookById[expandTypeId];
  const specials = specialImprovementsByThemebook[original.typeId] ?? [];
  const availableSpecials = specials.filter((item) => !original.specialImprovements.includes(item.name));
  const selectedSpecialName = special === CUSTOM_SPECIAL ? customSpecialName.trim() : special;
  const selectedSpecialState: AbilityState = special === CUSTOM_SPECIAL ? {
    description: customSpecialDescription.trim() || undefined,
    cadence: customSpecialCadence ?? 'manual',
  } : {};
  const bonusThemebookId = special === 'Wild Blood' ? 'uncanny-being' : special === 'Fine Control' ? 'mastery' : '';
  const availableBonusSpecials = bonusThemebookId
    ? (specialImprovementsByThemebook[bonusThemebookId] ?? []).filter((item) => !original.specialImprovements.includes(item.name))
    : [];
  const allThemeTags = [...original.powerTags, ...original.weaknessTags];
  const isNascentClaim = track === 'improve' && original.pendingNascentPowerTags > 0;
  const changedScale = typeId !== original.typeId || might !== original.might;

  const tradeable = useMemo(() => [
    ...original.powerTags.slice(3).map((tag) => ({ id: tag.id, label: `Power tag: ${tag.name}` })),
    ...original.weaknessTags.slice(1).map((tag) => ({ id: tag.id, label: `Weakness: ${tag.name}` })),
    ...original.specialImprovements.map((name) => ({ id: `special:${name}`, label: `Special: ${name}` })),
  ], [original]);

  const changeType = (value: string) => {
    const nextBook = themebookById[value];
    setTypeId(value);
    if (nextBook?.fixedMight) setMight(nextBook.fixedMight);
  };

  const changeExpandType = (value: string) => {
    const nextBook = themebookById[value];
    setExpandTypeId(value);
    if (nextBook?.fixedMight) setExpandMight(nextBook.fixedMight);
  };

  const applyRewrite = (theme: Theme): Theme => {
    if (!rewriteTagId || !rewriteValue.trim()) return theme;
    const rewrite = (tag: Theme['powerTags'][number]) => tag.id === rewriteTagId ? { ...tag, name: rewriteValue.trim() } : tag;
    const power = theme.powerTags.map(rewrite);
    return {
      ...theme,
      powerTags: power,
      title: power[0]?.id === rewriteTagId ? rewriteValue.trim() : theme.title,
      weaknessTags: theme.weaknessTags.map(rewrite),
    };
  };

  const resolveImprove = () => {
    if (isNascentClaim) {
      const value = newValue.trim();
      if (!value) return;
      const themes = hero.themes.map((theme) => theme.id !== themeId ? theme : {
        ...theme,
        powerTags: [...theme.powerTags, makeTag(value, 'power')],
        pendingNascentPowerTags: Math.max(0, theme.pendingNascentPowerTags - 1),
        nascentPowerTagsNeeded: Math.max(0, theme.nascentPowerTagsNeeded - 1),
      });
      onChange(addChronicle({ ...hero, themes }, `${original.title} grew a nascent power tag: ${value}.`));
      onClose();
      return;
    }

    if (original.pendingImprovements <= 0) return;
    let nextTheme: Theme = { ...original, pendingImprovements: original.pendingImprovements - 1 };
    let nextHero: Hero = hero;
    let label = '';

    if (choice === 'power') {
      if (!newValue.trim()) return;
      nextTheme = { ...nextTheme, powerTags: [...nextTheme.powerTags, makeTag(newValue, 'power')] };
      label = `new power tag “${newValue.trim()}”`;
    } else if (choice === 'add-weakness') {
      if (!newValue.trim()) return;
      nextTheme = { ...nextTheme, weaknessTags: [...nextTheme.weaknessTags, makeTag(newValue, 'weakness')] };
      label = `new weakness “${newValue.trim()}”`;
    } else if (choice === 'remove-weakness') {
      if (!removeWeaknessId) return;
      const removed = nextTheme.weaknessTags.find((tag) => tag.id === removeWeaknessId);
      nextTheme = { ...nextTheme, weaknessTags: nextTheme.weaknessTags.filter((tag) => tag.id !== removeWeaknessId) };
      label = `removed weakness “${removed?.name ?? 'unknown'}”`;
    } else if (choice === 'special') {
      if (!selectedSpecialName || nextTheme.specialImprovements.includes(selectedSpecialName) || (bonusThemebookId && !bonusSpecial)) return;
      const gainedSpecials = [selectedSpecialName, ...(bonusThemebookId && bonusSpecial ? [bonusSpecial] : [])];
      const gainedStates = Object.fromEntries(gainedSpecials.map((name) => [name, name === selectedSpecialName ? selectedSpecialState : {}]));
      nextTheme = { ...nextTheme, specialImprovements: [...nextTheme.specialImprovements, ...gainedSpecials], specialStates: { ...nextTheme.specialStates, ...gainedStates } };
      label = `Special Improvement: ${gainedSpecials.join(' + ')}`;
    } else if (choice === 'reset-abandon') {
      nextTheme = { ...nextTheme, abandon: 0 };
      label = 'Abandon reset by the Narrator';
    } else if (choice === 'reset-milestone') {
      nextTheme = { ...nextTheme, milestone: 0 };
      label = 'Milestones reset by the Narrator';
    } else if (choice === 'reset-both') {
      nextTheme = { ...nextTheme, abandon: 0, milestone: 0 };
      label = 'Abandon and Milestones reset by the Narrator';
    } else if (choice === 'promise') {
      label = 'converted the improvement into Promise';
    }

    nextTheme = applyRewrite(nextTheme);
    nextHero = { ...nextHero, themes: nextHero.themes.map((theme) => theme.id === themeId ? nextTheme : theme) };
    if (choice === 'promise') nextHero = gainPromise(nextHero, 1);
    onChange(addChronicle(nextHero, `${original.title} improved: ${label}.`));
    onClose();
  };

  const resolveSpecialCredit = () => {
    if (hero.globalSpecialImprovementCredits <= 0 || !selectedSpecialName || original.specialImprovements.includes(selectedSpecialName) || (bonusThemebookId && !bonusSpecial)) return;
    const gainedSpecials = [selectedSpecialName, ...(bonusThemebookId && bonusSpecial ? [bonusSpecial] : [])];
    const gainedStates = Object.fromEntries(gainedSpecials.map((name) => [name, name === selectedSpecialName ? selectedSpecialState : {}]));
    const themes = hero.themes.map((theme) => theme.id !== themeId ? theme : {
      ...theme,
      specialImprovements: [...theme.specialImprovements, ...gainedSpecials],
      specialStates: { ...theme.specialStates, ...gainedStates },
    });
    onChange(addChronicle({ ...hero, themes, globalSpecialImprovementCredits: hero.globalSpecialImprovementCredits - 1 }, `Old Hand: ${original.title} gained ${gainedSpecials.join(' + ')}.`));
    onClose();
  };

  const resolveReplacement = () => {
    if (!title.trim() || !quest.trim() || !newValue.trim()) return;
    const resolvedMight = might;
    const nextTheme = makeNascentTheme(original, typeId, typeName, resolvedMight, title.trim(), newValue.trim(), quest.trim());
    const promiseGain = replacementPromiseValue(original);
    let nextHero: Hero = {
      ...hero,
      themes: hero.themes.map((theme) => theme.id === themeId ? nextTheme : theme),
      lostPowerTags: [...new Set([...hero.lostPowerTags, ...original.powerTags.map((tag) => tag.name)])],
      pastThemes: [legacyThemeRecord(original, 'replaced'), ...hero.pastThemes],
    };
    nextHero = gainPromise(nextHero, promiseGain);
    onChange(addChronicle(nextHero, `${original.title} was replaced by nascent theme ${nextTheme.title}. Promise +${promiseGain}.`));
    onClose();
  };

  const resolveEvolution = () => {
    const resolvedMight = might;
    if (!title.trim()) return;

    const keptPower = powerTags.filter((tag) => !tradeIds.has(tag.id)).map((tag) => ({ ...tag, name: tag.name.trim(), scratched: false }));
    if (keptPower.length === 0) return;
    const firstKeptPower = keptPower[0];
    if (!firstKeptPower) return;
    keptPower[0] = { ...firstKeptPower, name: title.trim() };
    const keptWeakness = weaknessTags.filter((tag) => !tradeIds.has(tag.id)).map((tag) => ({ ...tag, name: tag.name.trim() }));
    const keptSpecials = original.specialImprovements.filter((name) => !tradeIds.has(`special:${name}`));
    const tradeCount = tradeIds.size;

    const nextTheme: Theme = {
      ...original,
      typeId,
      typeName: typeId === 'custom' ? typeName.trim() || 'Custom theme' : '',
      might: resolvedMight,
      title: title.trim(),
      powerTags: keptPower,
      weaknessTags: keptWeakness,
      quest: quest.trim(),
      improve: 0,
      abandon: 0,
      milestone: 0,
      specialImprovements: keptSpecials,
      specialStates: Object.fromEntries(Object.entries(original.specialStates ?? {}).filter(([name]) => keptSpecials.includes(name))),
      pendingImprovements: original.pendingImprovements + tradeCount,
      nascentPowerTagsNeeded: 0,
      pendingNascentPowerTags: 0,
    };

    let nextHero: Hero = {
      ...hero,
      themes: hero.themes.map((theme) => theme.id === themeId ? nextTheme : theme),
      lostPowerTags: [...new Set([...hero.lostPowerTags, ...original.powerTags.map((tag) => tag.name)])],
      pastThemes: [legacyThemeRecord(original, 'evolved'), ...hero.pastThemes],
    };
    nextHero = gainPromise(nextHero, 1);
    onChange(addChronicle(nextHero, `${original.title} evolved into ${nextTheme.title}. Promise +1${tradeCount ? `; ${tradeCount} traded feature${tradeCount === 1 ? '' : 's'} became improvement credit${tradeCount === 1 ? '' : 's'}.` : '.'}`));
    onClose();
  };

  const resolveExpansion = () => {
    const target = hero.themes.find((theme) => theme.id === expandTargetId);
    if (!target || !expandTitle.trim() || !expandWeakness.trim() || !expandNewQuest.trim() || !expandQuest.trim()) return;
    const resolvedMight = expandMight;
    const newTheme = makeNascentTheme(target, expandTypeId, expandTypeName, resolvedMight, expandTitle.trim(), expandWeakness.trim(), expandNewQuest.trim());
    const promiseGain = replacementPromiseValue(target);
    let nextHero: Hero = {
      ...hero,
      themes: hero.themes.map((theme) => {
        if (theme.id === original.id) return { ...theme, milestone: 0, quest: expandQuest.trim() };
        if (theme.id === target.id) return newTheme;
        return theme;
      }),
      lostPowerTags: [...new Set([...hero.lostPowerTags, ...target.powerTags.map((tag) => tag.name)])],
      pastThemes: [legacyThemeRecord(target, 'expanded-away'), ...hero.pastThemes],
    };
    nextHero = gainPromise(nextHero, promiseGain);
    onChange(addChronicle(nextHero, `${original.title} expanded: ${target.title} was replaced by nascent theme ${newTheme.title}. Promise +${promiseGain}.`));
    onClose();
  };

  const updatePowerTag = (id: string, value: string) => setPowerTags((current) => current.map((tag) => tag.id === id ? { ...tag, name: value } : tag));
  const updateWeaknessTag = (id: string, value: string) => setWeaknessTags((current) => current.map((tag) => tag.id === id ? { ...tag, name: value } : tag));
  const toggleTrade = (id: string) => setTradeIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div class={`modal-backdrop development-backdrop ${closing ? 'is-closing' : ''}`} role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section class="development-dialog development-dialog-wide development-drawer" role="dialog" aria-modal="true" aria-labelledby="development-title">
        <header>
          <div>
            <p class="eyebrow">Hero development</p>
            <h2 id="development-title">{track === 'improve' ? `Develop ${original.title}` : track === 'special' ? `Choose a Special for ${original.title}` : track === 'milestone' ? `Transform ${original.title}` : `Replace ${original.title}`}</h2>
          </div>
          <button type="button" class="icon-button" onClick={onClose} aria-label="Close">×</button>
        </header>

        {track === 'improve' && (
          <div class="development-choice">
            {isNascentClaim ? (
              <>
                <div class="rules-callout"><strong>Nascent theme.</strong> The next two times this theme would mark Improve, it gains a power tag instead. {original.nascentPowerTagsNeeded} still needed.</div>
                <label><span>New power tag</span><input value={newValue} onInput={(event) => setNewValue(event.currentTarget.value)} placeholder="A new truth emerging in this theme" /></label>
              </>
            ) : (
              <>
                <div class="rules-callout"><strong>{original.pendingImprovements} improvement{original.pendingImprovements === 1 ? '' : 's'} ready.</strong> Claim one now. You can hold the rest for later.</div>
                <div class="choice-tabs advancement-choice-tabs primary-improvement-choices">
                  {([
                    ['power', 'New power tag'], ['add-weakness', 'Add weakness'], ['special', 'Special'], ['promise', 'Mark Promise'],
                  ] as [ImproveChoice, string][]).map(([value, label]) => <button type="button" class={choice === value ? 'is-active' : ''} onClick={() => setChoice(value)} key={value}>{label}</button>)}
                </div>
                <details class="secondary-improvement-choices">
                  <summary>Other improvement choices</summary>
                  <div class="choice-tabs advancement-choice-tabs">
                    {([['remove-weakness', 'Remove weakness'], ['reset-abandon', 'Reset Abandon'], ['reset-milestone', 'Reset Milestone'], ['reset-both', 'Reset both']] as [ImproveChoice, string][]).map(([value, label]) => <button type="button" class={choice === value ? 'is-active' : ''} onClick={() => setChoice(value)} key={value}>{label}</button>)}
                  </div>
                </details>

                {(choice === 'power' || choice === 'add-weakness') && <label><span>{choice === 'power' ? 'New power tag' : 'New weakness tag'}</span><input value={newValue} onInput={(event) => setNewValue(event.currentTarget.value)} /></label>}
                {choice === 'remove-weakness' && <label><span>Weakness to remove</span><select value={removeWeaknessId} onChange={(event) => setRemoveWeaknessId(event.currentTarget.value)}>{original.weaknessTags.map((tag) => <option value={tag.id} key={tag.id}>{tag.name}</option>)}</select></label>}
                {choice === 'special' && (
                  <>
                    <div class="special-picker">
                      {availableSpecials.length === 0 && <p class="rules-note">All listed Specials from this themebook are already chosen. You can add a custom Special instead.</p>}
                      {availableSpecials.map((item) => (
                        <button type="button" class={special === item.name ? 'is-selected' : ''} onClick={() => { setSpecial(item.name); setBonusSpecial(''); }} key={item.name}>
                          <strong>{item.name}</strong><span>{item.summary}</span>
                        </button>
                      ))}
                      <button type="button" class={`custom-special-choice ${special === CUSTOM_SPECIAL ? 'is-selected' : ''}`} onClick={() => { setSpecial(CUSTOM_SPECIAL); setBonusSpecial(''); }}>
                        <strong>Custom Special</strong><span>Name the Special and describe what it does.</span>
                      </button>
                    </div>
                    {special === CUSTOM_SPECIAL && (
                      <div class="custom-special-fields">
                        <label><span>Special name</span><input value={customSpecialName} onInput={(event) => setCustomSpecialName(event.currentTarget.value)} placeholder="My Special Improvement" /></label>
                        <label><span>Rules text</span><textarea value={customSpecialDescription} onInput={(event) => setCustomSpecialDescription(event.currentTarget.value)} placeholder="What does this Special do?" /></label>
                        <label><span>Use tracking</span><select value={customSpecialCadence ?? 'manual'} onChange={(event) => setCustomSpecialCadence(event.currentTarget.value as AbilityState['cadence'])}><option value="scene">Once per scene</option><option value="session">Once per session</option><option value="persistent">Persistent</option><option value="manual">Manual / no counter</option></select></label>
                      </div>
                    )}
                    {bonusThemebookId && (
                      <label><span>{special} also grants one {bonusThemebookId === 'uncanny-being' ? 'Uncanny Being' : 'Mastery'} Special</span><select value={bonusSpecial} onChange={(event) => setBonusSpecial(event.currentTarget.value)}><option value="">Choose…</option>{availableBonusSpecials.map((item) => <option value={item.name} key={item.name}>{item.name}</option>)}</select></label>
                    )}
                  </>
                )}
                {(choice === 'reset-abandon' || choice === 'reset-milestone' || choice === 'reset-both' || choice === 'promise') && <p class="rules-note">This is one of the rules-listed improvement choices. Use it when it matches how this theme is developing in the story.</p>}

                <div class="rewrite-row">
                  <label><span>Optional: rewrite a tag too</span><select value={rewriteTagId} onChange={(event) => setRewriteTagId(event.currentTarget.value)}><option value="">No rewrite</option>{allThemeTags.map((tag) => <option value={tag.id} key={tag.id}>{tag.name}</option>)}</select></label>
                  {rewriteTagId && <label><span>New wording</span><input value={rewriteValue} onInput={(event) => setRewriteValue(event.currentTarget.value)} /></label>}
                </div>
              </>
            )}
          </div>
        )}

        {track === 'special' && (
          <div class="development-choice">
            <div class="rules-callout"><strong>Old Hand Special.</strong> This credit can only choose a Special Improvement. {hero.globalSpecialImprovementCredits} Special choice{hero.globalSpecialImprovementCredits === 1 ? '' : 's'} remain.</div>
            <div class="special-picker">
              {availableSpecials.length === 0 && <p class="rules-note">This theme already has every listed Special from its themebook. Custom Specials remain available.</p>}
              {availableSpecials.map((item) => (
                <button type="button" class={special === item.name ? 'is-selected' : ''} onClick={() => { setSpecial(item.name); setBonusSpecial(''); }} key={item.name}><strong>{item.name}</strong><span>{item.summary}</span></button>
              ))}
              <button type="button" class={`custom-special-choice ${special === CUSTOM_SPECIAL ? 'is-selected' : ''}`} onClick={() => { setSpecial(CUSTOM_SPECIAL); setBonusSpecial(''); }}><strong>Custom Special</strong><span>Create a Special instead of choosing from the printed list.</span></button>
            </div>
            {special === CUSTOM_SPECIAL && (
              <div class="custom-special-fields">
                <label><span>Special name</span><input value={customSpecialName} onInput={(event) => setCustomSpecialName(event.currentTarget.value)} /></label>
                <label><span>Rules text</span><textarea value={customSpecialDescription} onInput={(event) => setCustomSpecialDescription(event.currentTarget.value)} /></label>
                <label><span>Use tracking</span><select value={customSpecialCadence ?? 'manual'} onChange={(event) => setCustomSpecialCadence(event.currentTarget.value as AbilityState['cadence'])}><option value="scene">Once per scene</option><option value="session">Once per session</option><option value="persistent">Persistent</option><option value="manual">Manual / no counter</option></select></label>
              </div>
            )}
            {bonusThemebookId && (
              <label><span>{special} also grants one {bonusThemebookId === 'uncanny-being' ? 'Uncanny Being' : 'Mastery'} Special</span><select value={bonusSpecial} onChange={(event) => setBonusSpecial(event.currentTarget.value)}><option value="">Choose…</option>{availableBonusSpecials.map((item) => <option value={item.name} key={item.name}>{item.name}</option>)}</select></label>
            )}
          </div>
        )}

        {track === 'abandon' && (
          <div class="reforge-grid">
            <p class="rules-note full-width">Replacement creates a <strong>nascent theme</strong>: only its title power tag, one weakness, and a Quest. Its next two Improve opportunities add its second and third power tags. Replacing this theme yields {replacementPromiseValue(original)} Promise before any five-point overflow becomes a Moment of Fulfillment.</p>
            <label><span>Themebook</span><select value={typeId} onChange={(event) => changeType(event.currentTarget.value)}>{themebooks.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}<option value="custom">Custom…</option></select></label>
            <label><span>Might</span><select value={might} onChange={(event) => setMight(event.currentTarget.value as Might)}>{mightOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            {typeId === 'custom' && <label class="full-width"><span>Custom theme type</span><input value={typeName} onInput={(event) => setTypeName(event.currentTarget.value)} /></label>}
            {book?.fixedMight && might !== book.fixedMight && <p class="soft-rule-note full-width">Themebook default: {book.fixedMight} Might.</p>}
            <label class="full-width"><span>Nascent title tag</span><input value={title} onInput={(event) => setTitle(event.currentTarget.value)} /></label>
            <label><span>Weakness tag</span><input value={newValue} onInput={(event) => setNewValue(event.currentTarget.value)} /></label>
            <label class="full-width"><span>Quest</span><textarea value={quest} onInput={(event) => setQuest(event.currentTarget.value)} /></label>
          </div>
        )}

        {track === 'milestone' && (
          <div>
            <div class="choice-tabs transformation-tabs"><button type="button" class={transformationMode === 'evolve' ? 'is-active' : ''} onClick={() => setTransformationMode('evolve')}>Evolve theme</button><button type="button" class={transformationMode === 'expand' ? 'is-active' : ''} onClick={() => setTransformationMode('expand')}>Expand instead</button></div>
            {transformationMode === 'evolve' ? (
              <div class="reforge-grid">
                <p class="rules-note full-width">Evolution earns 1 Promise and changes the themebook or its Might. Existing tags can be revised or retained. Extra power tags beyond the third, extra weaknesses beyond the first, and Special Improvements may be traded for new improvement credits.</p>
                <label><span>Themebook</span><select value={typeId} onChange={(event) => changeType(event.currentTarget.value)}>{themebooks.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}<option value="custom">Custom…</option></select></label>
                <label><span>Might</span><select value={might} onChange={(event) => setMight(event.currentTarget.value as Might)}>{mightOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                {typeId === 'custom' && <label class="full-width"><span>Custom theme type</span><input value={typeName} onInput={(event) => setTypeName(event.currentTarget.value)} /></label>}
                {book?.fixedMight && might !== book.fixedMight && <p class="soft-rule-note full-width">Themebook default: {book.fixedMight} Might.</p>}
                <label class="full-width"><span>New title</span><input value={title} onInput={(event) => setTitle(event.currentTarget.value)} /></label>
                <details class="full-width evolution-review">
                  <summary>Review tags & trade old features <span>optional</span></summary>
                  <div class="evolution-tags"><h3>Power tags</h3>{powerTags.map((tag, index) => <label key={tag.id}><span>{index === 0 ? 'Title tag' : `Power tag ${index + 1}`}</span><input value={index === 0 ? title : tag.name} onInput={(event) => index === 0 ? setTitle(event.currentTarget.value) : updatePowerTag(tag.id, event.currentTarget.value)} disabled={index === 0} /></label>)}</div>
                  <div class="evolution-tags"><h3>Weakness tags</h3>{weaknessTags.map((tag) => <label key={tag.id}><span>Weakness</span><input value={tag.name} onInput={(event) => updateWeaknessTag(tag.id, event.currentTarget.value)} /></label>)}</div>
                  {tradeable.length > 0 && <div class="trade-panel"><h3>Trade old features for improvements</h3>{tradeable.map((item) => <label key={item.id}><input type="checkbox" checked={tradeIds.has(item.id)} onChange={() => toggleTrade(item.id)} /><span>{item.label}</span></label>)}<small>{tradeIds.size} improvement credit{tradeIds.size === 1 ? '' : 's'} will be ready on the evolved theme.</small></div>}
                </details>
                <label class="full-width"><span>New Quest</span><textarea value={quest} onInput={(event) => setQuest(event.currentTarget.value)} /></label>
                {!changedScale && <p class="soft-rule-note full-width">Evolution usually changes the themebook or Might.</p>}
              </div>
            ) : (
              <div class="reforge-grid">
                <p class="rules-note full-width">Expansion keeps this theme, resets its Milestone track, and rewrites its Quest. Another theme is replaced by a new nascent theme that expands this aspect of the Hero.</p>
                <label class="full-width"><span>Rewritten Quest for {original.title}</span><textarea value={expandQuest} onInput={(event) => setExpandQuest(event.currentTarget.value)} /></label>
                <label class="full-width"><span>Theme to replace</span><select value={expandTargetId} onChange={(event) => setExpandTargetId(event.currentTarget.value)}>{hero.themes.filter((theme) => theme.id !== original.id).map((theme) => <option value={theme.id} key={theme.id}>{theme.title}</option>)}</select></label>
                <label><span>New themebook</span><select value={expandTypeId} onChange={(event) => changeExpandType(event.currentTarget.value)}>{themebooks.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}<option value="custom">Custom…</option></select></label>
                <label><span>Might</span><select value={expandMight} onChange={(event) => setExpandMight(event.currentTarget.value as Might)}>{mightOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                {expandTypeId === 'custom' && <label class="full-width"><span>Custom theme type</span><input value={expandTypeName} onInput={(event) => setExpandTypeName(event.currentTarget.value)} /></label>}
                {expandBook?.fixedMight && expandMight !== expandBook.fixedMight && <p class="soft-rule-note full-width">Themebook default: {expandBook.fixedMight} Might.</p>}
                <label class="full-width"><span>New nascent title tag</span><input value={expandTitle} onInput={(event) => setExpandTitle(event.currentTarget.value)} /></label>
                <label><span>Weakness</span><input value={expandWeakness} onInput={(event) => setExpandWeakness(event.currentTarget.value)} /></label>
                <label class="full-width"><span>New theme Quest</span><textarea value={expandNewQuest} onInput={(event) => setExpandNewQuest(event.currentTarget.value)} /></label>
              </div>
            )}
          </div>
        )}

        <footer class="dialog-footer">
          <button type="button" class="button ghost" onClick={onClose}>Not yet</button>
          <button type="button" class="button primary" onClick={track === 'improve' ? resolveImprove : track === 'special' ? resolveSpecialCredit : track === 'abandon' ? resolveReplacement : transformationMode === 'expand' ? resolveExpansion : resolveEvolution}>
            {track === 'improve' ? (isNascentClaim ? 'Add power tag' : 'Claim improvement') : track === 'special' ? 'Choose Special' : track === 'abandon' ? 'Replace theme' : transformationMode === 'expand' ? 'Expand theme' : 'Evolve theme'}
          </button>
        </footer>
      </section>
    </div>
  );
}
