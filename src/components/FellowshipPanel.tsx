import type { ActionChoiceMap, Hero, Polarity } from '../types';
import { addChronicle, markFellowshipImprove } from '../lib/rules';
import { fellowshipSpecialImprovements } from '../data/advancement';
import { abilityCadence } from '../lib/abilities';
import { MightIcon, ScratchIcon } from './Icons';
import { QuickEdit } from './QuickEdit';
import { MistText } from './MistText';

interface FellowshipPanelProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  actionChoices: ActionChoiceMap;
  onActionChoice: (tagId: string, polarity: Exclude<Polarity, 'unused'>) => void;
  onToggleBurn: (tagId: string) => void;
  onOpen: () => void;
  onAddInlineTag?: (name: string) => void;
  onAddInlineStatus?: (name: string, tier: number) => void;
}

type Track = 'abandon' | 'improve' | 'milestone';

export function FellowshipPanel({ hero, onChange, actionChoices, onActionChoice, onToggleBurn, onOpen, onAddInlineTag, onAddInlineStatus }: FellowshipPanelProps) {
  const fellowship = hero.fellowship;
  if (!fellowship) {
    return <button type="button" class="add-fellowship-card" onClick={onOpen}><span>＋</span><strong>Add Fellowship</strong><small>Shared theme & relationship tags, only when your group uses them.</small></button>;
  }

  const theme = fellowship.theme;

  const toggleScratch = (tagId: string) => {
    const tag = theme.powerTags.find((item) => item.id === tagId);
    if (!tag) return;
    const nextTheme = { ...theme, powerTags: theme.powerTags.map((item) => item.id === tagId ? { ...item, scratched: !item.scratched } : item) };
    onChange(addChronicle({ ...hero, fellowship: { ...fellowship, theme: nextTheme } }, `Fellowship tag ${tag.name} ${tag.scratched ? 'recovered' : 'scratched'}.`));
  };

  const setTrack = (track: Track, value: number) => {
    if (track === 'improve' && theme.nascentPowerTagsNeeded > theme.pendingNascentPowerTags && value > theme.improve) {
      const nextTheme = markFellowshipImprove(theme, 1);
      onChange(addChronicle({ ...hero, fellowship: { ...fellowship, theme: nextTheme } }, 'Fellowship Improve opened a nascent power-tag choice.'));
      return;
    }
    const nextTheme = { ...theme, [track]: Math.max(0, Math.min(3, value)) };
    onChange(addChronicle({ ...hero, fellowship: { ...fellowship, theme: nextTheme } }, `Fellowship ${track} set to ${nextTheme[track]}/3.`));
  };

  const bankImprovement = () => {
    const nextTheme = { ...theme, improve: Math.max(0, theme.improve - 3), pendingImprovements: theme.pendingImprovements + 1 };
    onChange(addChronicle({ ...hero, fellowship: { ...fellowship, theme: nextTheme } }, 'Fellowship gained an improvement.'));
  };

  const renameThemeField = (field: 'title' | 'quest', value: string) => {
    if (theme[field] === value) return;
    const nextTheme = { ...theme, [field]: value };
    onChange(addChronicle({ ...hero, fellowship: { ...fellowship, theme: nextTheme } }, `Fellowship ${field} updated.`));
  };

  const renameThemeTag = (tagId: string, kind: 'power' | 'weakness', value: string) => {
    const list = kind === 'power' ? theme.powerTags : theme.weaknessTags;
    const tag = list.find((item) => item.id === tagId);
    if (!tag || tag.name === value) return;
    const nextTheme = kind === 'power'
      ? { ...theme, powerTags: theme.powerTags.map((item) => item.id === tagId ? { ...item, name: value } : item) }
      : { ...theme, weaknessTags: theme.weaknessTags.map((item) => item.id === tagId ? { ...item, name: value } : item) };
    onChange(addChronicle({ ...hero, fellowship: { ...fellowship, theme: nextTheme } }, `Fellowship tag ${tag.name} renamed to ${value}.`));
  };

  const renameRelationshipTag = (relationshipId: string, value: string) => {
    const relationship = fellowship.relationships.find((item) => item.id === relationshipId);
    if (!relationship || relationship.tag.name === value) return;
    const relationships = fellowship.relationships.map((item) => item.id === relationshipId ? { ...item, tag: { ...item.tag, name: value } } : item);
    onChange(addChronicle({ ...hero, fellowship: { ...fellowship, relationships } }, `Relationship tag with ${relationship.heroName} updated.`));
  };

  const toggleSpecialUse = (name: string, scope: 'scene' | 'session') => {
    const state = theme.specialStates?.[name] ?? {};
    const used = scope === 'scene' ? !state.usedScene : !state.usedSession;
    const nextState = scope === 'scene' ? { ...state, usedScene: used } : { ...state, usedSession: used };
    const nextTheme = { ...theme, specialStates: { ...theme.specialStates, [name]: nextState } };
    onChange(addChronicle({ ...hero, fellowship: { ...fellowship, theme: nextTheme } }, `${name} marked ${used ? 'used' : 'ready'} for this ${scope}.`));
  };


  return (
    <section class="fellowship-card paper-panel">
      <header>
        <div><p class="eyebrow">Fellowship</p><h2>{fellowship.name}</h2></div>
        <div class="fellowship-header-actions"><MightIcon might={theme.might} className="fellowship-might-icon" title={`${theme.might} Fellowship`} /><button type="button" class="theme-menu-button" onClick={onOpen} aria-label="Manage Fellowship">•••{(theme.pendingImprovements + theme.pendingNascentPowerTags) > 0 && <em>{theme.pendingImprovements + theme.pendingNascentPowerTags}</em>}</button></div>
      </header>
      <div class="fellowship-layout">
        <div class="fellowship-theme-core">
          <div class="fellowship-title-row"><strong>{theme.title}</strong><QuickEdit value={theme.title} onCommit={(value) => renameThemeField('title', value)} label="Rename Fellowship theme" /><span>{theme.might}</span></div>
          <div class="fellowship-tag-row">
            {theme.powerTags.map((tag) => {
              const choice = actionChoices[tag.id];
              return (
                <div class={`fellowship-tag-control sheet-tag-control ${tag.scratched ? 'is-scratched' : ''}`} key={tag.id}>
                  <button type="button" disabled={tag.scratched} class={`paper-tag power-tag ${tag.scratched ? 'is-scratched' : ''} ${choice?.polarity === 'helpful' ? 'is-helpful-selected' : choice?.polarity === 'hindering' ? 'is-hindering-selected' : ''}`} onClick={() => onActionChoice(tag.id, 'helpful')}>
                    <span>{tag.name}</span><small>single-use</small>
                    {choice?.polarity && choice.polarity !== 'unused' && <em class="selection-power">{choice.polarity === 'helpful' ? (choice.burn ? '+3' : '+1') : '−1'}</em>}
                  </button>
                  <div class="tag-inline-tools">
                    <button type="button" disabled={tag.scratched} class={`tag-polarity-button hindering ${choice?.polarity === 'hindering' ? 'is-active' : ''}`} onClick={() => onActionChoice(tag.id, 'hindering')} aria-label={`Invoke ${tag.name} as hindering`}>−</button>
                    <QuickEdit value={tag.name} onCommit={(value) => renameThemeTag(tag.id, 'power', value)} label={`Rename ${tag.name}`} />
                    <button
                      type="button"
                      class={`tag-scratch-button ${choice?.burn ? 'is-roll-burn' : ''}`}
                      onClick={() => choice?.polarity === 'helpful' && !tag.scratched ? onToggleBurn(tag.id) : toggleScratch(tag.id)}
                      aria-label={choice?.polarity === 'helpful' && !tag.scratched ? `${choice.burn ? 'Cancel burn for' : 'Burn'} ${tag.name}` : `${tag.scratched ? 'Recover' : 'Scratch'} ${tag.name}`}
                      title={choice?.polarity === 'helpful' && !tag.scratched
                        ? choice.burn
                          ? 'Cancel burn for this roll'
                          : 'Burn for +3 Power as a table ruling · standard Fellowship power tags are single-use and are not burned for Power'
                        : tag.scratched ? 'Recover tag' : 'Scratch tag'}
                    ><ScratchIcon filled={Boolean(choice?.burn) || Boolean(tag.scratched)} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <div class="fellowship-tag-row weaknesses">
            {theme.weaknessTags.map((tag) => {
              const choice = actionChoices[tag.id];
              return (
                <div class="fellowship-tag-control sheet-tag-control weakness-tag-control" key={tag.id}>
                  <button type="button" class={`paper-tag weakness-tag ${choice?.polarity === 'hindering' ? 'is-hindering-selected' : choice?.polarity === 'helpful' ? 'is-helpful-selected' : ''}`} onClick={() => onActionChoice(tag.id, 'hindering')}>
                    <span>{tag.name}</span>
                    {choice?.polarity && choice.polarity !== 'unused' && <em class="selection-power">{choice.polarity === 'helpful' ? '+1' : '−1'}</em>}
                  </button>
                  <div class="tag-inline-tools"><button type="button" class={`tag-polarity-button helpful ${choice?.polarity === 'helpful' ? 'is-active' : ''}`} onClick={() => onActionChoice(tag.id, 'helpful')} aria-label={`Invoke ${tag.name} as helpful`}>+</button><QuickEdit value={tag.name} onCommit={(value) => renameThemeTag(tag.id, 'weakness', value)} label={`Rename ${tag.name}`} /></div>
                </div>
              );
            })}
          </div>
          <div class="theme-tracks fellowship-tracks">
            {(['abandon', 'improve', 'milestone'] as Track[]).map((track) => <div class={`track ${track === 'improve' && (theme.improve >= 3 || theme.pendingNascentPowerTags > 0) ? 'is-ready' : ''}`} key={track}><div class="track-pips">{[1,2,3].map((pip) => <button type="button" class={pip <= theme[track] ? 'is-marked' : ''} onClick={() => setTrack(track, pip === theme[track] ? pip - 1 : pip)} key={pip} />)}</div>{track === 'improve' && theme.pendingNascentPowerTags > 0 ? <button type="button" class="track-label-button" onClick={onOpen}>Power tag · {theme.pendingNascentPowerTags}</button> : track === 'improve' && theme.improve >= 3 ? <button type="button" class="track-label-button" onClick={bankImprovement}>Improve{theme.improve > 3 ? ` +${theme.improve - 3}` : ''} <i>◆</i></button> : <span>{track[0]?.toUpperCase()}{track.slice(1)}</span>}</div>)}
          </div>
          <div class="quest-block"><span>Quest</span><div class="quest-copy"><p>“<MistText text={theme.quest} onAddTag={onAddInlineTag} onAddStatus={onAddInlineStatus} />”</p><QuickEdit value={theme.quest} onCommit={(value) => renameThemeField('quest', value)} label="Edit Fellowship quest" /></div></div>
          {theme.specialImprovements.length > 0 && <details class="fellowship-specials-inline"><summary>{theme.specialImprovements.length} Special Improvement{theme.specialImprovements.length === 1 ? '' : 's'}</summary><div class="fellowship-special-list">{theme.specialImprovements.map((name) => { const definition = fellowshipSpecialImprovements.find((item) => item.name === name); const summary = definition?.summary ?? 'Custom Fellowship Special.'; const cadence = abilityCadence(summary); const state = theme.specialStates?.[name] ?? {}; const used = cadence === 'scene' ? Boolean(state.usedScene) : cadence === 'session' ? Boolean(state.usedSession) : false; return <article class={used ? 'is-used' : ''} key={name}><div><strong>{name}</strong><p>{summary}</p></div>{(cadence === 'scene' || cadence === 'session') && <button type="button" class={used ? 'is-used' : ''} onClick={() => toggleSpecialUse(name, cadence)}>{used ? 'used' : cadence}</button>}</article>; })}</div></details>}
        </div>
        <div class="relationship-strip">
          <strong>Relationships</strong>
          {fellowship.relationships.length === 0 && <small>Add the other Heroes from •••.</small>}
          {fellowship.relationships.map((relationship) => {
            const tag = relationship.tag;
            const choice = actionChoices[tag.id];
            return (
              <div class={`relationship-tag-wrap ${choice?.polarity === 'helpful' ? 'is-helpful-selected' : choice?.polarity === 'hindering' ? 'is-hindering-selected' : ''}`} key={relationship.id}>
                <button type="button" disabled={tag.scratched} class="relationship-tag-main" onClick={() => onActionChoice(tag.id, 'helpful')}><span>{relationship.heroName}</span><strong>{tag.name}</strong><small>{tag.scratched ? 'used' : 'single-use'}</small></button>
                <button type="button" disabled={tag.scratched} class={`relationship-tag-negative ${choice?.polarity === 'hindering' ? 'is-active' : ''}`} onClick={() => onActionChoice(tag.id, 'hindering')} aria-label={`Invoke ${tag.name} as hindering`}>−</button>
                <QuickEdit value={tag.name} onCommit={(value) => renameRelationshipTag(relationship.id, value)} label={`Rename relationship tag with ${relationship.heroName}`} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
