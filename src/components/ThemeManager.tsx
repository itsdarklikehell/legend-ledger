import { useState } from 'preact/hooks';
import type { AbilityState, Hero, Might, Theme } from '../types';
import { themebookById, themebooks, mightOptions } from '../data/themebooks';
import { abilityCadence, specialSummary } from '../lib/abilities';
import { addChronicle, makeTag } from '../lib/rules';
import { MistSyntaxHint } from './MistSyntaxHint';
import { useDismissTransition } from '../hooks/useDismissTransition';

interface ThemeManagerProps {
  hero: Hero;
  themeId: string;
  onChange: (hero: Hero) => void;
  onClose: () => void;
  onDevelop: (themeId: string, track: 'abandon' | 'improve' | 'milestone' | 'special') => void;
}

export function ThemeManager({ hero, themeId, onChange, onClose: commitClose, onDevelop }: ThemeManagerProps) {
  const { closing, dismiss: onClose } = useDismissTransition(commitClose);
  const original = hero.themes.find((theme) => theme.id === themeId);
  const [title, setTitle] = useState(original?.title ?? '');
  const [quest, setQuest] = useState(original?.quest ?? '');
  const [typeId, setTypeId] = useState(original?.typeId ?? 'trait');
  const [typeName, setTypeName] = useState(original?.typeName ?? '');
  const [might, setMight] = useState<Might>(original?.might ?? 'Origin');
  const [powerTags, setPowerTags] = useState(original?.powerTags.map((tag) => ({ ...tag })) ?? []);
  const [weaknessTags, setWeaknessTags] = useState(original?.weaknessTags.map((tag) => ({ ...tag })) ?? []);
  const [specialImprovements, setSpecialImprovements] = useState(original?.specialImprovements ?? []);
  const [specialStates, setSpecialStates] = useState<Record<string, AbilityState>>(original?.specialStates ?? {});
  const [customSpecial, setCustomSpecial] = useState('');

  if (!original) return null;

  const book = themebookById[typeId];
  const improveLimit = hero.quintessences.some((item) => item.name === 'Diligent Drudge') ? 5 : 3;
  const readyCount = original.pendingNascentPowerTags + original.pendingImprovements + (original.improve >= improveLimit && original.pendingNascentPowerTags === 0 && original.pendingImprovements === 0 ? 1 : 0) + (original.abandon >= 3 ? 1 : 0) + (original.milestone >= 3 ? 1 : 0);

  const save = () => {
    const cleanTitle = title.trim();
    const cleanedPower = powerTags
      .map((tag, index) => ({ ...tag, name: index === 0 ? cleanTitle : tag.name.trim() }))
      .filter((tag, index) => index === 0 || tag.name.length > 0);
    const nextPower = cleanedPower.length > 0 ? cleanedPower : [makeTag(cleanTitle, 'power')];
    const nextTheme: Theme = {
      ...original,
      title: cleanTitle,
      quest: quest.trim(),
      typeId,
      typeName: typeId === 'custom' ? typeName.trim() || 'Custom theme' : '',
      might,
      powerTags: nextPower,
      weaknessTags: weaknessTags.map((tag) => ({ ...tag, name: tag.name.trim() })).filter((tag) => tag.name.length > 0),
      specialImprovements,
      specialStates,
    };
    onChange(addChronicle({ ...hero, themes: hero.themes.map((theme) => theme.id === themeId ? nextTheme : theme) }, `${original.title || 'Theme'} was edited.`));
    onClose();
  };

  const develop = (track: 'abandon' | 'improve' | 'milestone' | 'special') => {
    onClose();
    onDevelop(themeId, track);
  };

  const chooseType = (value: string) => {
    setTypeId(value);
    const next = themebookById[value];
    if (next?.fixedMight) setMight(next.fixedMight);
  };

  const patchSpecialState = (name: string, patch: Partial<AbilityState>) => {
    setSpecialStates((current) => ({ ...current, [name]: { ...(current[name] ?? {}), ...patch } }));
  };

  const addCustomSpecial = () => {
    const name = customSpecial.trim();
    if (!name || specialImprovements.includes(name)) return;
    setSpecialImprovements((current) => [...current, name]);
    setSpecialStates((current) => ({ ...current, [name]: { ...(current[name] ?? {}), description: current[name]?.description ?? '', cadence: current[name]?.cadence ?? 'manual' } }));
    setCustomSpecial('');
  };

  const removeSpecial = (name: string) => {
    setSpecialImprovements((current) => current.filter((item) => item !== name));
    setSpecialStates((current) => { const next = { ...current }; delete next[name]; return next; });
  };

  const movePowerTag = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (index < 1 || target < 1 || target >= powerTags.length) return;
    setPowerTags((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  };

  const moveWeaknessTag = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= weaknessTags.length) return;
    setWeaknessTags((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  };

  const removeTheme = () => {
    if (!window.confirm(`Remove ${original.title || 'this theme'}? This cannot be undone unless you import an earlier export.`)) return;
    onChange(addChronicle({ ...hero, themes: hero.themes.filter((theme) => theme.id !== themeId) }, `${original.title || 'Theme'} was removed from the Hero.`));
    onClose();
  };

  return (
    <div class={`drawer-backdrop ${closing ? 'is-closing' : ''}`} role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside class="sheet-drawer theme-manager has-structured-scroll" role="dialog" aria-modal="true" aria-labelledby="theme-manager-title">
        <header class="drawer-header">
          <div>
            <p class="eyebrow">Theme</p>
            <h2 id="theme-manager-title">{original.title || 'Untitled theme'}</h2>
          </div>
          <button type="button" class="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div class="drawer-scroll-region">
        {readyCount > 0 && (
          <section class="drawer-section ready-section">
            <strong>{readyCount} development {readyCount === 1 ? 'step' : 'steps'} ready</strong>
            <div class="quick-development-actions">
              {original.pendingNascentPowerTags > 0 && <button type="button" onClick={() => develop('improve')}>Add nascent power tag</button>}
              {(original.pendingImprovements > 0 || original.improve >= improveLimit) && <button type="button" onClick={() => develop('improve')}>{original.pendingImprovements > 0 ? `Use improvement${original.pendingImprovements > 1 ? ` · ${original.pendingImprovements}` : ''}` : 'Resolve full Improve'}</button>}
              {original.abandon >= 3 && <button type="button" onClick={() => develop('abandon')}>Replace theme</button>}
              {original.milestone >= 3 && <button type="button" onClick={() => develop('milestone')}>Evolve theme</button>}
            </div>
          </section>
        )}

        <section class="drawer-section compact-edit-section">
          <div class="drawer-section-title"><strong>Edit sheet</strong><span>Edit theme details and tags.</span></div>
          <label><span>Title</span><input value={title} onInput={(event) => setTitle(event.currentTarget.value)} /></label>
          <div class="compact-field-grid">
            <label>
              <span>Themebook</span>
              <select value={typeId} onChange={(event) => chooseType(event.currentTarget.value)}>
                {themebooks.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                <option value="custom">Custom…</option>
              </select>
            </label>
            <label><span>Might</span><select value={might} onChange={(event) => setMight(event.currentTarget.value as Might)}>{mightOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          {typeId === 'custom' && <label><span>Custom theme type</span><input value={typeName} onInput={(event) => setTypeName(event.currentTarget.value)} placeholder="Name this theme type" /></label>}
          {book?.fixedMight && might !== book.fixedMight && <p class="soft-rule-note">Themebook default: {book.fixedMight} Might.</p>}

          <div class="inline-tag-editor dynamic-tag-editor">
            <div class="inline-editor-heading"><span>Power tags</span><button type="button" onClick={() => setPowerTags((current) => [...current, makeTag('', 'power')])}>+ tag</button></div>
            {powerTags.map((tag, index) => (
              <div class="tag-edit-row" key={tag.id}>
                <input value={index === 0 ? title : tag.name} disabled={index === 0} onInput={(event) => setPowerTags((current) => current.map((item) => item.id === tag.id ? { ...item, name: event.currentTarget.value } : item))} placeholder={index === 0 ? 'Title tag' : `Power tag ${index + 1}`} />
                {index > 0 && (
                  <span class="tag-edit-order" aria-label="Reorder power tag">
                    <button type="button" disabled={index === 1} onClick={() => movePowerTag(index, -1)} aria-label={`Move ${tag.name || 'power tag'} up`}>↑</button>
                    <button type="button" disabled={index === powerTags.length - 1} onClick={() => movePowerTag(index, 1)} aria-label={`Move ${tag.name || 'power tag'} down`}>↓</button>
                  </span>
                )}
                {index > 0 && <button type="button" class="mini-remove" onClick={() => setPowerTags((current) => current.filter((item) => item.id !== tag.id))} aria-label="Remove power tag">×</button>}
              </div>
            ))}
            {powerTags.length > 3 && <small>{powerTags.length - 3} additional developed power tag{powerTags.length - 3 === 1 ? '' : 's'}.</small>}
          </div>
          <div class="inline-tag-editor weakness-editor dynamic-tag-editor">
            <div class="inline-editor-heading"><span>Weaknesses</span><button type="button" onClick={() => setWeaknessTags((current) => [...current, makeTag('', 'weakness')])}>+ weakness</button></div>
            {weaknessTags.map((tag, index) => (
              <div class="tag-edit-row" key={tag.id}>
                <input value={tag.name} onInput={(event) => setWeaknessTags((current) => current.map((item) => item.id === tag.id ? { ...item, name: event.currentTarget.value } : item))} />
                <span class="tag-edit-order" aria-label="Reorder weakness tag">
                  <button type="button" disabled={index === 0} onClick={() => moveWeaknessTag(index, -1)} aria-label={`Move ${tag.name || 'weakness'} up`}>↑</button>
                  <button type="button" disabled={index === weaknessTags.length - 1} onClick={() => moveWeaknessTag(index, 1)} aria-label={`Move ${tag.name || 'weakness'} down`}>↓</button>
                </span>
                <button type="button" class="mini-remove" onClick={() => setWeaknessTags((current) => current.filter((item) => item.id !== tag.id))} aria-label="Remove weakness tag">×</button>
              </div>
            ))}
            {weaknessTags.length === 0 && <small>No weakness recorded.</small>}
          </div>
          <label><span>Quest</span><textarea value={quest} onInput={(event) => setQuest(event.currentTarget.value)} /></label>
          <MistSyntaxHint />
        </section>

        <details class="drawer-section drawer-details" open={specialImprovements.length > 0}>
          <summary>Special Improvements · {specialImprovements.length}</summary>
          <div class="ability-config-list">
            {specialImprovements.map((name) => {
              const bookSummary = specialSummary(typeId, name);
              const state = specialStates[name] ?? {};
              const summary = bookSummary || state.description || '';
              const inferredCadence = abilityCadence(summary);
              const cadence = state.cadence ?? inferredCadence;
              return (
                <article key={name}>
                  <div class="ability-config-heading"><strong>{name}</strong><button type="button" class="mini-remove" onClick={() => removeSpecial(name)} aria-label={`Remove ${name}`}>×</button></div>
                  {summary && <p>{summary}</p>}
                  {!bookSummary && <label><span>Custom Special rules text</span><textarea value={state.description ?? ''} onInput={(event) => patchSpecialState(name, { description: event.currentTarget.value })} placeholder="Describe what this Special does" /></label>}
                  <label><span>Configuration</span><input value={state.notes ?? ''} onInput={(event) => patchSpecialState(name, { notes: event.currentTarget.value })} placeholder="Chosen tag, status, exception, or note" /></label>
                  <label><span>Use tracking</span><select value={cadence} onChange={(event) => patchSpecialState(name, { cadence: event.currentTarget.value as AbilityState['cadence'] })}><option value="scene">Once per scene</option><option value="session">Once per session</option><option value="persistent">Persistent</option><option value="manual">Manual / no counter</option></select></label>
                  {(cadence === 'scene' || cadence === 'session') && (
                    <label class="ability-use-checkbox"><input type="checkbox" checked={cadence === 'scene' ? Boolean(state.usedScene) : Boolean(state.usedSession)} onChange={(event) => patchSpecialState(name, cadence === 'scene' ? { usedScene: event.currentTarget.checked } : { usedSession: event.currentTarget.checked })} /> <span>Marked used this {cadence}</span></label>
                  )}
                </article>
              );
            })}
          </div>
          <div class="inline-add custom-special-add"><input value={customSpecial} onInput={(event) => setCustomSpecial(event.currentTarget.value)} placeholder="Add a custom Special" /><button type="button" onClick={addCustomSpecial}>+</button></div>
          <p>Add a Special manually.</p>
        </details>

        <details class="drawer-section drawer-details danger-zone-details">
          <summary>Advanced</summary>
          <p>Default: four themes.</p>
          <button type="button" class="subtle-action danger-outline" onClick={removeTheme}>Remove this theme</button>
        </details>

        <details class="drawer-section drawer-details">
          <summary>Story-driven transformation</summary>
          <p>Available even when the normal tracks are not full.</p>
          <div class="drawer-action-row">
            <button type="button" class="subtle-action" onClick={() => develop('abandon')}>Replace now</button>
            <button type="button" class="subtle-action" onClick={() => develop('milestone')}>Evolve now</button>
          </div>
        </details>

        </div>

        <footer class="drawer-footer">
          <button type="button" class="button ghost" onClick={onClose}>Cancel</button>
          <button type="button" class="button primary" onClick={save}>Save changes</button>
        </footer>
      </aside>
    </div>
  );
}
