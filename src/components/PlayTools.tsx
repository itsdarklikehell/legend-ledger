import { useRef, useState } from 'preact/hooks';
import type { ActionChoiceMap, ActionStatusMap, Hero, Polarity, Status, StoryTagMode, Tag } from '../types';
import { addChronicle, applyPolarStatus, applyStatusMark, HERO_STATUS_LIMIT, makeTag, reduceStatus, statusTier, toggleStatusMark, uid } from '../lib/rules';
import { LeafIcon, ScratchIcon } from './Icons';
import { QuickEdit } from './QuickEdit';
import { MistText } from './MistText';
import { TagGestureButton } from './TagGestureButton';

interface PlayToolsProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  actionChoices: ActionChoiceMap;
  actionStatuses: ActionStatusMap;
  onActionChoice: (tagId: string, polarity: Exclude<Polarity, 'unused'>) => void;
  onActionStatus: (statusId: string, polarity: Exclude<Polarity, 'unused'>) => void;
  onToggleBurn: (tagId: string) => void;
}

const storyModeLabel: Record<StoryTagMode, string> = {
  standard: 'story',
  'single-use': 'single-use',
  consumable: 'consumable',
};

export function PlayTools({ hero, onChange, actionChoices, actionStatuses, onActionChoice, onActionStatus, onToggleBurn }: PlayToolsProps) {
  const [statusName, setStatusName] = useState('');
  const [statusTierInput, setStatusTierInput] = useState(1);
  const [statusPolarityInput, setStatusPolarityInput] = useState<Exclude<Polarity, 'unused'>>('hindering');
  const [opposedStatusId, setOpposedStatusId] = useState('');
  const [sceneTagName, setSceneTagName] = useState('');
  const [sceneTagMode, setSceneTagMode] = useState<StoryTagMode>('standard');
  const [sceneGroup, setSceneGroup] = useState('');
  const statusAddDetails = useRef<HTMLDetailsElement | null>(null);
  const storyAddDetails = useRef<HTMLDetailsElement | null>(null);

  const addStatus = () => {
    const name = statusName.trim();
    if (!name) return;

    if (opposedStatusId) {
      const opposed = hero.statuses.find((status) => status.id === opposedStatusId);
      if (opposed) {
        const before = statusTier(opposed);
        const resolved = applyPolarStatus(opposed, name, statusPolarityInput, statusTierInput);
        const statuses = resolved
          ? hero.statuses.map((status) => status.id === opposed.id ? resolved : status)
          : hero.statuses.filter((status) => status.id !== opposed.id);
        const afterText = resolved ? `${resolved.name}-${statusTier(resolved)}` : 'both cancel out';
        onChange(addChronicle({ ...hero, statuses }, `Polar statuses: ${name}-${statusTierInput} opposed ${opposed.name}-${before}; ${afterText}.`));
        setStatusName('');
        setOpposedStatusId('');
        if (statusAddDetails.current) statusAddDetails.current.open = false;
        return;
      }
    }

    const existing = hero.statuses.find((status) => status.name.toLowerCase() === name.toLowerCase());
    const statuses = existing
      ? hero.statuses.map((status) => status.id === existing.id ? { ...applyStatusMark(status, statusTierInput), polarity: statusPolarityInput } : status)
      : [...hero.statuses, { id: uid('status'), name, polarity: statusPolarityInput, marks: [statusTierInput] }];
    onChange(addChronicle({ ...hero, statuses }, `${name}-${statusTierInput} status added.`));
    setStatusName('');
    setOpposedStatusId('');
    if (statusAddDetails.current) statusAddDetails.current.open = false;
  };

  const reduce = (status: Status) => {
    const reduced = reduceStatus(status, 1);
    const removed = reduced.marks.length === 0;
    const statuses = removed ? hero.statuses.filter((item) => item.id !== status.id) : hero.statuses.map((item) => item.id === status.id ? reduced : item);
    onChange(addChronicle({ ...hero, statuses }, removed ? `${status.name} reduced to zero and removed.` : `${status.name} reduced by 1 tier.`));
  };

  const toggleMark = (status: Status, tier: number) => {
    const nextStatus = toggleStatusMark(status, tier);
    const removed = nextStatus.marks.length === 0;
    const statuses = removed ? hero.statuses.filter((item) => item.id !== status.id) : hero.statuses.map((item) => item.id === status.id ? nextStatus : item);
    onChange(addChronicle({ ...hero, statuses }, removed ? `${status.name}: final tracking mark cleared; status removed.` : `${status.name}: tracking box ${tier} ${status.marks.includes(tier) ? 'cleared' : 'marked'}.`));
  };

  const removeStatus = (status: Status) => {
    onChange(addChronicle({ ...hero, statuses: hero.statuses.filter((item) => item.id !== status.id) }, `${status.name} removed.`));
  };

  const addSceneTag = () => {
    const name = sceneTagName.trim();
    if (!name) return;
    const group = sceneGroup.trim();
    const tag: Tag = {
      ...makeTag(name, 'story'),
      storyMode: sceneTagMode,
      storyGroupId: group ? group.toLowerCase().replace(/[^a-z0-9]+/g, '-') || uid('story-theme') : undefined,
      storyGroupName: group || undefined,
    };
    onChange(addChronicle({ ...hero, sceneTags: [...hero.sceneTags, tag] }, `${name} added to the scene${group ? ` as part of ${group}` : ''}.`));
    setSceneTagName('');
    if (storyAddDetails.current) storyAddDetails.current.open = false;
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

  const removeStoryTag = (tag: Tag, destination: 'scene' | 'world') => {
    if (tag.permanent && !window.confirm('This tag is marked permanent by a Moment of Fulfillment. Remove it anyway as a table correction?')) return;
    const next = destination === 'scene'
      ? { ...hero, sceneTags: hero.sceneTags.filter((item) => item.id !== tag.id) }
      : { ...hero, worldTags: hero.worldTags.filter((item) => item.id !== tag.id) };
    onChange(addChronicle(next, `${tag.name} removed from ${destination === 'world' ? 'lasting world tags' : 'the scene'}.`));
    const choice = actionChoices[tag.id];
    if (choice?.polarity && choice.polarity !== 'unused') onActionChoice(tag.id, choice.polarity);
  };

  const renameStatus = (statusId: string, value: string) => {
    const status = hero.statuses.find((item) => item.id === statusId);
    if (!status || status.name === value) return;
    onChange(addChronicle({ ...hero, statuses: hero.statuses.map((item) => item.id === statusId ? { ...item, name: value } : item) }, `${status.name} renamed to ${value}.`));
  };

  const toggleStatusPolarity = (status: Status) => {
    const polarity: Exclude<Polarity, 'unused'> = status.polarity === 'helpful' ? 'hindering' : 'helpful';
    onChange(addChronicle({ ...hero, statuses: hero.statuses.map((item) => item.id === status.id ? { ...item, polarity } : item) }, `${status.name} now defaults to ${polarity} when invoked.`));
  };

  const renameStoryTag = (tagId: string, destination: 'scene' | 'world', value: string) => {
    const source = destination === 'scene' ? hero.sceneTags : hero.worldTags;
    const tag = source.find((item) => item.id === tagId);
    if (!tag || tag.name === value) return;
    const renamed = source.map((item) => item.id === tagId ? { ...item, name: value } : item);
    const next = destination === 'scene' ? { ...hero, sceneTags: renamed } : { ...hero, worldTags: renamed };
    onChange(addChronicle(next, `${tag.name} renamed to ${value}.`));
  };

  const renderStoryTag = (tag: Tag, destination: 'scene' | 'world') => {
    const choice = actionChoices[tag.id];
    const selected = choice?.polarity;
    const shownPower = selected === 'helpful' ? (choice?.burn ? 3 : 1) : selected === 'hindering' ? -1 : null;
    const detail = [
      tag.permanent ? 'permanent' : '',
      tag.storyMode && tag.storyMode !== 'standard' ? storyModeLabel[tag.storyMode] : '',
    ].filter(Boolean).join(' · ');

    return (
      <article class={`tracker-slip story-tracker-slip ${selected === 'helpful' ? 'is-helpful-selected' : selected === 'hindering' ? 'is-hindering-selected' : ''}`} key={tag.id}>
        <div class="tracker-slip-heading">
          <LeafIcon className="tracker-slip-leaf" />
          <TagGestureButton
            tagId={tag.id}
            normalPolarity="helpful"
            oppositePolarity="hindering"
            onInvoke={onActionChoice}
            className="tracker-slip-main"
            title="Tap/click to invoke helpfully. Shift/Alt-click, right-click, or hold to invoke as hindering."
            ariaLabel={`Invoke story tag ${tag.name}. Normal use is helpful; Shift-click, right-click, or hold to invoke it as hindering.`}
          >
            <span>Story tag</span>
            <strong>{tag.name}</strong>
            {detail && <small>{detail}</small>}
          </TagGestureButton>
          {shownPower !== null && <em class={`tracker-slip-power is-${selected}`}>{shownPower > 0 ? '+' : '−'}{Math.abs(shownPower)}</em>}
          <div class="tracker-slip-actions">
            <QuickEdit value={tag.name} onCommit={(value) => renameStoryTag(tag.id, destination, value)} label={`Rename ${tag.name}`} />
            <button
              type="button"
              class={`tracker-slip-scratch ${choice?.burn ? 'is-roll-burn' : ''}`}
              onClick={() => selected === 'helpful' ? onToggleBurn(tag.id) : removeStoryTag(tag, destination)}
              aria-label={selected === 'helpful' ? `${choice?.burn ? 'Cancel burn for' : 'Burn'} ${tag.name}` : `Scratch ${tag.name}`}
              title={selected === 'helpful'
                ? choice?.burn
                  ? 'Cancel burn for this roll'
                  : tag.storyMode === 'single-use'
                    ? 'Burn for +3 Power as a table ruling · standard single-use tags are not burned for Power'
                    : 'Burn this selected story tag for +3 Power'
                : 'Scratch / remove tag'}
            ><ScratchIcon filled={Boolean(choice?.burn)} /></button>
          </div>
        </div>
      </article>
    );
  };

  const renderStoryCollection = (tags: Tag[], destination: 'scene' | 'world') => {
    const ungrouped = tags.filter((tag) => !tag.storyGroupName);
    const groups = [...new Set(tags.map((tag) => tag.storyGroupName).filter((name): name is string => Boolean(name)))];
    return <>
      {ungrouped.map((tag) => renderStoryTag(tag, destination))}
      {groups.map((groupName) => (
        <section class="story-theme-group" key={groupName}>
          <header class="story-theme-title"><strong>{groupName}</strong><small>story theme</small></header>
          <div class="tracker-slip-grid">{tags.filter((tag) => tag.storyGroupName === groupName).map((tag) => renderStoryTag(tag, destination))}</div>
        </section>
      ))}
    </>;
  };

  return (
    <div class="play-tools-grid integrated-play-tools">
      <section class="paper-panel scene-tracker-panel scene-board-v2">
        <header class="scene-tracker-heading scene-board-heading">
          <div>
            <p class="eyebrow">During play</p>
            <h2>Scene trackers</h2>
            <p class="scene-board-subtitle">Tap for the default use. Shift/Alt-click, right-click, or hold to invoke the opposite way. Statuses can default to helpful or hindering.</p>
          </div>
          <div class="scene-board-adders">
            <details class="tracker-add-details tracker-add-popover" ref={statusAddDetails}>
              <summary aria-label="Add or stack status">＋ Status</summary>
              <div class="quick-add-grid">
                <input value={statusName} list="status-name-suggestions" onInput={(event) => setStatusName(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addStatus(); } }} placeholder="Status, e.g. wounded" /><datalist id="status-name-suggestions">{hero.statuses.map((status) => <option value={status.name} key={status.id} />)}</datalist>
                <select value={statusTierInput} onChange={(event) => setStatusTierInput(Number(event.currentTarget.value))}>{[1,2,3,4,5,6].map((tier) => <option value={tier} key={tier}>Tier {tier}</option>)}</select>
                <select value={statusPolarityInput} onChange={(event) => setStatusPolarityInput(event.currentTarget.value as Exclude<Polarity, 'unused'>)} aria-label="Default status polarity">
                  <option value="hindering">Hinders by default</option>
                  <option value="helpful">Helps by default</option>
                </select>
                <select value={opposedStatusId} onChange={(event) => setOpposedStatusId(event.currentTarget.value)} aria-label="Apply as polar opposite to an existing status">
                  <option value="">Stack normally</option>
                  {hero.statuses.map((status) => <option value={status.id} key={status.id}>Opposes {status.name}-{statusTier(status)}</option>)}
                </select>
                <button type="button" class="button secondary" onClick={addStatus}>{opposedStatusId ? 'Apply opposite' : 'Add / stack'}</button>
              </div>
            </details>
            <details class="tracker-add-details tracker-add-popover story-add-details" ref={storyAddDetails}>
              <summary aria-label="Add scene tag">＋ Story tag</summary>
              <div class="story-add-stack story-add-stack-v2">
                <div class="story-quick-entry"><input value={sceneTagName} onInput={(event) => setSceneTagName(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSceneTag(); } }} placeholder="Temporary truth, item, hazard…" /><button type="button" onClick={addSceneTag}>Add</button></div>
                <details class="story-tag-options">
                  <summary>Tag options</summary>
                  <div class="story-add-options">
                    <label><span>Type</span><select value={sceneTagMode} onChange={(event) => setSceneTagMode(event.currentTarget.value as StoryTagMode)}><option value="standard">Standard · reusable</option><option value="single-use">Single-use · removed after use</option><option value="consumable">Consumable · burn when spent</option></select></label>
                    <label><span>Story theme</span><input value={sceneGroup} onInput={(event) => setSceneGroup(event.currentTarget.value)} placeholder="Optional group" /></label>
                  </div>
                </details>
              </div>
            </details>
          </div>
        </header>

        <div class="scene-rack">
          <section class="scene-rack-section status-rack">
            <div class="scene-rack-title"><span>Status</span><small>highest marked box is the current tier</small></div>
            <div class="tracker-slip-grid">
              {hero.statuses.length === 0 && <p class="empty-note tracker-empty-note">No statuses right now.</p>}
              {hero.statuses.map((status) => {
                const tier = statusTier(status);
                const selected = actionStatuses[status.id] ?? 'unused';
                return (
                  <article class={`tracker-slip status-tracker-slip is-default-${status.polarity ?? 'hindering'} ${tier === 0 ? 'is-empty-status' : ''} ${tier === HERO_STATUS_LIMIT ? 'is-limit-reached' : tier > HERO_STATUS_LIMIT ? 'is-limit-exceeded' : ''} ${selected === 'helpful' ? 'is-helpful-selected' : selected === 'hindering' ? 'is-hindering-selected' : ''}`} key={status.id}>
                    <div class="tracker-slip-heading">
                      <LeafIcon className="tracker-slip-leaf" />
                      <TagGestureButton
                        tagId={status.id}
                        normalPolarity={status.polarity}
                        oppositePolarity={status.polarity === 'helpful' ? 'hindering' : 'helpful'}
                        onInvoke={onActionStatus}
                        className="tracker-slip-main"
                        title={`${status.polarity === 'helpful' ? 'Helps' : 'Hinders'} by default. Tap/click for the default use; Shift/Alt-click, right-click, or hold for the opposite.`}
                        ariaLabel={`Invoke status ${status.name}. It defaults to ${status.polarity}; Shift-click, right-click, or hold to invoke it the opposite way.`}
                      >
                        <span>{status.polarity === 'helpful' ? 'Helpful status' : 'Hindering status'}</span>
                        <strong>{status.name}</strong>
                        <small>{tier > 0 ? `tier ${tier}` : 'unmarked'}</small>
                        {tier === HERO_STATUS_LIMIT && <em class="status-limit-note">Limit reached · overcome</em>}
                        {tier > HERO_STATUS_LIMIT && <em class="status-limit-note is-exceeded">Limit exceeded · lasting change</em>}
                      </TagGestureButton>
                      {selected !== 'unused' && <em class={`tracker-slip-power is-${selected}`}>{selected === 'helpful' ? '+' : '−'}{tier}</em>}
                      <div class="tracker-slip-actions">
                        <button type="button" class={`status-polarity-toggle is-${status.polarity}`} onClick={() => toggleStatusPolarity(status)} aria-label={`Status defaults to ${status.polarity}; switch default polarity`} title={`Default: ${status.polarity}. Click to switch.`}>{status.polarity === 'helpful' ? '+' : '−'}</button>
                        <QuickEdit value={status.name} onCommit={(value) => renameStatus(status.id, value)} label={`Rename ${status.name}`} />
                        <button type="button" class="tracker-slip-remove" onClick={() => removeStatus(status)} title="Remove status" aria-label={`Remove ${status.name}`}>×</button>
                      </div>
                    </div>
                    <div class="status-box-track" aria-label={`${status.name} tracking marks`}>
                      {[1,2,3,4,5,6].map((mark) => (
                        <button type="button" class={status.marks.includes(mark) ? 'is-marked' : ''} key={mark} onClick={() => toggleMark(status, mark)} aria-label={`${status.marks.includes(mark) ? 'Clear' : 'Mark'} box ${mark}`}><span>{mark}</span></button>
                      ))}
                      <button type="button" class="status-reduce-control" onClick={() => reduce(status)} title={tier > HERO_STATUS_LIMIT ? 'Standard: this status has exceeded the Hero Limit and is lasting. Reduction is still available for table rulings or later recovery.' : 'Reduce all marks by one tier'}>−1</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section class="scene-rack-section story-rack">
            <div class="scene-rack-title"><span>Story tags</span><small>temporary truths in the current scene</small></div>
            <div class="tracker-slip-grid story-collection">
              {renderStoryCollection(hero.sceneTags, 'scene')}
              {hero.sceneTags.length === 0 && <p class="empty-note tracker-empty-note">No scene tags right now.</p>}
            </div>
          </section>
        </div>

        {hero.worldTags.length > 0 && (
          <section class="lasting-truths-rack">
            <div class="scene-rack-title"><span>Lasting truths</span><small>persistent tags created during the story</small></div>
            <div class="tracker-slip-grid">{renderStoryCollection(hero.worldTags, 'world')}</div>
          </section>
        )}
      </section>

      <details class="paper-panel chronicle-panel compact-table-details">
        <summary><span><small>Session memory</small><strong>Chronicle</strong></span><em>{hero.chronicle.length}</em></summary>
        <div class="chronicle-list">
          {hero.chronicle.length === 0 && <p class="empty-note">Roll an action or update a tracker and the session log will begin here.</p>}
          {hero.chronicle.slice(0, 14).map((entry) => <article key={entry.id}><time>{new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><p><MistText text={entry.text} onAddTag={addInlineSceneTag} onAddStatus={addInlineStatus} /></p></article>)}
        </div>
      </details>
    </div>
  );
}
