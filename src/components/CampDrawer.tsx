import { useMemo, useState } from 'preact/hooks';
import type { Hero, Tag } from '../types';
import { addChronicle, hasQuintessence, makeTag, markFellowshipImprove, markImprove, reduceStatus, statusTier, uid } from '../lib/rules';
import { useDismissTransition } from '../hooks/useDismissTransition';

interface CampDrawerProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  onClose: () => void;
}

type Activity = 'rest' | 'reflect' | 'action';
type StayMode = 'camp' | 'sojourn';
type HavenTagUse = 'none' | 'invoke' | 'burn';

interface PeriodState {
  activity: Activity;
  themeId: string;
  note: string;
  power: string;
  havenTagUse: HavenTagUse;
  teamwork: boolean;
}

const newPeriod = (themeId: string, activity: Activity): PeriodState => ({ activity, themeId, note: '', power: '', havenTagUse: 'none', teamwork: false });

export function CampDrawer({ hero, onChange, onClose: commitClose }: CampDrawerProps) {
  const { closing, dismiss: onClose } = useDismissTransition(commitClose);
  const firstThemeId = hero.themes[0]?.id ?? '';
  const [mode, setMode] = useState<StayMode>('camp');
  const [duration, setDuration] = useState<'days' | 'weeks' | 'months'>('days');
  const [thirdPeriod, setThirdPeriod] = useState(false);
  const [safeHavenId, setSafeHavenId] = useState('');
  const [periods, setPeriods] = useState<PeriodState[]>([
    newPeriod(firstThemeId, 'rest'),
    newPeriod(firstThemeId, 'reflect'),
    newPeriod(firstThemeId, 'action'),
  ]);
  const [qualityTagId, setQualityTagId] = useState('');
  const [qualityTagText, setQualityTagText] = useState('');
  const [relationshipHero, setRelationshipHero] = useState('');
  const [relationshipTag, setRelationshipTag] = useState('');
  const [campfireStatusId, setCampfireStatusId] = useState('');
  const [campfireUsed, setCampfireUsed] = useState(false);

  const activePeriods = periods.slice(0, thirdPeriod ? 3 : 2);
  const restCount = activePeriods.filter((period) => period.activity === 'rest').length;
  const reflectCount = activePeriods.filter((period) => period.activity === 'reflect').length;
  const selectedHaven = hero.safeHavens.find((haven) => haven.id === safeHavenId);
  const safeThirdPeriod = selectedHaven?.benefit === 'safe-third-period';
  const havenAdvantage = selectedHaven?.benefit === 'permanent-tag' ? selectedHaven.advantageTag : undefined;
  const sojournBonus = mode === 'sojourn' ? duration === 'months' ? 3 : duration === 'weeks' ? 2 : 1 : 0;
  const hasMagus = hasQuintessence(hero, 'Magus Magnificent');
  const hasBearer = hasQuintessence(hero, 'The Bearer');
  const fellowshipSpecials = hero.fellowship?.theme.specialImprovements ?? [];
  const hasTeamwork = fellowshipSpecials.includes('Teamwork');
  const hasCampfireStories = fellowshipSpecials.includes('Campfire Stories');

  const fellowshipTags = useMemo(() => hero.fellowship ? [
    ...hero.fellowship.theme.powerTags.map((tag) => ({ tag, kind: 'power' as const })),
    ...hero.fellowship.theme.weaknessTags.map((tag) => ({ tag, kind: 'weakness' as const })),
  ] : [], [hero.fellowship]);

  const patchPeriod = (index: number, patch: Partial<PeriodState>) => setPeriods((current) => current.map((period, slot) => slot === index ? { ...period, ...patch } : period));

  const recoverTag = (themeId: string, tagId: string, fellowship = false) => {
    if (fellowship && hero.fellowship) {
      const tag = hero.fellowship.theme.powerTags.find((item) => item.id === tagId);
      if (!tag) return;
      const nextTheme = { ...hero.fellowship.theme, powerTags: hero.fellowship.theme.powerTags.map((powerTag) => powerTag.id === tagId ? { ...powerTag, scratched: false } : powerTag) };
      onChange(addChronicle({ ...hero, fellowship: { ...hero.fellowship, theme: nextTheme } }, `Rest: recovered Fellowship tag ${tag.name}.`));
      return;
    }
    const theme = hero.themes.find((item) => item.id === themeId);
    const tag = theme?.powerTags.find((item) => item.id === tagId);
    if (!theme || !tag) return;
    const next = { ...hero, themes: hero.themes.map((item) => item.id === themeId ? { ...item, powerTags: item.powerTags.map((powerTag) => powerTag.id === tagId ? { ...powerTag, scratched: false } : powerTag) } : item) };
    onChange(addChronicle(next, `Rest: recovered ${tag.name}.`));
  };

  const expireStatus = (statusId: string) => {
    const status = hero.statuses.find((item) => item.id === statusId);
    if (!status) return;
    onChange(addChronicle({ ...hero, statuses: hero.statuses.filter((item) => item.id !== statusId) }, `Rest: expired ${status.name}.`));
  };

  const expireStoryTag = (tag: Tag, source: 'scene' | 'backpack') => {
    const next = source === 'scene'
      ? { ...hero, sceneTags: hero.sceneTags.filter((item) => item.id !== tag.id) }
      : { ...hero, backpack: hero.backpack.filter((item) => item.id !== tag.id) };
    onChange(addChronicle(next, `${mode === 'camp' ? 'Camp' : 'Sojourn'}: expired ${tag.name}.`));
  };

  const applyReflect = (themeId: string) => {
    if (themeId === 'fellowship' && hero.fellowship) {
      const nextTheme = mode === 'camp'
        ? markFellowshipImprove(hero.fellowship.theme, 1)
        : { ...hero.fellowship.theme, pendingImprovements: hero.fellowship.theme.pendingImprovements + 1 };
      onChange(addChronicle({ ...hero, fellowship: { ...hero.fellowship, theme: nextTheme } }, `${mode === 'camp' ? 'Camp' : 'Sojourn'} Reflect: Fellowship ${mode === 'camp' ? 'marked Improve' : 'gained an improvement'}.`));
      return;
    }
    const theme = hero.themes.find((item) => item.id === themeId);
    if (!theme) return;
    const next = mode === 'camp'
      ? markImprove(hero, themeId, 1)
      : { ...hero, themes: hero.themes.map((item) => item.id === themeId ? { ...item, pendingImprovements: item.pendingImprovements + 1 } : item) };
    onChange(addChronicle(next, `${mode === 'camp' ? 'Camp' : 'Sojourn'} Reflect: ${theme.title} ${mode === 'camp' ? 'marked Improve' : 'gained an improvement'}.`));
  };

  const campActionMath = (period: PeriodState) => {
    const counted = Number.parseInt(period.power, 10) || 0;
    const havenBonus = havenAdvantage && period.havenTagUse !== 'none' ? (period.havenTagUse === 'burn' ? 3 : 1) : 0;
    const teamworkBonus = hasTeamwork && period.teamwork ? 1 : 0;
    const total = counted + sojournBonus + havenBonus + teamworkBonus;
    return { counted, havenBonus, teamworkBonus, total, safeSpend: total >= 1 ? Math.ceil(total / 2) : 0 };
  };

  const logCampAction = (period: PeriodState, index: number, resolution: 'roll' | 'safe-spend' = 'roll') => {
    const { havenBonus, teamworkBonus, total, safeSpend } = campActionMath(period);
    const note = period.note.trim() || 'Camp action';
    const stay = mode === 'camp' ? 'Camp' : `Sojourn (${duration})`;
    const havenText = havenBonus && havenAdvantage ? ` ${period.havenTagUse === 'burn' ? 'Burned' : 'Invoked'} safe-haven tag ${havenAdvantage.name} for +${havenBonus}.` : '';
    const teamworkText = teamworkBonus ? ' Teamwork +1.' : '';
    const resolutionText = resolution === 'safe-spend'
      ? ` Spent ${safeSpend} Power without rolling (half of ${total}, rounded up).`
      : ` Resolve normally at Power ${total}.`;
    onChange(addChronicle(hero, `${stay} period ${index + 1}: ${note}.${resolutionText}${havenText}${teamworkText}`));
  };

  const savePower = (period: PeriodState, kind: 'magic' | 'packing') => {
    const { safeSpend } = campActionMath(period);
    if (safeSpend <= 0) return;
    const key = kind === 'magic' ? 'savedMagicPower' : 'savedPackingPower';
    const label = kind === 'magic' ? 'Magus Magnificent' : 'The Bearer';
    onChange(addChronicle({ ...hero, [key]: safeSpend }, `${label}: saved ${safeSpend} Power${period.note.trim() ? ` from ${period.note.trim()}` : ''}. Any previous saved ${kind === 'magic' ? 'magic' : 'packing'} Power expired.`));
  };

  const rephraseFellowshipTag = () => {
    if (!hero.fellowship || !qualityTagId || !qualityTagText.trim()) return;
    const original = fellowshipTags.find((entry) => entry.tag.id === qualityTagId);
    if (!original) return;
    const nextTheme = original.kind === 'power'
      ? { ...hero.fellowship.theme, powerTags: hero.fellowship.theme.powerTags.map((tag) => tag.id === qualityTagId ? { ...tag, name: qualityTagText.trim() } : tag) }
      : { ...hero.fellowship.theme, weaknessTags: hero.fellowship.theme.weaknessTags.map((tag) => tag.id === qualityTagId ? { ...tag, name: qualityTagText.trim() } : tag) };
    onChange(addChronicle({ ...hero, fellowship: { ...hero.fellowship, theme: nextTheme } }, `Fellowship quality time: ${original.tag.name} rephrased as ${qualityTagText.trim()}.`));
    setQualityTagText('');
  };

  const addRelationship = () => {
    if (!hero.fellowship || !relationshipHero.trim() || !relationshipTag.trim()) return;
    const relationship = {
      id: uid('relationship'),
      heroName: relationshipHero.trim(),
      tag: { ...makeTag(relationshipTag.trim(), 'story'), storyMode: 'single-use' as const },
    };
    onChange(addChronicle({ ...hero, fellowship: { ...hero.fellowship, relationships: [...hero.fellowship.relationships, relationship] } }, `Fellowship quality time: relationship with ${relationship.heroName} added as ${relationship.tag.name}.`));
    setRelationshipHero('');
    setRelationshipTag('');
  };

  const applyCampfireStory = () => {
    const status = hero.statuses.find((item) => item.id === campfireStatusId);
    if (!status) return;
    const reduced = reduceStatus(status, 1);
    const statuses = reduced.marks.length > 0
      ? hero.statuses.map((item) => item.id === status.id ? reduced : item)
      : hero.statuses.filter((item) => item.id !== status.id);
    onChange(addChronicle({ ...hero, statuses }, `Campfire Stories: ${status.name}-${statusTier(status)} reduced by one tier${campfireUsed ? ' again as a table ruling' : ''}.`));
    setCampfireUsed(true);
  };

  const activityCard = (period: PeriodState, index: number) => {
    const math = campActionMath(period);
    return (
      <article class="camp-period" key={index}>
        <header><strong>Period {index + 1}</strong>{index === 2 && <small>{safeThirdPeriod ? `safe at ${selectedHaven?.name}` : 'optional · standard play adds Consequences'}</small>}</header>
        <div class="choice-tabs camp-activity-tabs">{(['rest', 'reflect', 'action'] as Activity[]).map((activity) => <button type="button" class={period.activity === activity ? 'is-active' : ''} onClick={() => patchPeriod(index, { activity })} key={activity}>{activity === 'action' ? 'Camp action' : activity[0]?.toUpperCase() + activity.slice(1)}</button>)}</div>
        {period.activity === 'rest' && <div class="camp-mini-help"><p>Recover or expire what makes sense in the fiction using Rest & recovery below.</p></div>}
        {period.activity === 'reflect' && <div class="camp-reflect-row"><select value={period.themeId} onChange={(event) => patchPeriod(index, { themeId: event.currentTarget.value })}>{hero.themes.map((theme) => <option value={theme.id} key={theme.id}>{theme.title}</option>)}{hero.fellowship && <option value="fellowship">Fellowship</option>}</select><button type="button" onClick={() => applyReflect(period.themeId)}>{mode === 'camp' ? 'Mark Improve' : 'Gain improvement'}</button></div>}
        {period.activity === 'action' && <div class="camp-action-stack">
          <input value={period.note} onInput={(event) => patchPeriod(index, { note: event.currentTarget.value })} placeholder="Craft, heal, research, prepare, pack…" />
          <div class="camp-action-row"><label class="camp-power-field"><span>Counted Power</span><input class="camp-power-input" type="number" value={period.power} onInput={(event) => patchPeriod(index, { power: event.currentTarget.value })} placeholder="0" /></label>{sojournBonus > 0 && <span class="camp-power-chip">Sojourn +{sojournBonus}</span>}{havenAdvantage && <label class="camp-haven-tag-use"><span>{havenAdvantage.name}</span><select value={period.havenTagUse} onChange={(event) => patchPeriod(index, { havenTagUse: event.currentTarget.value as HavenTagUse })}><option value="none">Not invoked</option><option value="invoke">Invoke +1</option><option value="burn">Burn +3 · remains</option></select></label>}{hasTeamwork && <label class="camp-teamwork-toggle" title="Teamwork applies when two or more Heroes take the same camp or sojourn action. You decide whether this action qualifies."><input type="checkbox" checked={period.teamwork} onChange={(event) => patchPeriod(index, { teamwork: event.currentTarget.checked })} /><span>Teamwork +1</span></label>}<strong class="camp-total-power">Power {math.total >= 0 ? '+' : ''}{math.total}</strong></div>
          <div class="drawer-action-row camp-resolution-actions"><button type="button" onClick={() => logCampAction(period, index, 'roll')}>Record normal roll</button><button type="button" disabled={math.safeSpend <= 0} onClick={() => logCampAction(period, index, 'safe-spend')}>Spend {math.safeSpend} safely</button>{hasMagus && math.safeSpend > 0 && <button type="button" class="quiet" onClick={() => savePower(period, 'magic')}>Save {math.safeSpend} magic Power</button>}{hasBearer && math.safeSpend > 0 && <button type="button" class="quiet" onClick={() => savePower(period, 'packing')}>Save {math.safeSpend} packing Power</button>}</div>
          <small>Without rolling, standard camp/sojourn rules let you spend half your Power, rounded up, if total Power is at least 1.{hasTeamwork ? ' Teamwork +1 is optional here because the sheet cannot know what the other Heroes are doing.' : ''}{(hasMagus || hasBearer) ? ' Saved Power buttons are for qualifying preparation or packing actions; the table decides whether this action qualifies.' : ''}</small>
        </div>}
      </article>
    );
  };

  const scratched = hero.themes.flatMap((theme) => theme.powerTags.filter((tag) => tag.scratched).map((tag) => ({ themeId: theme.id, themeTitle: theme.title, tag, fellowship: false })));
  const scratchedFellowship = hero.fellowship?.theme.powerTags.filter((tag) => tag.scratched).map((tag) => ({ themeId: hero.fellowship?.theme.id ?? '', themeTitle: hero.fellowship?.theme.title ?? 'Fellowship', tag, fellowship: true })) ?? [];
  const allScratched = [...scratched, ...scratchedFellowship];

  return <div class={`drawer-backdrop ${closing ? 'is-closing' : ''}`} role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}><aside class="sheet-drawer camp-drawer has-structured-scroll" role="dialog" aria-modal="true" aria-labelledby="camp-title">
    <header class="drawer-header"><div><p class="eyebrow">Between scenes</p><h2 id="camp-title">Camp & Sojourn</h2></div><button type="button" class="drawer-close" onClick={onClose} aria-label="Close">×</button></header>
    <div class="drawer-scroll-region">
    <section class="drawer-section camp-mode-section"><div class="choice-tabs"><button type="button" class={mode === 'camp' ? 'is-active' : ''} onClick={() => setMode('camp')}>Camp</button><button type="button" class={mode === 'sojourn' ? 'is-active' : ''} onClick={() => setMode('sojourn')}>Sojourn</button></div>{mode === 'sojourn' && <label><span>Length</span><select value={duration} onChange={(event) => setDuration(event.currentTarget.value as 'days' | 'weeks' | 'months')}><option value="days">Days · +1 Power</option><option value="weeks">Weeks · +2 Power</option><option value="months">Months · +3 Power</option></select></label>}{hero.safeHavens.length > 0 && <label><span>Place of stay <em>optional</em></span><select value={safeHavenId} onChange={(event) => setSafeHavenId(event.currentTarget.value)}><option value="">Somewhere else</option>{hero.safeHavens.map((haven) => <option value={haven.id} key={haven.id}>{haven.name}</option>)}</select></label>}{selectedHaven && <p class="soft-rule-note">Safe haven: {selectedHaven.benefit === 'permanent-tag' && selectedHaven.advantageTag ? `${selectedHaven.advantageTag.name} can be invoked or burned for relevant actions here without being lost.` : selectedHaven.benefit === 'safe-third-period' ? 'A third period here does not carry the usual Consequences.' : 'Legacy safe haven; no recorded mechanical benefit.'}</p>}<p class="soft-rule-note">Choose activities for each period.</p></section>
    <section class="drawer-section camp-periods">{activityCard(periods[0] ?? newPeriod(firstThemeId, 'rest'), 0)}{activityCard(periods[1] ?? newPeriod(firstThemeId, 'reflect'), 1)}<label class="third-period-toggle"><input type="checkbox" checked={thirdPeriod} onChange={(event) => setThirdPeriod(event.currentTarget.checked)} /> Add third period <small>{safeThirdPeriod ? 'safe here' : 'standard: take Consequences'}</small></label>{thirdPeriod && activityCard(periods[2] ?? newPeriod(firstThemeId, 'action'), 2)}</section>

    {(restCount > 1 || reflectCount > 1) && <div class="rule-advisory-row camp-rule-advisory">{restCount > 1 && <span>Standard camp structure uses Rest at most once. Multiple Rests are kept as a table ruling.</span>}{reflectCount > 1 && <span>Standard camp structure uses Reflect at most once. Multiple Reflects are kept as a table ruling.</span>}</div>}

    <details class="drawer-section drawer-details" open={restCount > 0}><summary>Rest & recovery</summary>{restCount === 0 && <p class="soft-rule-note">Standard: these recovery benefits are tied to choosing Rest. They remain available for table rulings or corrections.</p>}<div class="camp-recovery-grid"><div><strong>Scratched power tags</strong>{allScratched.length === 0 && <small>None.</small>}{allScratched.map(({ themeId, themeTitle, tag, fellowship }) => <button type="button" key={tag.id} onClick={() => recoverTag(themeId, tag.id, fellowship)}>{tag.name}<small>{fellowship ? 'Fellowship · ' : ''}{themeTitle}</small></button>)}</div><div><strong>Statuses</strong>{hero.statuses.length === 0 && <small>None.</small>}{hero.statuses.map((status) => <button type="button" key={status.id} onClick={() => expireStatus(status.id)}>{status.name}</button>)}</div><div><strong>Story tags</strong>{[...hero.sceneTags.map((tag) => ({ tag, source: 'scene' as const })), ...hero.backpack.map((tag) => ({ tag, source: 'backpack' as const }))].filter(({ tag }) => !tag.permanent).map(({ tag, source }) => <button type="button" key={tag.id} onClick={() => expireStoryTag(tag, source)}>{tag.name}<small>{source}</small></button>)}</div></div></details>

    {hero.fellowship && <details class="drawer-section drawer-details"><summary>Fellowship quality time</summary><p>Renew relationship tags, rephrase a Fellowship theme tag, or add a relationship that became important during the stay.</p>{hasCampfireStories && <div class="campfire-stories-tool"><strong>Campfire Stories</strong><p>After a Hero shares a story between the first and second activities, this Hero may remove one tier of a harmful status, at the Narrator’s discretion.</p><div class="compact-field-grid"><label><span>Harmful status</span><select value={campfireStatusId} onChange={(event) => setCampfireStatusId(event.currentTarget.value)}><option value="">Choose status</option>{hero.statuses.map((status) => <option value={status.id} key={status.id}>{status.name}-{statusTier(status)}</option>)}</select></label><button type="button" class={campfireUsed ? 'has-rule-warning' : ''} disabled={!campfireStatusId} onClick={applyCampfireStory}>{campfireUsed ? 'Apply again' : 'Reduce by 1'}</button></div>{campfireUsed && <small>Standard: each member gets this benefit once per Campfire Stories trigger. Applying it again remains available as a table ruling.</small>}</div>}<div class="chip-cloud">{hero.fellowship.relationships.map((relationship) => <button type="button" key={relationship.id} class={relationship.tag.scratched ? 'is-scratched' : ''} onClick={() => onChange(addChronicle({ ...hero, fellowship: { ...hero.fellowship!, relationships: hero.fellowship!.relationships.map((item) => item.id === relationship.id ? { ...item, tag: { ...item.tag, scratched: false } } : item) } }, `Fellowship quality time: ${relationship.heroName} relationship tag renewed.`))}>{relationship.heroName}: {relationship.tag.name}</button>)}</div><div class="quality-time-grid"><label><span>Rephrase Fellowship tag</span><select value={qualityTagId} onChange={(event) => { setQualityTagId(event.currentTarget.value); const found = fellowshipTags.find((entry) => entry.tag.id === event.currentTarget.value); setQualityTagText(found?.tag.name ?? ''); }}><option value="">Choose tag</option>{fellowshipTags.map(({ tag }) => <option value={tag.id} key={tag.id}>{tag.name}</option>)}</select></label><label><span>New wording</span><input value={qualityTagText} onInput={(event) => setQualityTagText(event.currentTarget.value)} disabled={!qualityTagId} /></label><button type="button" disabled={!qualityTagId || !qualityTagText.trim()} onClick={rephraseFellowshipTag}>Rephrase</button></div><div class="quality-time-grid"><label><span>New relationship with</span><input value={relationshipHero} onInput={(event) => setRelationshipHero(event.currentTarget.value)} placeholder="Hero name" /></label><label><span>Relationship tag</span><input value={relationshipTag} onInput={(event) => setRelationshipTag(event.currentTarget.value)} placeholder="protective, rivals, old friends…" /></label><button type="button" disabled={!relationshipHero.trim() || !relationshipTag.trim()} onClick={addRelationship}>Add relationship</button></div></details>}
    </div>

    <footer class="drawer-footer"><span /><button type="button" class="button primary" onClick={onClose}>Done</button></footer>
  </aside></div>;
}
