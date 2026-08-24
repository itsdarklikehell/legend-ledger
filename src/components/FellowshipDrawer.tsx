import { useMemo, useState } from 'preact/hooks';
import type { Fellowship, FellowshipRelationship, Hero, Might, Theme } from '../types';
import { addChronicle, emptyFellowshipTheme, makeTag, uid } from '../lib/rules';
import { mightOptions } from '../data/themebooks';
import { fellowshipSpecialImprovements } from '../data/advancement';
import { MistSyntaxHint } from './MistSyntaxHint';
import { useDismissTransition } from '../hooks/useDismissTransition';

interface FellowshipDrawerProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  onClose: () => void;
}

const fellowshipSpecials = fellowshipSpecialImprovements;


type DevelopmentMode = 'replace' | 'evolve' | null;

type ImprovementKind = 'power' | 'add-weakness' | 'remove-weakness' | 'special' | 'reset-abandon' | 'reset-milestone' | 'reset-both';

export function FellowshipDrawer({ hero, onChange, onClose: commitClose }: FellowshipDrawerProps) {
  const { closing, dismiss: onClose } = useDismissTransition(commitClose);
  const existing = hero.fellowship;
  const baseTheme = existing?.theme ?? emptyFellowshipTheme();
  const [name, setName] = useState(existing?.name ?? 'Our Fellowship');
  const [theme, setTheme] = useState<Theme>({ ...baseTheme, powerTags: baseTheme.powerTags.map((tag) => ({ ...tag })), weaknessTags: baseTheme.weaknessTags.map((tag) => ({ ...tag })), specialStates: { ...(baseTheme.specialStates ?? {}) } });
  const [relationships, setRelationships] = useState<FellowshipRelationship[]>(existing?.relationships.map((item) => ({ ...item, tag: { ...item.tag } })) ?? []);
  const [improvementText, setImprovementText] = useState('');
  const [selectedSpecial, setSelectedSpecial] = useState('');
  const [removeWeaknessId, setRemoveWeaknessId] = useState('');
  const [developmentMode, setDevelopmentMode] = useState<DevelopmentMode>(null);
  const [developmentTitle, setDevelopmentTitle] = useState(theme.title);
  const [developmentQuest, setDevelopmentQuest] = useState(theme.quest);
  const [developmentMight, setDevelopmentMight] = useState<Might>(theme.might);
  const [developmentWeakness, setDevelopmentWeakness] = useState(theme.weaknessTags[0]?.name ?? '');
  const [developmentTradeIds, setDevelopmentTradeIds] = useState<Set<string>>(new Set());

  const patchTheme = (patch: Partial<Theme>) => setTheme((current) => ({ ...current, ...patch }));
  const updatePower = (id: string, value: string) => patchTheme({ powerTags: theme.powerTags.map((tag) => tag.id === id ? { ...tag, name: value } : tag), title: theme.powerTags[0]?.id === id ? value : theme.title });
  const updateWeakness = (id: string, value: string) => patchTheme({ weaknessTags: theme.weaknessTags.map((tag) => tag.id === id ? { ...tag, name: value } : tag) });
  const builtInSpecial = useMemo(() => fellowshipSpecials.find((item) => item.name === selectedSpecial), [selectedSpecial]);
  const duplicateRelationshipHeroes = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    relationships.forEach((relationship) => {
      const label = relationship.heroName.trim();
      if (!label) return;
      const key = label.toLocaleLowerCase();
      const current = counts.get(key);
      counts.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + 1 });
    });
    return [...counts.values()].filter((item) => item.count > 1).map((item) => item.label);
  }, [relationships]);
  const evolutionTradeable = useMemo(() => [
    ...theme.powerTags.slice(3).map((tag) => ({ id: tag.id, label: `Power tag: ${tag.name}` })),
    ...theme.weaknessTags.slice(1).map((tag) => ({ id: tag.id, label: `Weakness: ${tag.name}` })),
    ...theme.specialImprovements.map((name) => ({ id: `special:${name}`, label: `Special: ${name}` })),
  ], [theme.powerTags, theme.weaknessTags, theme.specialImprovements]);

  const bankFullImprove = () => patchTheme({ improve: Math.max(0, theme.improve - 3), pendingImprovements: theme.pendingImprovements + 1 });

  const openDevelopment = (mode: Exclude<DevelopmentMode, null>) => {
    setDevelopmentMode(mode);
    setDevelopmentTitle(theme.title);
    setDevelopmentQuest(theme.quest);
    setDevelopmentMight(theme.might);
    setDevelopmentWeakness(theme.weaknessTags[0]?.name ?? '');
    setDevelopmentTradeIds(new Set());
  };

  const resolveDevelopment = () => {
    if (!developmentMode || !developmentTitle.trim()) return;
    if (developmentMode === 'replace') {
      const titleTag = { ...(theme.powerTags[0] ?? makeTag(developmentTitle.trim(), 'power')), name: developmentTitle.trim(), scratched: false };
      const weakness = { ...(theme.weaknessTags[0] ?? makeTag(developmentWeakness.trim(), 'weakness')), name: developmentWeakness.trim(), scratched: false };
      setTheme({
        ...theme,
        title: developmentTitle.trim(),
        might: developmentMight,
        quest: developmentQuest.trim(),
        powerTags: [titleTag],
        weaknessTags: developmentWeakness.trim() ? [weakness] : [],
        improve: 0,
        abandon: 0,
        milestone: 0,
        pendingImprovements: 0,
        nascentPowerTagsNeeded: 2,
        pendingNascentPowerTags: 0,
        specialImprovements: [],
        specialStates: {},
      });
    } else {
      const keptPower = theme.powerTags.filter((tag) => !developmentTradeIds.has(tag.id)).map((tag, index) => index === 0 ? { ...tag, name: developmentTitle.trim(), scratched: false } : { ...tag, scratched: false });
      const keptWeakness = theme.weaknessTags.filter((tag) => !developmentTradeIds.has(tag.id));
      const keptSpecials = theme.specialImprovements.filter((name) => !developmentTradeIds.has(`special:${name}`));
      setTheme({
        ...theme,
        title: developmentTitle.trim(),
        might: developmentMight,
        quest: developmentQuest.trim(),
        powerTags: keptPower,
        weaknessTags: keptWeakness,
        specialImprovements: keptSpecials,
        specialStates: Object.fromEntries(Object.entries(theme.specialStates ?? {}).filter(([name]) => keptSpecials.includes(name))),
        improve: 0,
        abandon: 0,
        milestone: 0,
        pendingImprovements: theme.pendingImprovements + developmentTradeIds.size,
        nascentPowerTagsNeeded: 0,
        pendingNascentPowerTags: 0,
      });
    }
    setDevelopmentMode(null);
  };

  const claimNascentPowerTag = () => {
    const value = improvementText.trim();
    if (!value || theme.pendingNascentPowerTags <= 0) return;
    setTheme({
      ...theme,
      powerTags: [...theme.powerTags, makeTag(value, 'power')],
      pendingNascentPowerTags: Math.max(0, theme.pendingNascentPowerTags - 1),
      nascentPowerTagsNeeded: Math.max(0, theme.nascentPowerTagsNeeded - 1),
    });
    setImprovementText('');
  };

  const spendImprovement = (kind: ImprovementKind) => {
    if (theme.pendingImprovements <= 0) return;
    let nextTheme = { ...theme, pendingImprovements: theme.pendingImprovements - 1 };
    if (kind === 'power') {
      if (!improvementText.trim()) return;
      nextTheme = { ...nextTheme, powerTags: [...theme.powerTags, makeTag(improvementText, 'power')] };
    }
    if (kind === 'add-weakness') {
      if (!improvementText.trim()) return;
      nextTheme = { ...nextTheme, weaknessTags: [...theme.weaknessTags, makeTag(improvementText, 'weakness')] };
    }
    if (kind === 'remove-weakness') {
      const targetId = removeWeaknessId || theme.weaknessTags[0]?.id;
      if (!targetId) return;
      nextTheme = { ...nextTheme, weaknessTags: theme.weaknessTags.filter((tag) => tag.id !== targetId) };
    }
    if (kind === 'special') {
      const specialName = selectedSpecial === '__custom__' ? improvementText.trim() : selectedSpecial;
      if (!specialName || theme.specialImprovements.includes(specialName)) return;
      nextTheme = { ...nextTheme, specialImprovements: [...theme.specialImprovements, specialName], specialStates: { ...theme.specialStates, [specialName]: {} } };
    }
    if (kind === 'reset-abandon') nextTheme = { ...nextTheme, abandon: 0 };
    if (kind === 'reset-milestone') nextTheme = { ...nextTheme, milestone: 0 };
    if (kind === 'reset-both') nextTheme = { ...nextTheme, abandon: 0, milestone: 0 };
    setTheme(nextTheme);
    setImprovementText('');
    setSelectedSpecial('');
    setRemoveWeaknessId('');
  };

  const addSpecialDirectly = () => {
    const specialName = improvementText.trim();
    if (!specialName || theme.specialImprovements.includes(specialName)) return;
    patchTheme({ specialImprovements: [...theme.specialImprovements, specialName], specialStates: { ...theme.specialStates, [specialName]: {} } });
    setImprovementText('');
  };

  const save = () => {
    const cleaned: Fellowship = {
      id: existing?.id ?? uid('fellowship'),
      name: name.trim() || 'Fellowship',
      theme: {
        ...theme,
        title: theme.title.trim(),
        typeId: 'fellowship',
        typeName: 'Fellowship',
        powerTags: theme.powerTags.map((tag, index) => ({ ...tag, name: index === 0 ? theme.title.trim() : tag.name.trim() })).filter((tag, index) => index === 0 || tag.name.length > 0),
        weaknessTags: theme.weaknessTags.map((tag) => ({ ...tag, name: tag.name.trim() })).filter((tag) => tag.name.length > 0),
        quest: theme.quest.trim(),
      },
      relationships: relationships.filter((item) => item.heroName.trim() || item.tag.name.trim()).map((item) => ({ ...item, heroName: item.heroName.trim(), tag: { ...item.tag, name: item.tag.name.trim(), storyMode: 'single-use' } })),
    };
    onChange(addChronicle({ ...hero, fellowship: cleaned }, `${existing ? 'Updated' : 'Created'} Fellowship ${cleaned.name}.`));
    onClose();
  };

  const remove = () => {
    if (!existing || !window.confirm('Remove the Fellowship from this local Hero sheet?')) return;
    onChange(addChronicle({ ...hero, fellowship: undefined }, `Removed Fellowship ${existing.name} from this sheet.`));
    onClose();
  };

  return <div class={`drawer-backdrop ${closing ? 'is-closing' : ''}`} role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}><aside class="sheet-drawer fellowship-drawer has-structured-scroll" role="dialog" aria-modal="true" aria-labelledby="fellowship-drawer-title">
    <header class="drawer-header"><div><p class="eyebrow">Shared sheet</p><h2 id="fellowship-drawer-title">Fellowship</h2></div><button type="button" class="drawer-close" onClick={onClose} aria-label="Close">×</button></header>
    <div class="drawer-scroll-region">
    <section class="drawer-section compact-edit-section">
      <label><span>Fellowship name</span><input value={name} onInput={(event) => setName(event.currentTarget.value)} /></label>
      <div class="compact-field-grid"><label><span>Theme title</span><input value={theme.title} onInput={(event) => patchTheme({ title: event.currentTarget.value, powerTags: theme.powerTags.map((tag, index) => index === 0 ? { ...tag, name: event.currentTarget.value } : tag) })} /></label><label><span>Might</span><select value={theme.might} onChange={(event) => patchTheme({ might: event.currentTarget.value as Might })}>{mightOptions.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div class="inline-tag-editor dynamic-tag-editor"><div class="inline-editor-heading"><span>Shared power tags</span><button type="button" onClick={() => patchTheme({ powerTags: [...theme.powerTags, makeTag('', 'power')] })}>+ tag</button></div>{theme.powerTags.map((tag, index) => <div class="tag-edit-row" key={tag.id}><input disabled={index === 0} value={index === 0 ? theme.title : tag.name} onInput={(event) => updatePower(tag.id, event.currentTarget.value)} />{index > 0 && <button type="button" class="mini-remove" onClick={() => patchTheme({ powerTags: theme.powerTags.filter((item) => item.id !== tag.id) })}>×</button>}</div>)}</div>
      <div class="inline-tag-editor dynamic-tag-editor"><div class="inline-editor-heading"><span>Shared weaknesses</span><button type="button" onClick={() => patchTheme({ weaknessTags: [...theme.weaknessTags, makeTag('', 'weakness')] })}>+ weakness</button></div>{theme.weaknessTags.map((tag) => <div class="tag-edit-row" key={tag.id}><input value={tag.name} onInput={(event) => updateWeakness(tag.id, event.currentTarget.value)} /><button type="button" class="mini-remove" onClick={() => patchTheme({ weaknessTags: theme.weaknessTags.filter((item) => item.id !== tag.id) })}>×</button></div>)}</div>
      <label><span>Quest</span><textarea value={theme.quest} onInput={(event) => patchTheme({ quest: event.currentTarget.value })} /></label>
      <MistSyntaxHint />
    </section>

    {(theme.improve >= 3 || theme.abandon >= 3 || theme.milestone >= 3) && <section class="drawer-section ready-section"><strong>Fellowship development ready</strong><div class="drawer-action-row">{theme.improve >= 3 && <button type="button" onClick={bankFullImprove}>Gain improvement</button>}{theme.abandon >= 3 && <button type="button" onClick={() => openDevelopment('replace')}>Replace theme</button>}{theme.milestone >= 3 && <button type="button" onClick={() => openDevelopment('evolve')}>Evolve theme</button>}</div><small>Fellowship development follows the same tracks as a Hero theme, but never creates Promise.</small></section>}

    {developmentMode && <section class="drawer-section fellowship-development-editor"><div class="drawer-section-title"><strong>{developmentMode === 'replace' ? 'Replace Fellowship theme' : 'Evolve Fellowship theme'}</strong><span>{developmentMode === 'replace' ? 'Start a new nascent shared identity.' : 'Revise what the Fellowship has become.'}</span></div><div class="compact-field-grid"><label><span>New title</span><input value={developmentTitle} onInput={(event) => setDevelopmentTitle(event.currentTarget.value)} /></label><label><span>Might</span><select value={developmentMight} onChange={(event) => setDevelopmentMight(event.currentTarget.value as Might)}>{mightOptions.map((item) => <option key={item}>{item}</option>)}</select></label></div><label><span>Quest</span><textarea value={developmentQuest} onInput={(event) => setDevelopmentQuest(event.currentTarget.value)} /></label>{developmentMode === 'replace' && <label><span>Starting weakness</span><input value={developmentWeakness} onInput={(event) => setDevelopmentWeakness(event.currentTarget.value)} /></label>}{developmentMode === 'evolve' && developmentMight === theme.might && developmentTitle.trim() === theme.title.trim() && <p class="soft-rule-note">Standard evolution changes the theme’s scale or identity. Keeping both unchanged is still available as a table ruling.</p>}{developmentMode === 'evolve' && evolutionTradeable.length > 0 && <details class="fellowship-evolution-trades"><summary>Trade old features for improvements <span>optional</span></summary>{evolutionTradeable.map((item) => <label key={item.id}><input type="checkbox" checked={developmentTradeIds.has(item.id)} onChange={() => setDevelopmentTradeIds((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} /><span>{item.label}</span></label>)}<small>{developmentTradeIds.size} Fellowship improvement{developmentTradeIds.size === 1 ? '' : 's'} will be ready after evolution. Fellowship never gains Promise.</small></details>}<div class="drawer-action-row"><button type="button" class="button ghost" onClick={() => setDevelopmentMode(null)}>Cancel</button><button type="button" class="button secondary" onClick={resolveDevelopment}>Apply {developmentMode === 'replace' ? 'replacement' : 'evolution'}</button></div></section>}

    {theme.pendingNascentPowerTags > 0 && <section class="drawer-section ready-section"><strong>Nascent Fellowship theme</strong><p class="soft-rule-note">The next two times this theme would mark Improve, it gains a power tag instead. {theme.nascentPowerTagsNeeded} still needed.</p><div class="compact-field-grid"><label><span>New power tag</span><input value={improvementText} onInput={(event) => setImprovementText(event.currentTarget.value)} placeholder="A new shared strength" /></label><button type="button" disabled={!improvementText.trim()} onClick={claimNascentPowerTag}>Add power tag</button></div></section>}

    {theme.pendingImprovements > 0 && <section class="drawer-section ready-section"><strong>{theme.pendingImprovements} Fellowship improvement{theme.pendingImprovements === 1 ? '' : 's'} ready</strong><p class="soft-rule-note">Choose a standard improvement or use the manual Special option for a table-specific rule.</p><div class="fellowship-improvement-grid"><label><span>New tag / weakness text</span><input value={improvementText} onInput={(event) => setImprovementText(event.currentTarget.value)} placeholder="New power tag or weakness" /></label><div class="drawer-action-row"><button type="button" disabled={!improvementText.trim()} onClick={() => spendImprovement('power')}>Add power tag</button><button type="button" disabled={!improvementText.trim()} onClick={() => spendImprovement('add-weakness')}>Add weakness</button></div>{theme.weaknessTags.length > 0 && <div class="compact-field-grid"><label><span>Remove weakness</span><select value={removeWeaknessId} onChange={(event) => setRemoveWeaknessId(event.currentTarget.value)}><option value="">Choose weakness</option>{theme.weaknessTags.map((tag) => <option value={tag.id} key={tag.id}>{tag.name}</option>)}</select></label><button type="button" disabled={!removeWeaknessId} onClick={() => spendImprovement('remove-weakness')}>Remove</button></div>}<label><span>Special Improvement</span><select value={selectedSpecial} onChange={(event) => setSelectedSpecial(event.currentTarget.value)}><option value="">Choose Special</option>{fellowshipSpecials.filter((item) => !theme.specialImprovements.includes(item.name)).map((item) => <option value={item.name} key={item.name}>{item.name}</option>)}<option value="__custom__">Custom Special…</option></select></label>{builtInSpecial && <p class="special-rule-preview">{builtInSpecial.summary}</p>}{selectedSpecial === '__custom__' && <input value={improvementText} onInput={(event) => setImprovementText(event.currentTarget.value)} placeholder="Custom Special name" />}<button type="button" disabled={!selectedSpecial || (selectedSpecial === '__custom__' && !improvementText.trim())} onClick={() => spendImprovement('special')}>Gain Special</button><div class="drawer-action-row"><button type="button" onClick={() => spendImprovement('reset-abandon')}>Reset Abandon</button><button type="button" onClick={() => spendImprovement('reset-milestone')}>Reset Milestone</button><button type="button" onClick={() => spendImprovement('reset-both')}>Reset both</button></div></div></section>}

    <details class="drawer-section drawer-details" open><summary>Relationships · {relationships.length}</summary><div class="relationship-editor-list">{relationships.map((relationship) => <div class="relationship-edit-row" key={relationship.id}><input value={relationship.heroName} onInput={(event) => setRelationships((current) => current.map((item) => item.id === relationship.id ? { ...item, heroName: event.currentTarget.value } : item))} placeholder="Hero" /><input value={relationship.tag.name} onInput={(event) => setRelationships((current) => current.map((item) => item.id === relationship.id ? { ...item, tag: { ...item.tag, name: event.currentTarget.value } } : item))} placeholder="Relationship tag" /><label><input type="checkbox" checked={Boolean(relationship.tag.scratched)} onChange={(event) => setRelationships((current) => current.map((item) => item.id === relationship.id ? { ...item, tag: { ...item.tag, scratched: event.currentTarget.checked } } : item))} /> used</label><button type="button" class="mini-remove" onClick={() => setRelationships((current) => current.filter((item) => item.id !== relationship.id))}>×</button></div>)}</div>{duplicateRelationshipHeroes.length > 0 && <p class="soft-rule-note">Standard Fellowship setup usually keeps one relationship tag per other Hero. Multiple tags are currently recorded for {duplicateRelationshipHeroes.join(', ')}; keep them if that better reflects your table.</p>}<button type="button" class="subtle-action" onClick={() => setRelationships((current) => [...current, { id: uid('relationship'), heroName: '', tag: { ...makeTag('', 'story'), storyMode: 'single-use' } }])}>+ relationship</button></details>

    <details class="drawer-section drawer-details"><summary>Special Improvements · {theme.specialImprovements.length}</summary><div class="ability-config-list">{theme.specialImprovements.map((item) => { const definition = fellowshipSpecials.find((special) => special.name === item); return <article key={item}><div class="ability-config-heading"><strong>{item}</strong><button type="button" class="mini-remove" onClick={() => patchTheme({ specialImprovements: theme.specialImprovements.filter((name) => name !== item), specialStates: Object.fromEntries(Object.entries(theme.specialStates).filter(([name]) => name !== item)) })}>×</button></div>{definition && <p>{definition.summary}</p>}</article>; })}</div><div class="inline-add custom-special-add"><input value={improvementText} onInput={(event) => setImprovementText(event.currentTarget.value)} placeholder="Custom Special" /><button type="button" onClick={addSpecialDirectly}>+</button></div><small>Manual Specials remain available for custom Fellowship rules.</small></details>
    </div>
    <footer class="drawer-footer">{existing && <button type="button" class="button ghost danger-text" onClick={remove}>Remove</button>}<span /><button type="button" class="button ghost" onClick={onClose}>Cancel</button><button type="button" class="button primary" onClick={save}>Save</button></footer>
  </aside></div>;
}
