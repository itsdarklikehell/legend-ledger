import { useState } from 'preact/hooks';
import type { ActionChoiceMap, Polarity, Theme } from '../types';
import { themebookById } from '../data/themebooks';
import { abilityCadence, specialSummary } from '../lib/abilities';
import { MightIcon, ScratchIcon, WeaknessMarkIcon } from './Icons';
import { QuickEdit } from './QuickEdit';
import { TagGestureButton } from './TagGestureButton';
import { MistText } from './MistText';

type TrackName = 'abandon' | 'improve' | 'milestone';

interface ThemeCardProps {
  theme: Theme;
  compact?: boolean;
  onToggleScratch?: (themeId: string, tagId: string) => void;
  onTrack?: (themeId: string, track: TrackName, value: number) => void;
  onResolve?: (themeId: string, track: TrackName) => void;
  onManage?: (themeId: string) => void;
  actionChoices?: ActionChoiceMap;
  onActionChoice?: (tagId: string, polarity: Exclude<Polarity, 'unused'>) => void;
  onToggleBurn?: (tagId: string) => void;
  onToggleSpecialUse?: (themeId: string, name: string, scope: 'scene' | 'session') => void;
  improveLimit?: number;
  onRenameTitle?: (themeId: string, value: string) => void;
  onRenameQuest?: (themeId: string, value: string) => void;
  onReorderTag?: (themeId: string, kind: 'power' | 'weakness', fromId: string, toId: string) => void;
  onToggleTagActive?: (themeId: string, tagId: string) => void;
  onAddInlineTag?: (name: string) => void;
  onAddInlineStatus?: (name: string, tier: number) => void;
}

const trackLabels: Record<TrackName, string> = {
  abandon: 'Abandon',
  improve: 'Improve',
  milestone: 'Milestone',
};

