import { useMemo, useState } from 'preact/hooks';
import type { Hero, Might, Theme } from '../types';
import { mightOptions, themebookById, themebooks } from '../data/themebooks';
import { emptyTheme, makeTag, uid } from '../lib/rules';
import { MightIcon } from './Icons';
import { PortraitPicker } from './PortraitPicker';

interface CreateHeroProps {
  initial?: Hero | null;
  mode?: 'create' | 'reforge' | 'successor';
  onSave: (hero: Hero) => void;
  onCancel?: () => void;
}

const normalizedTheme = (theme: Theme): Theme => ({
  ...theme,
  powerTags: [...theme.powerTags],
  weaknessTags: [...theme.weaknessTags],
  specialImprovements: [...theme.specialImprovements],
  specialStates: { ...(theme.specialStates ?? {}) },
  pendingImprovements: theme.pendingImprovements ?? 0,
  nascentPowerTagsNeeded: theme.nascentPowerTagsNeeded ?? 0,
  pendingNascentPowerTags: theme.pendingNascentPowerTags ?? 0,
});

export function CreateHero({ initial, mode = 'create', onSave, onCancel }: CreateHeroProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [pronouns, setPronouns] = useState(initial?.pronouns ?? '');
  const [concept, setConcept] = useState(initial?.concept ?? '');
  const [portrait, setPortrait] = useState(initial?.portrait ?? '');
  const [backpack, setBackpack] = useState(initial?.backpack[0]?.name ?? '');
  const [themes, setThemes] = useState<Theme[]>(
    initial?.themes.map(normalizedTheme) ?? Array.from({ length: 4 }, (_, index) => emptyTheme(index)),
  );
  const [activeTheme, setActiveTheme] = useState(0);

  const theme = themes[activeTheme] ?? themes[0];
  const themebook = theme ? themebookById[theme.typeId] ?? (theme.typeId === 'custom' ? undefined : themebooks[0]) : themebooks[0];

  const canSave = useMemo(
    () => name.trim().length > 0 && themes.length > 0 && themes.every((item) => item.title.trim().length > 0),
    [name, themes],
  );
  const standardSetupNotes = useMemo(() => {
    const notes: string[] = [];
    if (themes.length !== 4) notes.push(`${themes.length} themes (standard start: 4)`);
    themes.forEach((item, index) => {
      const label = item.title.trim() || `Theme ${index + 1}`;
      const powerCount = item.powerTags.filter((tag) => tag.name.trim()).length;
      if (powerCount < 3) notes.push(`${label}: ${powerCount}/3 starting power tags`);
      if (!item.weaknessTags.some((tag) => tag.name.trim())) notes.push(`${label}: no starting weakness`);
      if (!item.quest.trim()) notes.push(`${label}: no Quest`);
    });
    if (!backpack.trim()) notes.push('No starting backpack tag');
    return notes;
  }, [themes, backpack]);

  const patchTheme = (index: number, patch: Partial<Theme>) => {
    setThemes((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const addTableTheme = () => {
    setThemes((current) => {
      const next = emptyTheme(current.length);
      const title = `Theme ${current.length + 1}`;
      next.title = title;
      next.powerTags = next.powerTags.map((tag, index) => index === 0 ? { ...tag, name: title } : tag);
      setActiveTheme(current.length);
      return [...current, next];
    });
  };

  const removeActiveTheme = () => {
    setThemes((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((_, index) => index !== activeTheme);
      setActiveTheme(Math.max(0, Math.min(activeTheme, next.length - 1)));
      return next;
    });
  };

  const changeThemebook = (index: number, typeId: string) => {
    const current = themes[index];
    if (!current) return;
    const book = themebookById[typeId];
    patchTheme(index, {
      typeId,
      typeName: typeId === 'custom' ? current.typeName || 'Custom theme' : '',
      might: book?.fixedMight ?? current.might,
    });
  };

  const setPowerTag = (themeIndex: number, tagIndex: number, nameValue: string) => {
    const current = themes[themeIndex];
    if (!current) return;
    const powerTags = [...current.powerTags];
    const existing = powerTags[tagIndex] ?? makeTag('', 'power');
    powerTags[tagIndex] = { ...existing, name: nameValue };
    patchTheme(themeIndex, { powerTags });
  };

  const setWeakness = (themeIndex: number, nameValue: string) => {
    const current = themes[themeIndex];
    if (!current) return;
    const weaknessTags = [...current.weaknessTags];
    const weakness = weaknessTags[0] ?? makeTag('', 'weakness');
    weaknessTags[0] = { ...weakness, name: nameValue };
    patchTheme(themeIndex, { weaknessTags });
  };

  const save = () => {
    if (!canSave) return;
    const hero: Hero = {
      id: initial?.id ?? uid('hero'),
      name: name.trim(),
      pronouns: pronouns.trim(),
      concept: concept.trim(),
      portrait: portrait || undefined,
      themes: themes.map((item) => ({
        ...item,
        title: item.title.trim(),
        powerTags: item.powerTags.map((tag) => ({ ...tag, name: tag.name.trim() })),
        weaknessTags: item.weaknessTags.map((tag) => ({ ...tag, name: tag.name.trim() })),
        quest: item.quest.trim(),
      })),
      backpack: initial?.backpack.length
        ? (backpack.trim() ? initial.backpack.map((tag, index) => (index === 0 ? { ...tag, name: backpack.trim() } : tag)) : initial.backpack.slice(1))
        : (backpack.trim() ? [makeTag(backpack.trim(), 'story')] : []),
      sceneTags: initial?.sceneTags ?? [],
      worldTags: initial?.worldTags ?? [],
      statuses: initial?.statuses ?? [],
      fellowship: initial?.fellowship,
      safeHavens: initial?.safeHavens ?? [],
      legacyNotes: initial?.legacyNotes ?? [],
      pastThemes: initial?.pastThemes ?? [],
      previousAction: initial?.previousAction,
      promise: initial?.promise ?? 0,
      fulfillmentCredits: initial?.fulfillmentCredits ?? 0,
      fulfillmentHistory: initial?.fulfillmentHistory ?? [],
      quintessences: initial?.quintessences ?? [],
      globalImprovementCredits: initial?.globalImprovementCredits ?? 0,
      globalSpecialImprovementCredits: initial?.globalSpecialImprovementCredits ?? 0,
      savedMagicPower: initial?.savedMagicPower ?? 0,
      savedPackingPower: initial?.savedPackingPower ?? 0,
      lostPowerTags: initial?.lostPowerTags ?? [],
      retired: initial?.retired,
      chronicle: initial?.chronicle ?? [],
    };
    onSave(hero);
  };

  if (!theme) return null;

  return (
    <div class="creator-shell">
      <div class="creator-paper">
        <header class="creator-header">
          <div>
            <p class="eyebrow">Hero creation</p>
            <h1>{mode === 'reforge' ? 'Be Reforged' : mode === 'successor' ? 'Create a successor' : 'Begin a new legend'}</h1>
            <p>
              {mode === 'reforge'
                ? 'Reforging rebuilds four themes like a new Hero. Carried free improvements can be assigned from Journey afterward.'
                : mode === 'successor'
                  ? `This optional replacement Hero starts fresh while carrying ${initial?.globalImprovementCredits ?? 0} free improvement${initial?.globalImprovementCredits === 1 ? '' : 's'} and ${initial?.promise ?? 0} Promise from the retired Hero. Adjust anything afterward if your table rules it differently.`
                  : 'A new Hero begins with four themes, each with a title tag, two more power tags, one weakness tag, and a Quest.'}
            </p>
          </div>
        </header>

        <section class="identity-grid">
          <label>
            <span>Name</span>
            <input value={name} onInput={(event) => setName(event.currentTarget.value)} placeholder="Hero name" />
          </label>
          <label>
            <span>Pronouns</span>
            <input value={pronouns} onInput={(event) => setPronouns(event.currentTarget.value)} placeholder="Optional" />
          </label>
          <label class="identity-concept">
            <span>One-line concept</span>
            <input
              value={concept}
              onInput={(event) => setConcept(event.currentTarget.value)}
              placeholder="A hunter with a secret, a village fool with uncanny luck…"
            />
          </label>
          <label>
            <span>Starting backpack tag</span>
            <input
              value={backpack}
              onInput={(event) => setBackpack(event.currentTarget.value)}
              placeholder="One story-important item"
            />
          </label>
          <PortraitPicker value={portrait} onChange={setPortrait} />
        </section>

        <nav class="theme-stepper" aria-label="Themes">
          {themes.map((item, index) => (
            <button
              type="button"
              class={activeTheme === index ? 'is-active' : ''}
              onClick={() => setActiveTheme(index)}
              key={item.id}
            >
              <span>{index + 1}</span>
              {item.title || `Theme ${index + 1}`}
            </button>
          ))}
        </nav>

        <details class="creator-table-override">
          <summary>Advanced · {themes.length} theme{themes.length === 1 ? '' : 's'}</summary>
          <div><span>Standard start: four themes. Change this to fit your table.</span><button type="button" onClick={addTableTheme}>+ Theme</button><button type="button" disabled={themes.length <= 1} onClick={removeActiveTheme}>Remove current</button></div>
        </details>

        <section class={`creator-theme might-${theme.might.toLowerCase()}`}>
          <div class="themebook-pick">
            <label>
              <span>Themebook</span>
              <select value={theme.typeId} onChange={(event) => changeThemebook(activeTheme, event.currentTarget.value)}>
                {themebooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.name}{book.fixedMight ? ` · ${book.fixedMight} Might` : ' · variable Might'}
                  </option>
                ))}
                <option value="custom">Custom theme type…</option>
              </select>
            </label>
            <label>
              <span>Might</span>
              <select
                value={theme.might}
                onChange={(event) => patchTheme(activeTheme, { might: event.currentTarget.value as Might })}
              >
                {mightOptions.map((might) => (
                  <option key={might}>{might}</option>
                ))}
              </select>
            </label>
            <div class="themebook-summary">
              <MightIcon might={theme.might} className="creator-might-icon" title={`${theme.might} Might`} />
              <div>
                <strong>{theme.typeId === 'custom' ? (theme.typeName || 'Custom theme') : themebook?.name}</strong>
                <span>{theme.typeId === 'custom' ? 'Create your own theme type.' : themebook?.summary}</span>
              </div>
            </div>
          </div>
          {theme.typeId === 'custom' && <label class="custom-theme-type-field"><span>Custom theme type</span><input value={theme.typeName ?? ''} onInput={(event) => patchTheme(activeTheme, { typeName: event.currentTarget.value })} placeholder="Theme type name" /></label>}
          {themebook?.fixedMight && theme.might !== themebook.fixedMight && <p class="soft-rule-note">Themebook default: {themebook.fixedMight} Might.</p>}

          <div class="theme-fields">
            <label class="field-title">
              <span>Title tag</span>
              <input
                value={theme.powerTags[0]?.name ?? ''}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setPowerTag(activeTheme, 0, value);
                  patchTheme(activeTheme, { title: value });
                }}
                placeholder={themebook ? themebook.titlePrompt : 'The theme’s defining tag'}
              />
              {themebook && <small>{themebook.titlePrompt}</small>}
            </label>

            {[1, 2].map((tagIndex) => (
              <label key={tagIndex}>
                <span>Power tag {tagIndex + 1}</span>
                <input
                  value={theme.powerTags[tagIndex]?.name ?? ''}
                  onInput={(event) => setPowerTag(activeTheme, tagIndex, event.currentTarget.value)}
                  placeholder={
                    themebook
                      ? themebook.powerPrompts[(tagIndex - 1) % themebook.powerPrompts.length]
                      : 'A useful detail of this theme'
                  }
                />
                {themebook && <small>{themebook.powerPrompts[(tagIndex - 1) % themebook.powerPrompts.length]}</small>}
              </label>
            ))}

            <label class="weakness-field">
              <span>Weakness tag</span>
              <input
                value={theme.weaknessTags[0]?.name ?? ''}
                onInput={(event) => setWeakness(activeTheme, event.currentTarget.value)}
                placeholder={themebook ? themebook.weaknessPrompts[0] : 'A way this theme works against you'}
              />
              {themebook && <small>{themebook.weaknessPrompts[0]}</small>}
            </label>

            <label class="quest-field">
              <span>Quest</span>
              <textarea
                value={theme.quest}
                onInput={(event) => patchTheme(activeTheme, { quest: event.currentTarget.value })}
                placeholder={themebook ? themebook.questHints[0] : 'What do you seek, defend, uphold, or need to know?'}
              />
              {themebook && (
                <small>Ideas: {themebook.questHints.join(' · ')}</small>
              )}
            </label>
          </div>
        </section>

        <footer class="creator-footer">
          <div class="creation-check">
            <span class={canSave ? (standardSetupNotes.length === 0 ? 'check-good' : 'check-advisory') : ''}>{canSave ? (standardSetupNotes.length === 0 ? 'Ready' : `Ready · ${standardSetupNotes.length} standard setup note${standardSetupNotes.length === 1 ? '' : 's'}`) : 'Name the Hero and every theme currently on the sheet'}</span>
            {canSave && standardSetupNotes.length > 0 && <details class="creation-standard-notes"><summary>Review standard setup</summary><p>The sheet will still save this Hero. These are reminders, not restrictions.</p><ul>{standardSetupNotes.slice(0, 8).map((note) => <li key={note}>{note}</li>)}</ul>{standardSetupNotes.length > 8 && <small>+ {standardSetupNotes.length - 8} more</small>}</details>}
          </div>
          <div class="button-row">
            {onCancel && (
              <button type="button" class="button ghost" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button type="button" class="button primary" disabled={!canSave} onClick={save}>
              {mode === 'reforge' ? 'Complete reforging' : mode === 'successor' ? 'Create successor' : 'Create hero'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
