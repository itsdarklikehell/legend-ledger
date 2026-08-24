import type { Hero } from '../types';
import { quintessences } from '../data/advancement';
import { abilityCadence } from '../lib/abilities';
import { addChronicle, applyStatusMark, emptyTheme, gainPromise, improveTrackLimit, makeTag, uid } from '../lib/rules';
import { MistText } from './MistText';
import { useDismissTransition } from '../hooks/useDismissTransition';

interface JourneyDrawerProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  onClose: () => void;
  onOpenTheme: (themeId: string, track: 'abandon' | 'improve' | 'milestone' | 'special') => void;
  onFulfillment: () => void;
  onOpenCamp: () => void;
  onCreateSuccessor: () => void;
}

export function JourneyDrawer({ hero, onChange, onClose: commitClose, onOpenTheme, onFulfillment, onOpenCamp, onCreateSuccessor }: JourneyDrawerProps) {
  const { closing, dismiss: onClose } = useDismissTransition(commitClose);
  const improveLimit = improveTrackLimit(hero);
  const recentDevelopment = hero.chronicle.filter((entry) => /(improv|promise|milestone|abandon|evolv|replac|quest|reflect|nascent|special|reforg)/i.test(entry.text)).slice(0, 10);
  const hasJourneyEndHistory = hero.fulfillmentHistory.some((record) => record.type === 'journeys-end');

  const openTheme = (themeId: string, track: 'abandon' | 'improve' | 'milestone' | 'special') => { onClose(); onOpenTheme(themeId, track); };
  const assignGlobalCredit = (themeId: string) => { if (hero.globalImprovementCredits <= 0) return; const theme = hero.themes.find((item) => item.id === themeId); if (!theme) return; onChange(addChronicle({ ...hero, themes: hero.themes.map((item) => item.id === themeId ? { ...item, pendingImprovements: item.pendingImprovements + 1 } : item), globalImprovementCredits: hero.globalImprovementCredits - 1 }, `A free improvement was assigned to ${theme.title}.`)); };
  const reassignQuintessence = (recordId: string, themeId?: string) => { const record = hero.quintessences.find((item) => item.id === recordId); if (!record) return; const linkedTheme = hero.themes.find((theme) => theme.id === themeId); onChange(addChronicle({ ...hero, quintessences: hero.quintessences.map((item) => item.id === recordId ? { ...item, themeId } : item) }, themeId ? `${record.name} is now linked to ${linkedTheme?.title ?? 'a theme'}.` : `${record.name} is no longer linked to a theme.`)); };
  const adjustPromise = (amount: number) => { if (amount > 0) onChange(addChronicle(gainPromise(hero, amount), `Promise +${amount}.`)); else onChange(addChronicle({ ...hero, promise: Math.max(0, hero.promise + amount) }, `Promise ${amount}.`)); };
  const adjustFulfillment = (amount: number) => onChange(addChronicle({ ...hero, fulfillmentCredits: Math.max(0, hero.fulfillmentCredits + amount) }, `Moment of Fulfillment credits ${amount > 0 ? '+' : ''}${amount}.`));
  const patchQuintessence = (id: string, patch: Partial<Hero['quintessences'][number]>) => onChange({ ...hero, quintessences: hero.quintessences.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const removeQuintessence = (id: string) => { const record = hero.quintessences.find((item) => item.id === id); if (!record) return; onChange(addChronicle({ ...hero, quintessences: hero.quintessences.filter((item) => item.id !== id) }, `${record.name} was removed from the Hero's Quintessences.`)); };
  const addCustomQuintessence = () => { const record = { id: uid('quintessence'), name: 'Custom Quintessence', rulesText: '' }; onChange(addChronicle({ ...hero, quintessences: [...hero.quintessences, record] }, 'A custom Quintessence was added.')); };
  const addTheme = () => { const theme = emptyTheme(hero.themes.length); const title = `Theme ${hero.themes.length + 1}`; theme.title = title; theme.powerTags = theme.powerTags.map((tag, index) => index === 0 ? { ...tag, name: title } : tag); onChange(addChronicle({ ...hero, themes: [...hero.themes, theme] }, `${title} was added.`)); };
  const reactivateHero = () => onChange(addChronicle({ ...hero, retired: false }, `Journey's End retirement was undone.`));
  const adjustSavedPower = (kind: 'magic' | 'packing', amount: number) => {
    const key = kind === 'magic' ? 'savedMagicPower' : 'savedPackingPower';
    const label = kind === 'magic' ? 'Prepared magic Power' : 'Packed Power';
    const current = hero[key];
    const next = Math.max(0, current + amount);
    if (next === current) return;
    onChange(addChronicle({ ...hero, [key]: next }, `${label} ${amount > 0 ? '+' : ''}${amount}; ${next} remains.`));
  };
  const addInlineSceneTag = (rawName: string) => { const name = rawName.trim(); if (!name) return; onChange(addChronicle({ ...hero, sceneTags: [...hero.sceneTags, { ...makeTag(name, 'story'), storyMode: 'standard' }] }, `${name} added to the scene from game text.`)); };
  const addInlineStatus = (rawName: string, tier: number) => { const name = rawName.trim(); if (!name) return; const existing = hero.statuses.find((status) => status.name.toLowerCase() === name.toLowerCase()); const statuses = existing ? hero.statuses.map((status) => status.id === existing.id ? applyStatusMark(status, tier) : status) : [...hero.statuses, { id: uid('status'), name, polarity: 'hindering' as const, marks: [tier] }]; onChange(addChronicle({ ...hero, statuses }, `${name}-${tier} added from game text.`)); };

  return (
    <div class={`drawer-backdrop ${closing ? 'is-closing' : ''}`} role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside class="sheet-drawer journey-drawer has-structured-scroll" role="dialog" aria-modal="true" aria-labelledby="journey-title">
        <header class="drawer-header"><div><p class="eyebrow">Hero's journey</p><h2 id="journey-title">Development</h2></div><button type="button" class="drawer-close" onClick={onClose} aria-label="Close">×</button></header>

        <div class="drawer-scroll-region">
        <section class="drawer-section promise-drawer-section">
          <div class="drawer-section-title"><strong>Promise</strong><span>{hero.promise}/5</span></div>
          <div class="promise-pips compact-promise-pips">{[1,2,3,4,5].map((pip) => <span class={pip <= hero.promise ? 'is-marked' : ''} key={pip} />)}</div>
          {hero.fulfillmentCredits > 0 && <button type="button" class="full-width-action" onClick={() => { onClose(); onFulfillment(); }}>{hero.fulfillmentCredits} Moment{hero.fulfillmentCredits === 1 ? '' : 's'} of Fulfillment ready</button>}
          <details class="micro-details correction-details"><summary>Corrections</summary><div class="correction-grid"><div class="manual-track-controls"><button type="button" onClick={() => adjustPromise(-1)}>−</button><span>Promise · {hero.promise}</span><button type="button" onClick={() => adjustPromise(1)}>+</button></div><div class="manual-track-controls"><button type="button" onClick={() => adjustFulfillment(-1)}>−</button><span>Moments · {hero.fulfillmentCredits}</span><button type="button" onClick={() => adjustFulfillment(1)}>+</button></div></div></details>
        </section>

        <section class="drawer-section reflect-drawer-section">
          <div class="drawer-section-title"><strong>Camp & sojourn</strong><span>Rest, Reflect, or take a camp action.</span></div>
          <button type="button" class="full-width-action" onClick={() => { onClose(); onOpenCamp(); }}>Open camp / sojourn</button>
        </section>

        <section class="drawer-section journey-theme-list">
          <div class="drawer-section-title"><strong>Themes</strong><span>Only ready actions are emphasized.</span></div>
          {hero.themes.map((theme) => {
            const ready = theme.pendingNascentPowerTags + theme.pendingImprovements + (theme.improve >= improveLimit && theme.pendingNascentPowerTags === 0 && theme.pendingImprovements === 0 ? 1 : 0) + (theme.abandon >= 3 ? 1 : 0) + (theme.milestone >= 3 ? 1 : 0);
            return <article class={`journey-theme-item ${ready > 0 ? 'has-ready' : ''}`} key={theme.id}><div class="journey-theme-copy"><strong>{theme.title}</strong><span>A {theme.abandon}/3 · I {theme.improve}/{improveLimit} · M {theme.milestone}/3</span></div><div class="journey-theme-actions">{theme.pendingNascentPowerTags > 0 && <button type="button" onClick={() => openTheme(theme.id, 'improve')}>Add tag</button>}{(theme.pendingImprovements > 0 || theme.improve >= improveLimit) && <button type="button" onClick={() => openTheme(theme.id, 'improve')}>{theme.pendingImprovements > 0 ? `Improve${theme.pendingImprovements > 1 ? ` ×${theme.pendingImprovements}` : ''}` : 'Resolve Improve'}</button>}{theme.abandon >= 3 && <button type="button" onClick={() => openTheme(theme.id, 'abandon')}>Replace</button>}{theme.milestone >= 3 && <button type="button" onClick={() => openTheme(theme.id, 'milestone')}>Evolve</button>}{hero.globalSpecialImprovementCredits > 0 && <button type="button" class="quiet" onClick={() => openTheme(theme.id, 'special')}>Old Hand</button>}{hero.globalImprovementCredits > 0 && <button type="button" class="quiet" onClick={() => assignGlobalCredit(theme.id)}>Use free improvement</button>}</div></article>;
          })}
        </section>

        <details class="drawer-section drawer-details"><summary>Advanced</summary><p>Default: four themes.</p><button type="button" class="subtle-action" onClick={addTheme}>+ Add another theme</button></details>

        {(hero.quintessences.length > 0 || hero.globalImprovementCredits > 0 || hero.globalSpecialImprovementCredits > 0 || hero.savedMagicPower > 0 || hero.savedPackingPower > 0 || hero.retired) && <details class="drawer-section drawer-details" open={hero.globalImprovementCredits > 0 || hero.globalSpecialImprovementCredits > 0 || hero.savedMagicPower > 0 || hero.savedPackingPower > 0 || hero.retired}><summary>Lasting growth</summary>{hero.globalImprovementCredits > 0 && <p>{hero.globalImprovementCredits} free improvement{hero.globalImprovementCredits === 1 ? '' : 's'} unassigned.</p>}{hero.globalSpecialImprovementCredits > 0 && <p>{hero.globalSpecialImprovementCredits} Old Hand Special choice{hero.globalSpecialImprovementCredits === 1 ? '' : 's'} unassigned.</p>}{hero.retired && <><div class="retirement-correction"><div><strong>Journey's End</strong><span>This Hero is marked retired.</span></div><div class="drawer-action-row"><button type="button" class="subtle-action" onClick={() => { onClose(); onCreateSuccessor(); }}>Create successor</button><button type="button" class="subtle-action" onClick={reactivateHero}>Undo retirement</button></div></div><p class="soft-rule-note">With Narrator approval, a replacement Hero can begin with comparable advancement and the retired Hero's current Promise. The shortcut keeps that optional rule editable rather than mandatory.</p></>}
          {(hero.savedMagicPower > 0 || hero.savedPackingPower > 0 || hero.quintessences.some((record) => record.name === 'Magus Magnificent' || record.name === 'The Bearer')) && <div class="stored-power-list">
            {(hero.savedMagicPower > 0 || hero.quintessences.some((record) => record.name === 'Magus Magnificent')) && <div class="stored-power-row"><div><strong>Prepared magic Power</strong><small>Magus Magnificent · spend later to create related magic ability tags.</small></div><div class="stored-power-controls"><button type="button" disabled={hero.savedMagicPower <= 0} onClick={() => adjustSavedPower('magic', -1)} aria-label="Spend one prepared magic Power">−</button><span>{hero.savedMagicPower}</span><button type="button" onClick={() => adjustSavedPower('magic', 1)} title="Correction" aria-label="Add one prepared magic Power as a correction">+</button></div></div>}
            {(hero.savedPackingPower > 0 || hero.quintessences.some((record) => record.name === 'The Bearer')) && <div class="stored-power-row"><div><strong>Packed Power</strong><small>The Bearer · spend later to create related item tags.</small></div><div class="stored-power-controls"><button type="button" disabled={hero.savedPackingPower <= 0} onClick={() => adjustSavedPower('packing', -1)} aria-label="Spend one packed Power">−</button><span>{hero.savedPackingPower}</span><button type="button" onClick={() => adjustSavedPower('packing', 1)} title="Correction" aria-label="Add one packed Power as a correction">+</button></div></div>}
            <small class="stored-power-note">The + control is a correction tool. Normal gains come from preparing or packing and replace any previously saved pool.</small>
          </div>}
          <div class="quintessence-list journey-quintessence-list">{hero.quintessences.map((record) => {
            const definition = quintessences.find((item) => item.name === record.name);
            const isCustom = !definition;
            const effectiveRules = definition?.summary || record.rulesText?.trim() || 'Custom Quintessence.';
            const cadence = abilityCadence(effectiveRules);
            const used = cadence === 'scene' ? record.usedScene : cadence === 'session' ? record.usedSession : false;
            const validThemes = definition?.themeBinding === 'origin-or-adventure'
              ? hero.themes.filter((theme) => theme.might === 'Origin' || theme.might === 'Adventure')
              : definition?.themeBinding === 'adventure-or-greatness'
                ? hero.themes.filter((theme) => theme.might === 'Adventure' || theme.might === 'Greatness')
                : hero.themes;
            const showThemeBinding = Boolean(definition?.themeBinding || isCustom || record.themeId);
            const showUses = record.uses !== undefined || isCustom;
            return <details class={`journey-quintessence-item ${used ? 'is-used' : ''}`} key={record.id}>
              <summary><span><strong>{record.name}</strong><small>{effectiveRules}</small></span><em>Edit</em></summary>
              <div class="quintessence-edit-fields">
                {isCustom ? <label><span>Name</span><input defaultValue={record.name} onBlur={(event) => { const name = event.currentTarget.value.trim(); if (name && name !== record.name) patchQuintessence(record.id, { name }); }} /></label> : <div class="quintessence-printed-rules"><span>Rules</span><p>{definition.summary}</p></div>}
                {isCustom && <label class="quintessence-rules-field"><span>Rules</span><textarea defaultValue={record.rulesText ?? ''} onBlur={(event) => { const rulesText = event.currentTarget.value.trim(); patchQuintessence(record.id, { rulesText: rulesText || undefined }); }} placeholder="What does this Quintessence do?" /></label>}
                {showThemeBinding && <label><span>Linked theme {definition?.themeBinding ? '' : <em>optional</em>}</span><select value={record.themeId ?? ''} onChange={(event) => reassignQuintessence(record.id, event.currentTarget.value || undefined)}><option value="">None</option>{validThemes.map((theme) => <option value={theme.id} key={theme.id}>{theme.title}</option>)}</select></label>}
                {showUses && <label><span>Remaining uses {record.name === 'Nine Lives' ? '' : <em>optional</em>}</span><input type="number" min="0" placeholder="Unlimited" defaultValue={record.uses ?? ''} onBlur={(event) => { const value = event.currentTarget.value.trim(); patchQuintessence(record.id, { uses: value === '' ? undefined : Math.max(0, Number(value) || 0) }); }} /></label>}
                {record.notes && <label class="quintessence-rules-field"><span>Notes</span><textarea defaultValue={record.notes} onBlur={(event) => { const notes = event.currentTarget.value.trim(); patchQuintessence(record.id, { notes: notes || undefined }); }} /></label>}
              </div>
              <div class="quintessence-edit-actions">
                {(cadence === 'scene' || cadence === 'session') && <button type="button" class="subtle-action" onClick={() => patchQuintessence(record.id, cadence === 'scene' ? { usedScene: !record.usedScene } : { usedSession: !record.usedSession })}>{used ? `Mark ready this ${cadence}` : `Mark used this ${cadence}`}</button>}
                <button type="button" class="danger-text" onClick={() => removeQuintessence(record.id)}>Remove Quintessence</button>
              </div>
            </details>;
          })}</div>
          <button type="button" class="subtle-action quintessence-add-custom" onClick={addCustomQuintessence}>＋ Add custom Quintessence</button>
        </details>}

        {(hero.pastThemes.length > 0 || recentDevelopment.length > 0) && <details class="drawer-section drawer-details past-selves-details"><summary>Past selves & development</summary>
          {hero.pastThemes.length > 0 && <div class="past-theme-list">{hero.pastThemes.slice(0, 12).map((past) => <article class="past-theme-card" key={past.id}><div><strong>{past.title}</strong><small>{past.typeName} · {past.might} · {past.reason.replace('-', ' ')}</small></div><p>“<MistText text={past.quest} onAddTag={addInlineSceneTag} onAddStatus={addInlineStatus} />”</p><span>{past.powerTags.filter(Boolean).join(' · ')}</span></article>)}</div>}
          {recentDevelopment.length > 0 && <div class="development-history-list"><strong>Recent changes</strong>{recentDevelopment.map((entry) => <p key={entry.id}><time>{new Date(entry.at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</time><MistText text={entry.text} onAddTag={addInlineSceneTag} onAddStatus={addInlineStatus} /></p>)}</div>}
        </details>}

        {(hero.safeHavens.length > 0 || hero.legacyNotes.length > 0 || hero.fulfillmentHistory.length > 0) && <details class="drawer-section drawer-details fulfillment-history-details"><summary>Fulfillment legacy</summary>
          {hero.fulfillmentHistory.length > 0 && <div class="fulfillment-history-list">{[...hero.fulfillmentHistory].reverse().map((record) => <article key={record.id}><time>{new Date(record.at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</time><div><strong>{record.title}</strong>{record.details && <p><MistText text={record.details} onAddTag={addInlineSceneTag} onAddStatus={addInlineStatus} /></p>}</div></article>)}</div>}
          {!hasJourneyEndHistory && hero.safeHavens.map((haven) => <p key={haven.id}><b>Journey's End · {haven.name}</b>{haven.notes ? ` — ${haven.notes}` : ''}</p>)}
          {hero.legacyNotes.map((note, index) => <p key={`${note}-${index}`}><MistText text={note} onAddTag={addInlineSceneTag} onAddStatus={addInlineStatus} /></p>)}
        </details>}

        <details class="drawer-section drawer-details"><summary>Quest reminder</summary><p><b>Wish:</b> significant steps can mark Milestone; passing up a real chance can mark Abandon.</p><p><b>Truth:</b> dramatically upholding it can mark Milestone; acting against it can mark Abandon.</p><p><b>Home:</b> significant reinforcement can mark Milestone; neglecting preservation can mark Abandon.</p><p><b>Question:</b> meaningful answers can mark Milestone; ignoring a chance to learn can mark Abandon.</p></details>
        </div>
      </aside>
    </div>
  );
}