export function ThemeCard({
  theme,
  compact = false,
  onToggleScratch,
  onTrack,
  onResolve,
  onManage,
  actionChoices = {},
  onActionChoice,
  onToggleBurn,
  onToggleSpecialUse,
  improveLimit = 3,
  onRenameTitle,
  onRenameQuest,
  onReorderTag,
  onToggleTagActive,
  onAddInlineTag,
  onAddInlineStatus,
}: ThemeCardProps) {
  const book = themebookById[theme.typeId];
  const typeLabel = theme.typeName?.trim() || book?.name || theme.typeId;
  const readyCount = theme.pendingNascentPowerTags + theme.pendingImprovements + (theme.improve >= improveLimit && theme.pendingImprovements === 0 && theme.pendingNascentPowerTags === 0 ? 1 : 0) + (theme.abandon >= 3 ? 1 : 0) + (theme.milestone >= 3 ? 1 : 0);
  const titleTag = theme.powerTags[0];
  const titleChoice = titleTag ? actionChoices[titleTag.id] : undefined;
  const titleSelected = titleChoice?.polarity;
  const burnPower = theme.specialImprovements.includes('Big Personality') ? 4 : 3;
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  return (
    <article class={`theme-card might-${theme.might.toLowerCase()} ${compact ? 'is-compact' : ''}`}>
      <header class="theme-card-header">
        <div>
          <span>{typeLabel}</span>
          <small>{theme.might}</small>
        </div>
        <div class="theme-card-header-actions">
          <span class="theme-might-slot" aria-hidden="true">
            <MightIcon might={theme.might} className="theme-might-icon" />
          </span>
          {onManage && (
            <button type="button" class="theme-menu-button" onClick={() => onManage(theme.id)} aria-label={`Edit or develop ${theme.title}`} title="Edit or develop theme">
              <span aria-hidden="true">•••</span>
              {readyCount > 0 && <em>{readyCount}</em>}
            </button>
          )}
        </div>
      </header>

      <div class="theme-card-body">
        {titleTag ? (
          <div class={`theme-title-line theme-title-tag ${titleTag.scratched ? 'is-scratched' : ''} ${titleTag.active === false ? 'is-inactive' : ''} ${titleSelected === 'helpful' ? 'is-helpful-selected' : titleSelected === 'hindering' ? 'is-hindering-selected' : ''}`}>
            <button
              type="button"
              class={`tag-active-diamond title-tag-diamond ${titleTag.active === false ? '' : 'is-active'}`}
              onClick={() => onToggleTagActive?.(theme.id, titleTag.id)}
              aria-pressed={titleTag.active === false ? 'false' : 'true'}
              aria-label={`${titleTag.active === false ? 'Activate' : 'Mark inactive'} title tag ${titleTag.name}`}
              title={titleTag.active === false ? 'Inactive title tag — click diamond to mark active' : 'Active title tag — click diamond to mark inactive'}
            ><span /></button>
            <TagGestureButton
              tagId={titleTag.id}
              normalPolarity="helpful"
              oppositePolarity="hindering"
              onInvoke={onActionChoice}
              className="theme-title-action"
              disabled={titleTag.scratched}
              title={titleTag.scratched ? 'Recover this tag before invoking it' : 'Theme title = power tag. Click/tap for +; Shift-click, right-click, or hold for −.'}
              ariaLabel={`Invoke title tag ${titleTag.name}. Normal use is helpful; Shift-click, right-click, or hold to invoke it as hindering.`}
            >
              <span class="tag-selection-target"><span class="tag-marker-text">{theme.title}</span></span>
            </TagGestureButton>
            <div class="theme-title-tools">
              {onToggleScratch && (
                <button
                  type="button"
                  class={`tag-scratch-button ${titleChoice?.burn ? 'is-roll-burn' : ''}`}
                  onClick={() => {
                    if (!titleTag.scratched && titleChoice?.polarity === 'helpful' && onToggleBurn) onToggleBurn(titleTag.id);
                    else onToggleScratch(theme.id, titleTag.id);
                  }}
                  aria-label={titleTag.scratched ? `Recover ${titleTag.name}` : titleChoice?.polarity === 'helpful' ? `${titleChoice.burn ? 'Cancel burn for' : 'Burn'} ${titleTag.name}` : `Scratch ${titleTag.name}`}
                  title={titleTag.scratched ? 'Recover title tag' : titleChoice?.polarity === 'helpful' ? (titleChoice.burn ? 'Cancel burn for this roll' : `Burn this selected tag for +${burnPower} Power`) : 'Scratch title tag'}
                >
                  <ScratchIcon filled={titleTag.scratched || Boolean(titleChoice?.burn)} title={titleTag.scratched ? 'Recover tag' : titleChoice?.polarity === 'helpful' ? 'Burn for this roll' : 'Scratch tag'} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div class="theme-title-line">
            <h3>{theme.title}</h3>
            {onRenameTitle && <QuickEdit value={theme.title} onCommit={(value) => onRenameTitle(theme.id, value)} label={`Rename ${theme.title}`} className="theme-title-quick-edit" />}
          </div>
        )}

        <div class="tag-stack" aria-label="Power tags">
          {theme.powerTags.slice(1).map((tag) => {
            const choice = actionChoices[tag.id];
            const selected = choice?.polarity;
            return (
              <div key={tag.id}>
                <div
                  class={`sheet-tag-control has-tag-diamond ${onReorderTag ? 'has-drag' : ''} ${dragOverId === tag.id ? 'is-drag-over' : ''} ${tag.scratched ? 'is-scratched' : ''} ${tag.active === false ? 'is-inactive' : ''} ${selected === 'helpful' ? 'is-helpful-selected' : selected === 'hindering' ? 'is-hindering-selected' : ''}`}
                  data-theme-id={theme.id}
                  data-tag-kind="power"
                  data-tag-drop-id={tag.id}
                  onDragOver={(event) => { if (onReorderTag) event.preventDefault(); }}
                  onDragEnter={() => { if (onReorderTag) setDragOverId(tag.id); }}
                  onDrop={(event) => {
                    if (!onReorderTag) return;
                    event.preventDefault();
                    const payload = event.dataTransfer?.getData('text/plain') ?? '';
                    const [dragTheme, kind, fromId] = payload.split('|');
                    if (dragTheme === theme.id && kind === 'power' && fromId) onReorderTag(theme.id, 'power', fromId, tag.id);
                    setDragOverId(null);
                  }}
                >
                  <button
                    type="button"
                    class={`tag-active-diamond ${tag.active === false ? '' : 'is-active'}`}
                    onClick={() => onToggleTagActive?.(theme.id, tag.id)}
                    aria-pressed={tag.active === false ? 'false' : 'true'}
                    aria-label={`${tag.active === false ? 'Activate' : 'Mark inactive'} ${tag.name}`}
                    title={tag.active === false ? 'Inactive tag — click diamond to mark active' : 'Active tag — click diamond to mark inactive'}
                  ><span /></button>
                  <TagGestureButton
                    tagId={tag.id}
                    normalPolarity="helpful"
                    oppositePolarity="hindering"
                    onInvoke={onActionChoice}
                    className={`paper-tag power-tag ${onReorderTag ? 'is-draggable-tag' : ''} ${tag.scratched ? 'is-scratched' : ''} ${selected === 'helpful' ? 'is-helpful-selected' : selected === 'hindering' ? 'is-hindering-selected' : ''}`}
                    draggable={!!onReorderTag}
                    onDragStart={(event) => {
                      if (!onReorderTag) return;
                      event.dataTransfer?.setData('text/plain', `${theme.id}|power|${tag.id}`);
                      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragOverId(null)}
                    disabled={tag.scratched}
                    title={tag.scratched ? 'Recover this tag before invoking it' : tag.active === false ? 'Marked inactive. Click/tap for +; Shift-click, right-click, or hold for −. Drag to reorder.' : 'Click/tap for +; Shift-click, right-click, or hold for −. Drag to reorder.'}
                    ariaLabel={`Invoke ${tag.name}. Normal use is helpful; Shift-click, right-click, or hold to invoke it as hindering.`}
                  >
                    <span class="tag-selection-target"><span class="tag-marker-text">{tag.name}</span></span>
                  </TagGestureButton>
                  <div class="tag-inline-tools">
                    {onToggleScratch && (
                      <button
                        type="button"
                        class={`tag-scratch-button ${choice?.burn ? 'is-roll-burn' : ''}`}
                        onClick={() => {
                          if (!tag.scratched && choice?.polarity === 'helpful' && onToggleBurn) onToggleBurn(tag.id);
                          else onToggleScratch(theme.id, tag.id);
                        }}
                        aria-label={tag.scratched ? `Recover ${tag.name}` : choice?.polarity === 'helpful' ? `${choice.burn ? 'Cancel burn for' : 'Burn'} ${tag.name}` : `Scratch ${tag.name}`}
                        title={tag.scratched ? 'Recover tag' : choice?.polarity === 'helpful' ? (choice.burn ? 'Cancel burn for this roll' : `Burn this selected tag for +${burnPower} Power`) : 'Scratch tag'}
                      >
                        <ScratchIcon filled={tag.scratched || Boolean(choice?.burn)} title={tag.scratched ? 'Recover tag' : choice?.polarity === 'helpful' ? 'Burn for this roll' : 'Scratch tag'} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {theme.weaknessTags.length > 0 && (
          <div class="tag-stack weakness-stack" aria-label="Weakness tags">
            {theme.weaknessTags.map((tag) => {
              const choice = actionChoices[tag.id];
              const selected = choice?.polarity;
              return (
                <div
                  class={`sheet-tag-control weakness-tag-control ${onReorderTag ? 'has-drag' : ''} ${dragOverId === tag.id ? 'is-drag-over' : ''} ${selected === 'helpful' ? 'is-helpful-selected' : selected === 'hindering' ? 'is-hindering-selected' : ''}`}
                  key={tag.id}
                  data-theme-id={theme.id}
                  data-tag-kind="weakness"
                  data-tag-drop-id={tag.id}
                  onDragOver={(event) => { if (onReorderTag) event.preventDefault(); }}
                  onDragEnter={() => { if (onReorderTag) setDragOverId(tag.id); }}
                  onDrop={(event) => {
                    if (!onReorderTag) return;
                    event.preventDefault();
                    const payload = event.dataTransfer?.getData('text/plain') ?? '';
                    const [dragTheme, kind, fromId] = payload.split('|');
                    if (dragTheme === theme.id && kind === 'weakness' && fromId) onReorderTag(theme.id, 'weakness', fromId, tag.id);
                    setDragOverId(null);
                  }}
                >
                  <TagGestureButton
                    tagId={tag.id}
                    normalPolarity="hindering"
                    oppositePolarity="helpful"
                    onInvoke={onActionChoice}
                    className={`paper-tag weakness-tag ${onReorderTag ? 'is-draggable-tag' : ''} ${selected === 'hindering' ? 'is-hindering-selected' : selected === 'helpful' ? 'is-helpful-selected' : ''}`}
                    draggable={!!onReorderTag}
                    onDragStart={(event) => {
                      if (!onReorderTag) return;
                      event.dataTransfer?.setData('text/plain', `${theme.id}|weakness|${tag.id}`);
                      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragOverId(null)}
                    title={onReorderTag ? 'Click/tap for −; Shift-click, right-click, or hold for +. Drag to reorder.' : 'Click/tap for −; Shift-click, right-click, or hold for +.'}
                    ariaLabel={`Invoke weakness ${tag.name}. Normal use is hindering; Shift-click, right-click, or hold to invoke it as helpful.`}
                  >
                    <span class="weakness-copy tag-selection-target">
                      <WeaknessMarkIcon className="weakness-mark" title="Weakness" />
                      <span class="weakness-text">{tag.name}</span>
                    </span>
                  </TagGestureButton>
                </div>
              );
            })}
          </div>
        )}

        <div class="theme-tracks">
          {(Object.keys(trackLabels) as TrackName[]).map((track) => {
            const value = theme[track];
            const max = track === 'improve' ? improveLimit : 3;
            const isReady = track === 'abandon' ? value >= 3 : track === 'milestone' ? value >= 3 : value >= max || theme.pendingImprovements > 0 || theme.pendingNascentPowerTags > 0;
            return (
              <div class={`track ${isReady ? 'is-ready' : ''}`} key={track}>
                <div class="track-pips" aria-label={`${trackLabels[track]} ${value} of ${max}`}>
                  {Array.from({ length: max }, (_, index) => index + 1).map((pip) => (
                    <button
                      type="button"
                      class={pip <= value ? 'is-marked' : ''}
                      key={pip}
                      onClick={() => onTrack?.(theme.id, track, pip === value ? pip - 1 : pip)}
                      aria-label={`${trackLabels[track]} ${pip}`}
                    />
                  ))}
                </div>
                {isReady && onResolve ? (
                  <button class="track-label-button" type="button" onClick={() => onResolve(theme.id, track)} title={`Resolve ${trackLabels[track]}`}>{track === 'improve' && theme.pendingNascentPowerTags > 0 ? `Power tag · ${theme.pendingNascentPowerTags}` : `${trackLabels[track]}${track === 'improve' && value > max ? ` +${value - max}` : ''}`}</button>
                ) : <span>{trackLabels[track]}</span>}
              </div>
            );
          })}
        </div>

        <div class="quest-block">
          <span>Quest</span>
          <div class="quest-copy"><p>“<MistText text={theme.quest} onAddTag={onAddInlineTag} onAddStatus={onAddInlineStatus} />”</p>{onRenameQuest && <QuickEdit value={theme.quest} onCommit={(value) => onRenameQuest(theme.id, value)} label={`Edit quest for ${theme.title}`} className="quest-quick-edit" />}</div>
        </div>

        {theme.specialImprovements.length > 0 && (
          <details class="special-block compact-special-block">
            <summary>{theme.specialImprovements.length} Special Improvement{theme.specialImprovements.length === 1 ? '' : 's'}</summary>
            <div class="special-ability-list">
              {theme.specialImprovements.map((name) => {
                const state = theme.specialStates?.[name] ?? {};
                const summary = specialSummary(theme.typeId, name) || state.description || '';
                const cadence = state.cadence ?? abilityCadence(summary);
                const used = cadence === 'scene' ? state.usedScene : cadence === 'session' ? state.usedSession : false;
                return (
                  <article key={name} class={used ? 'is-used' : ''}>
                    <div><strong>{name}</strong>{summary && <small><MistText text={summary} onAddTag={onAddInlineTag} onAddStatus={onAddInlineStatus} /></small>}{state.notes && <em><MistText text={state.notes} onAddTag={onAddInlineTag} onAddStatus={onAddInlineStatus} /></em>}</div>
                    {(cadence === 'scene' || cadence === 'session') && onToggleSpecialUse && (
                      <button type="button" onClick={() => onToggleSpecialUse(theme.id, name, cadence)}>{used ? 'Ready' : `Use · ${cadence}`}</button>
                    )}
                  </article>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </article>
  );
}
