import type { Hero } from '../types';
import { abilityCadence, quintessenceSummary } from '../lib/abilities';
import { addChronicle, HERO_STATUS_LIMIT, reduceStatus, statusTier } from '../lib/rules';
import { MistText } from './MistText';

interface HeroRailQuintessencesProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  onOpenJourney: () => void;
  onAddInlineTag?: (name: string) => void;
  onAddInlineStatus?: (name: string, tier: number) => void;
}

export function HeroRailQuintessences({
  hero,
  onChange,
  onOpenJourney,
  onAddInlineTag,
  onAddInlineStatus,
}: HeroRailQuintessencesProps) {
  const toggleUse = (id: string, scope: 'scene' | 'session') => {
    const record = hero.quintessences.find((item) => item.id === id);
    if (!record) return;
    const used = scope === 'scene' ? !record.usedScene : !record.usedSession;
    const quintessences = hero.quintessences.map((item) => item.id !== id ? item : {
      ...item,
      ...(scope === 'scene' ? { usedScene: used } : { usedSession: used }),
    });
    onChange(addChronicle({ ...hero, quintessences }, `${record.name} marked ${used ? 'used' : 'ready'} for this ${scope}.`));
  };

  const useNineLives = (id: string, statusId: string) => {
    const record = hero.quintessences.find((item) => item.id === id);
    const status = hero.statuses.find((item) => item.id === statusId);
    if (!record || record.name !== 'Nine Lives' || !status) return;
    const tier = statusTier(status);
    if (tier <= HERO_STATUS_LIMIT) return;
    const reduced = reduceStatus(status, tier - HERO_STATUS_LIMIT);
    const remaining = record.uses ?? 3;
    const nextUses = remaining - 1;
    const quintessences = nextUses <= 0
      ? hero.quintessences.filter((item) => item.id !== id)
      : hero.quintessences.map((item) => item.id === id ? { ...item, uses: nextUses } : item);
    const statuses = hero.statuses.map((item) => item.id === statusId ? reduced : item);
    const tail = nextUses <= 0 ? ' Nine Lives was removed after its third escape.' : ` ${nextUses} escape${nextUses === 1 ? '' : 's'} remaining.`;
    onChange(addChronicle({ ...hero, statuses, quintessences }, `Nine Lives: ${status.name}-${tier} reduced to ${status.name}-${statusTier(reduced)} at the start of the next scene.${tail}`));
  };

  return (
    <section class="hero-rail-quintessences" aria-label="Hero Quintessences">
      <div class="hero-rail-quintessence-heading">
        <div>
          <strong>Quintessences</strong>
          <small>{hero.quintessences.length > 0 ? `${hero.quintessences.length} held` : 'Lasting legend'}</small>
        </div>
        <button type="button" onClick={onOpenJourney} aria-label="Manage Quintessences in Journey">Manage</button>
      </div>

      {hero.quintessences.length > 0 ? (
        <div class="hero-rail-quintessence-list">
          {hero.quintessences.map((record) => {
            const builtInSummary = quintessenceSummary(record.name);
            const summary = builtInSummary || record.rulesText?.trim() || record.notes || 'A custom defining quality.';
            const cadence = abilityCadence(summary);
            const used = cadence === 'scene' ? Boolean(record.usedScene) : cadence === 'session' ? Boolean(record.usedSession) : false;
            const linkedTheme = record.themeId ? hero.themes.find((theme) => theme.id === record.themeId) : undefined;
            const trackable = cadence === 'scene' || cadence === 'session';
            const isNineLives = record.name === 'Nine Lives';
            const isMagus = record.name === 'Magus Magnificent';
            const isBearer = record.name === 'The Bearer';
            const remainingUses = isNineLives ? record.uses ?? 3 : record.uses;
            const exceededStatuses = isNineLives ? hero.statuses.filter((status) => statusTier(status) > HERO_STATUS_LIMIT) : [];
            const savedPower = isMagus ? hero.savedMagicPower : isBearer ? hero.savedPackingPower : 0;
            const summaryMeta = isNineLives
              ? `${remainingUses} left`
              : (isMagus || isBearer) && savedPower > 0
                ? `${savedPower} Power`
                : trackable
                  ? (used ? 'used' : cadence)
                  : '';

            return (
              <details class={`hero-rail-quintessence-item ${used ? 'is-used' : ''}`} key={record.id}>
                <summary>
                  <span>{record.name}</span>
                  {summaryMeta && <small>{summaryMeta}</small>}
                </summary>
                <div class="hero-rail-quintessence-detail">
                  <p><MistText text={summary} onAddTag={onAddInlineTag} onAddStatus={onAddInlineStatus} /></p>

                  {(linkedTheme || (!isNineLives && remainingUses !== undefined) || isMagus || isBearer || record.notes) && (
                    <div class="hero-rail-quintessence-meta">
                      {linkedTheme && <span>Bound to <b>{linkedTheme.title}</b></span>}
                      {!isNineLives && remainingUses !== undefined && <span><b>{remainingUses}</b> use{remainingUses === 1 ? '' : 's'} remaining</span>}
                      {(isMagus || isBearer) && <span><b>{savedPower}</b> saved Power</span>}
                      {record.notes && builtInSummary && <span>{record.notes}</span>}
                    </div>
                  )}

                  <div class="hero-rail-quintessence-actions">
                    {isNineLives && exceededStatuses.length === 1 && (
                      <button type="button" onClick={() => useNineLives(record.id, exceededStatuses[0]!.id)}>
                        Escape {exceededStatuses[0]!.name}-{statusTier(exceededStatuses[0]!)} → {HERO_STATUS_LIMIT}
                      </button>
                    )}
                    {isNineLives && exceededStatuses.length > 1 && (
                      <label>
                        <span>Nine Lives · {remainingUses} left</span>
                        <select onChange={(event) => {
                          const statusId = event.currentTarget.value;
                          if (statusId) {
                            useNineLives(record.id, statusId);
                            event.currentTarget.value = '';
                          }
                        }} defaultValue="">
                          <option value="">Choose exceeded status…</option>
                          {exceededStatuses.map((status) => <option value={status.id} key={status.id}>{status.name}-{statusTier(status)} → {HERO_STATUS_LIMIT}</option>)}
                        </select>
                      </label>
                    )}
                    {isNineLives && exceededStatuses.length === 0 && <span class="hero-rail-quintessence-ready">Ready when a status exceeds your Limit.</span>}
                    {trackable && (
                      <button
                        type="button"
                        class={used ? 'is-used' : ''}
                        onClick={() => toggleUse(record.id, cadence)}
                        aria-pressed={used}
                      >
                        {used ? `Mark ready this ${cadence}` : `Mark used this ${cadence}`}
                      </button>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <button type="button" class="hero-rail-quintessence-empty" onClick={onOpenJourney}>None yet · add through Journey</button>
      )}
    </section>
  );
}
