import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ActionChoiceMap, ActionMode, ActionStatusMap, Hero, Polarity, RollResult, Tag } from '../types';
import { addChronicle, applyStatusMark, hasQuintessence, markFellowshipImprove, markImprove, resolveRoll, statusTier, uid } from '../lib/rules';
import { ScratchIcon, WeaknessMarkIcon } from './Icons';

interface ActionPanelProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  choices: ActionChoiceMap;
  statusSelection: ActionStatusMap;
  onSetChoices: (choices: ActionChoiceMap | ((current: ActionChoiceMap) => ActionChoiceMap)) => void;
  onClearSelection: () => void;
  onToggleStatus: (statusId: string, polarity: Exclude<Polarity, 'unused'>) => void;
}

interface ChoiceSource {
  tag: Tag;
  sourceLabel: string;
  themeId?: string;
  source: 'theme' | 'backpack' | 'scene' | 'world' | 'fellowship' | 'relationship';
  fellowshipWeakness?: boolean;
}

type TradeMode = 'none' | 'caution' | 'hedge';
type SacrificeLevel = 'none' | 'painful' | 'scarring' | 'grave';

const modeText: Record<ActionMode, string> = {
  quick: 'Fast resolution: the total decides Success and Consequences.',
  detailed: 'On Success, spend action Power on Effects.',
  reaction: 'Use reactive or passive tags to lessen incoming Consequences; on 10+, gain one extra Power to spend.',
};

const outcomeText = (result: RollResult, pushLuck = false): string => {
  if (result.special === 'double-ones') return 'Double ones — Consequences, no Success.';
  if (result.special === 'double-sixes') return 'Double sixes — Success, no Consequences.';
  if (pushLuck && result.success) return 'Great Success + accepted Consequences.';
  if (result.success && result.consequences) return 'Success & Consequences.';
  if (result.success) return 'Success.';
  return 'Consequences.';
};

const sacrificeConsequence = (level: Exclude<SacrificeLevel, 'none'>, lessened: boolean): string => {
  if (level === 'painful') return lessened ? 'scratch one tag in a relevant theme' : 'scratch all tags in a relevant theme';
  if (level === 'scarring') return lessened ? 'pay a Painful sacrifice' : 'replace a relevant theme';
  return lessened ? 'pay a Scarring sacrifice' : 'take a tier-6 status without lessening';
};

const sacrificeOutcomeText = (result: RollResult, level: Exclude<SacrificeLevel, 'none'>): string => {
  if (result.total >= 10 || result.special === 'double-sixes') return `Miracle — Success; ${sacrificeConsequence(level, true)}.`;
  if (result.total >= 7 && result.special !== 'double-ones') return `Fate — Success; ${sacrificeConsequence(level, false)}.`;
  return `In Vain — no Success; ${sacrificeConsequence(level, false)}.`;
};

export function ActionPanel({ hero, onChange, choices, statusSelection, onSetChoices, onClearSelection, onToggleStatus }: ActionPanelProps) {
  const [mode, setMode] = useState<ActionMode>('quick');
  const [description, setDescription] = useState('');
  const [might, setMight] = useState(0);
  const [manualPowerInput, setManualPowerInput] = useState('0');
  const manualPower = Number.parseInt(manualPowerInput, 10) || 0;
  const [result, setResult] = useState<RollResult | null>(null);
  const [spent, setSpent] = useState(0);
  const [fumblingWeaknessIds, setFumblingWeaknessIds] = useState<Set<string>>(new Set());
  const [manualOpen, setManualOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tradeMode, setTradeMode] = useState<TradeMode>('none');
  const [sacrifice, setSacrifice] = useState<SacrificeLevel>('none');
  const [groupAction, setGroupAction] = useState(false);
  const [pushLuck, setPushLuck] = useState(false);
  const [reactionMightToPower, setReactionMightToPower] = useState(false);
  const [mainEffectSpent, setMainEffectSpent] = useState(false);
  const [extraFeatBeforeMain, setExtraFeatBeforeMain] = useState(false);
  const [surgeTagId, setSurgeTagId] = useState<string | null>(null);
  const [repelWitchery, setRepelWitchery] = useState(false);
  const [relationshipWeaknessIds, setRelationshipWeaknessIds] = useState<Set<string>>(new Set());
  const lastRollInputSignature = useRef<string | null>(null);
  const preserveNextSelectionChange = useRef(false);

  const invalidateResolvedRoll = () => {
    lastRollInputSignature.current = null;
    setResult(null);
    setSpent(0);
    setPushLuck(false);
    setMainEffectSpent(false);
    setExtraFeatBeforeMain(false);
    setRepelWitchery(false);
  };

  const sourceTags = useMemo<ChoiceSource[]>(() => {
    const fellowshipEntries: ChoiceSource[] = hero.fellowship ? [
      ...hero.fellowship.theme.powerTags.map((tag) => ({ tag, sourceLabel: `Fellowship · ${hero.fellowship?.theme.title ?? ''}`, source: 'fellowship' as const })),
      ...hero.fellowship.theme.weaknessTags.map((tag) => ({ tag, sourceLabel: 'Fellowship · weakness', source: 'fellowship' as const, fellowshipWeakness: true })),
      ...hero.fellowship.relationships.map((item) => ({ tag: item.tag, sourceLabel: `Relationship · ${item.heroName}`, source: 'relationship' as const })),
    ] : [];
    return [
      ...hero.themes.flatMap((theme) => [
        ...theme.powerTags.map((tag) => ({ tag, sourceLabel: theme.title, themeId: theme.id, source: 'theme' as const })),
        ...theme.weaknessTags.map((tag) => ({ tag, sourceLabel: `${theme.title} · weakness`, themeId: theme.id, source: 'theme' as const })),
      ]),
      ...hero.backpack.map((tag) => ({ tag, sourceLabel: 'Backpack', source: 'backpack' as const })),
      ...hero.sceneTags.map((tag) => ({ tag, sourceLabel: 'Scene', source: 'scene' as const })),
      ...hero.worldTags.map((tag) => ({ tag, sourceLabel: 'Lasting world tag', source: 'world' as const })),
      ...fellowshipEntries,
    ];
  }, [hero]);

  const selected = useMemo(
    () => sourceTags.filter((entry) => (choices[entry.tag.id]?.polarity ?? 'unused') !== 'unused'),
    [sourceTags, choices],
  );
  const selectedStatuses = useMemo(() => hero.statuses.flatMap((status) => {
    const polarity = statusSelection[status.id] ?? 'unused';
    return polarity === 'unused' ? [] : [{ status, polarity }];
  }), [hero.statuses, statusSelection]);
  const helpfulStatus = Math.max(0, ...selectedStatuses.filter((entry) => entry.polarity === 'helpful').map((entry) => statusTier(entry.status)));
  const hinderingStatus = Math.max(0, ...selectedStatuses.filter((entry) => entry.polarity === 'hindering').map((entry) => statusTier(entry.status)));
  const appliedHelpfulStatusId = selectedStatuses.find((entry) => entry.polarity === 'helpful' && statusTier(entry.status) === helpfulStatus)?.status.id;
  const appliedHinderingStatusId = selectedStatuses.find((entry) => entry.polarity === 'hindering' && statusTier(entry.status) === hinderingStatus)?.status.id;

  const tagPower = selected.reduce((sum, entry) => {
    const choice = choices[entry.tag.id];
    if (!choice) return sum;
    const theme = entry.themeId ? hero.themes.find((item) => item.id === entry.themeId) : undefined;
    const burnValue = surgeTagId === entry.tag.id ? 5 : theme?.specialImprovements.includes('Big Personality') ? 4 : 3;
    // The sheet keeps printed burn restrictions advisory rather than blocking table rulings.
    // Weakness tags remain a separate category; power/story tags can be marked as burned here.
    const burnApplied = entry.tag.kind !== 'weakness' && choice.burn && choice.polarity === 'helpful';
    const value = burnApplied ? burnValue : 1;
    return sum + (choice.polarity === 'helpful' ? value : -1);
  }, 0);
  // Fumbling Master changes the weakness from -1 to -2 total, so it adds
  // one extra point of penalty while marking two Improve instead of one.
  const fumblingExtraPenalty = hasQuintessence(hero, 'Fumbling Master')
    ? selected.filter((entry) => entry.tag.kind === 'weakness' && choices[entry.tag.id]?.polarity === 'hindering' && fumblingWeaknessIds.has(entry.tag.id)).length
    : 0;
  const largerThanLife = hasQuintessence(hero, 'Larger Than Life');
  const adjustedMight = largerThanLife && might === -3 ? -2 : might;
  const mightPower = mode === 'reaction' && !reactionMightToPower ? 0 : adjustedMight;
  const basePower = tagPower - fumblingExtraPenalty + helpfulStatus - hinderingStatus + mightPower + manualPower;
  // Making a Sacrifice ignores normal Power. The Narrator may still add a number to the roll,
  // so the manual modifier becomes that number while Sacrifice is selected.
  const rollPower = sacrifice !== 'none' ? manualPower : basePower + (tradeMode === 'caution' ? -1 : tradeMode === 'hedge' ? 1 : 0);
  const expectedSpendPower = tradeMode === 'caution' ? basePower + 1 : tradeMode === 'hedge' ? basePower - 1 : basePower;
  const standardSpendable = (result?.spendable ?? 0) + (pushLuck && mode === 'detailed' ? 1 : 0);
  const repelSpendable = repelWitchery && mode === 'reaction' && result && !result.success ? Math.max(1, rollPower) : 0;
  const effectiveSpendable = sacrifice !== 'none' ? 0 : Math.max(0, Math.max(standardSpendable, repelSpendable));
  const remaining = Math.max(0, effectiveSpendable - spent);
  const selectedForResolution = sacrifice === 'none' ? selected : [];
  const statusesForResolution = sacrifice === 'none' ? selectedStatuses : [];
  const burned = selectedForResolution.filter((entry) => entry.tag.kind !== 'weakness' && choices[entry.tag.id]?.burn && choices[entry.tag.id]?.polarity === 'helpful');
  const nonStandardBurns = burned.filter((entry) => entry.tag.storyMode === 'single-use' || entry.source === 'fellowship' || entry.source === 'relationship');
  const previousTagIds = new Set(hero.previousAction?.tagIds ?? []);
  const previousStatusIds = new Set(hero.previousAction?.statusIds ?? []);
  const displayedPower = result?.power ?? rollPower;
  const rollInputSignature = useMemo(() => JSON.stringify({
    mode,
    might,
    manualPower,
    tradeMode,
    sacrifice,
    choices: Object.entries(choices).sort(([left], [right]) => left.localeCompare(right)),
    statuses: Object.entries(statusSelection).sort(([left], [right]) => left.localeCompare(right)),
    fumbling: [...fumblingWeaknessIds].sort(),
    surgeTagId,
    reactionMightToPower,
  }), [mode, might, manualPower, tradeMode, sacrifice, choices, statusSelection, fumblingWeaknessIds, surgeTagId, reactionMightToPower]);

  useEffect(() => {
    if (!result || lastRollInputSignature.current === null || lastRollInputSignature.current === rollInputSignature) return;
    if (preserveNextSelectionChange.current) {
      preserveNextSelectionChange.current = false;
      lastRollInputSignature.current = rollInputSignature;
      return;
    }
    invalidateResolvedRoll();
  }, [result, rollInputSignature]);

  const setPolarity = (tagId: string, polarity: Polarity) => {
    invalidateResolvedRoll();
    onSetChoices((current) => ({ ...current, [tagId]: { polarity, burn: polarity === 'helpful' ? current[tagId]?.burn ?? false : false } }));
  };

  const setBurn = (tagId: string, burn: boolean) => {
    invalidateResolvedRoll();
    onSetChoices((current) => ({ ...current, [tagId]: { polarity: current[tagId]?.polarity ?? 'helpful', burn } }));
  };

  const executeRoll = () => {
    lastRollInputSignature.current = rollInputSignature;
    let nextResult = resolveRoll(mode, rollPower, undefined, hasQuintessence(hero, 'Beyond Luck'));
    if (mode === 'detailed' && nextResult.success) nextResult = { ...nextResult, spendable: Math.max(1, expectedSpendPower) };
    setResult(nextResult);
    setSpent(0);
    setPushLuck(false);
    setMainEffectSpent(false);
    setExtraFeatBeforeMain(false);
    setRepelWitchery(false);

    let nextHero = hero;
    const burnedIds = new Set<string>();
    const fellowshipSingleUseIds = new Set<string>();
    const singleUseStoryIds = new Set<string>();
    let fellowshipWeaknessCount = 0;

    selectedForResolution.forEach((entry) => {
      const choice = choices[entry.tag.id];
      if (!choice) return;
      if (entry.tag.kind === 'weakness' && choice.polarity === 'hindering') {
        if (entry.themeId) nextHero = markImprove(nextHero, entry.themeId, fumblingWeaknessIds.has(entry.tag.id) ? 2 : 1);
        else if (entry.fellowshipWeakness) fellowshipWeaknessCount += 1;
      }
      if (entry.source === 'relationship' && choice.polarity === 'hindering' && relationshipWeaknessIds.has(entry.tag.id)) fellowshipWeaknessCount += 1;
      if (entry.tag.kind !== 'weakness' && choice.burn && choice.polarity === 'helpful') burnedIds.add(entry.tag.id);
      if (entry.tag.kind === 'story' && entry.tag.storyMode === 'single-use' && (entry.source === 'backpack' || entry.source === 'scene' || entry.source === 'world')) singleUseStoryIds.add(entry.tag.id);
      if ((entry.source === 'fellowship' && entry.tag.kind === 'power') || entry.source === 'relationship') {
        fellowshipSingleUseIds.add(entry.tag.id);
      }
    });

    if (fellowshipWeaknessCount > 0 && nextHero.fellowship) {
      let fellowshipTheme = nextHero.fellowship.theme;
      for (let index = 0; index < fellowshipWeaknessCount; index += 1) fellowshipTheme = markFellowshipImprove(fellowshipTheme, 1);
      nextHero = { ...nextHero, fellowship: { ...nextHero.fellowship, theme: fellowshipTheme } };
    }

    if (burnedIds.size > 0 || fellowshipSingleUseIds.size > 0 || singleUseStoryIds.size > 0) {
      nextHero = {
        ...nextHero,
        themes: nextHero.themes.map((theme) => ({
          ...theme,
          powerTags: theme.powerTags.map((tag) => burnedIds.has(tag.id) ? { ...tag, scratched: true } : tag),
        })),
        backpack: nextHero.backpack.filter((tag) => !burnedIds.has(tag.id) && !singleUseStoryIds.has(tag.id)),
        sceneTags: nextHero.sceneTags.filter((tag) => !burnedIds.has(tag.id) && !singleUseStoryIds.has(tag.id)),
        // Permanent story tags created by Fulfillment can always be burned and are never scratched.
        worldTags: nextHero.worldTags.filter((tag) => tag.permanent || (!burnedIds.has(tag.id) && !singleUseStoryIds.has(tag.id))),
        fellowship: nextHero.fellowship ? {
          ...nextHero.fellowship,
          theme: {
            ...nextHero.fellowship.theme,
            powerTags: nextHero.fellowship.theme.powerTags.map((tag) =>
              burnedIds.has(tag.id) || fellowshipSingleUseIds.has(tag.id)
                ? { ...tag, scratched: true }
                : tag,
            ),
          },
          relationships: nextHero.fellowship.relationships.map((relationship) =>
            burnedIds.has(relationship.tag.id) || fellowshipSingleUseIds.has(relationship.tag.id)
              ? { ...relationship, tag: { ...relationship.tag, scratched: true } }
              : relationship,
          ),
        } : undefined,
      };
    }

    if (surgeTagId && burnedIds.has(surgeTagId)) {
      const surgeEntry = selected.find((entry) => entry.tag.id === surgeTagId && entry.themeId);
      if (surgeEntry?.themeId) {
        const surgeTheme = nextHero.themes.find((theme) => theme.id === surgeEntry.themeId);
        if (surgeTheme?.specialImprovements.includes('Surge of Power')) {
          const alreadyUsed = Boolean(surgeTheme.specialStates?.['Surge of Power']?.usedSession);
          const existingExhausted = nextHero.statuses.find((status) => status.name.toLowerCase() === 'exhausted');
          const statuses = existingExhausted
            ? nextHero.statuses.map((status) => status.id === existingExhausted.id ? applyStatusMark(status, 2) : status)
            : [...nextHero.statuses, { id: uid('status'), name: 'exhausted', polarity: 'hindering' as const, marks: [2] }];
          nextHero = {
            ...nextHero,
            statuses,
            themes: nextHero.themes.map((theme) => theme.id === surgeEntry.themeId ? {
              ...theme,
              specialStates: { ...theme.specialStates, 'Surge of Power': { ...(theme.specialStates?.['Surge of Power'] ?? {}), usedSession: true } },
            } : theme),
          };
          nextHero = addChronicle(nextHero, `Surge of Power: burned ${surgeEntry.tag.name} for +5 Power and took exhausted-2${alreadyUsed ? ' (reused this session as a table ruling)' : ''}.`);
        }
      }
    }

    const invokedNames = selectedForResolution.map((entry) => entry.tag.name).join(', ');
    const statusNames = statusesForResolution.map((entry) => `${entry.polarity === 'helpful' ? '+' : '−'}${entry.status.name}-${statusTier(entry.status)}`).join(', ');
    const specialMode = sacrifice !== 'none' ? ` Sacrifice: ${sacrifice}.` : tradeMode !== 'none' ? ` Detailed trade: ${tradeMode}.` : '';
    const warnings = burnedIds.size > 1 ? ' Multiple burns recorded (standard play normally burns one tag).' : '';
    nextHero = addChronicle(nextHero, `${mode === 'reaction' ? 'Reaction' : groupAction ? 'Group action' : 'Action'}${description.trim() ? `: ${description.trim()}` : ''} — ${nextResult.dieA}+${nextResult.dieB} ${rollPower >= 0 ? '+' : ''}${rollPower} = ${nextResult.total}. ${sacrifice !== 'none' ? sacrificeOutcomeText(nextResult, sacrifice) : outcomeText(nextResult)}${specialMode}${invokedNames ? ` Tags: ${invokedNames}.` : ''}${statusNames ? ` Statuses: ${statusNames}.` : ''}${warnings}`);
    if (mode !== 'reaction') nextHero = { ...nextHero, previousAction: { tagIds: selectedForResolution.map((entry) => entry.tag.id), statusIds: statusesForResolution.map((entry) => entry.status.id), at: new Date().toISOString() } };
    onChange(nextHero);
    if (burnedIds.size > 0 || fellowshipSingleUseIds.size > 0 || singleUseStoryIds.size > 0) {
      preserveNextSelectionChange.current = true;
      onSetChoices((current) => {
        const next = { ...current };
        burnedIds.forEach((id) => delete next[id]);
        fellowshipSingleUseIds.forEach((id) => delete next[id]);
        singleUseStoryIds.forEach((id) => delete next[id]);
        return next;
      });
    }
  };

  const applyRollOverride = (kind: 'lucky' | 'virtuoso') => {
    if (!result) return;
    const target = kind === 'lucky' ? 7 : 10;
    const totalDelta = target - result.total;
    const name = kind === 'lucky' ? 'Lucky Bastard' : 'Virtuoso';
    const record = hero.quintessences.find((item) => item.name === name);
    const rolledDoubleOnes = result.dieA === 1 && result.dieB === 1;
    const doubleOnesConflict = kind === 'lucky' ? rolledDoubleOnes : rolledDoubleOnes && !hasQuintessence(hero, 'Beyond Luck');
    const nonStandard = Boolean(record?.usedSession || doubleOnesConflict);
    const nextResult: RollResult = { ...result, total: target, success: true, consequences: target <= 9, special: null };
    if (mode === 'detailed') nextResult.spendable = Math.max(1, result.spendable);
    setResult(nextResult);
    const quintessences = hero.quintessences.map((item) => item.name === name ? { ...item, usedSession: true } : item);
    onChange(addChronicle({ ...hero, quintessences }, `${name}: roll adjusted by ${totalDelta >= 0 ? '+' : ''}${totalDelta} to ${target}${nonStandard ? ' as a table ruling outside the printed limit' : ''}.`));
  };

  const applyRepelWitchery = () => {
    if (!result || !selectedRepelTheme?.themeId) return;
    const theme = hero.themes.find((item) => item.id === selectedRepelTheme.themeId);
    if (!theme) return;
    const reused = Boolean(theme.specialStates?.['Repel Witchery']?.usedScene);
    setRepelWitchery(true);
    const themes = hero.themes.map((item) => item.id === theme.id ? {
      ...item,
      specialStates: { ...item.specialStates, 'Repel Witchery': { ...(item.specialStates?.['Repel Witchery'] ?? {}), usedScene: true } },
    } : item);
    onChange(addChronicle({ ...hero, themes }, `Repel Witchery: Power may be spent to lessen these magical Consequences${reused ? ' (reused this scene as a table ruling)' : ''}.`));
  };

  const clearAction = () => {
    lastRollInputSignature.current = null;
    preserveNextSelectionChange.current = false;
    onClearSelection();
    setResult(null);
    setSpent(0);
    setDescription('');
    setMight(0);
    setManualPowerInput('0');
    setFumblingWeaknessIds(new Set());
    setManualOpen(false);
    setMoreOpen(false);
    setTradeMode('none');
    setSacrifice('none');
    setGroupAction(false);
    setPushLuck(false);
    setReactionMightToPower(false);
    setMainEffectSpent(false);
    setExtraFeatBeforeMain(false);
    setSurgeTagId(null);
    setRepelWitchery(false);
    setRelationshipWeaknessIds(new Set());
  };

  const spend = (amount: number, kind: 'main' | 'extra' = 'main') => {
    if (kind === 'extra' && !mainEffectSpent) setExtraFeatBeforeMain(true);
    if (kind === 'main') setMainEffectSpent(true);
    setSpent((current) => Math.min(effectiveSpendable, current + amount));
  };
  const hasSelection = selected.length > 0 || selectedStatuses.length > 0;
  const expanded = manualOpen || hasSelection || Boolean(result);
  const canPushLuck = Boolean(result && sacrifice === 'none' && result.success && result.total >= 10);
  const luckyRecord = hero.quintessences.find((record) => record.name === 'Lucky Bastard');
  const virtuosoRecord = hero.quintessences.find((record) => record.name === 'Virtuoso');
  const rolledDoubleOnes = Boolean(result && result.dieA === 1 && result.dieB === 1);
  const beyondLuck = hasQuintessence(hero, 'Beyond Luck');
  const canLucky = Boolean(result && result.total <= 6 && result.special !== 'double-sixes' && luckyRecord);
  const canVirtuoso = Boolean(result && result.total >= 7 && result.total <= 9 && result.special !== 'double-sixes' && virtuosoRecord);
  const luckyNonStandard = Boolean(luckyRecord?.usedSession || rolledDoubleOnes);
  const virtuosoNonStandard = Boolean(virtuosoRecord?.usedSession || (rolledDoubleOnes && !beyondLuck));
  const reactionReuse = mode === 'reaction' && (selected.some((entry) => previousTagIds.has(entry.tag.id)) || selectedStatuses.some((entry) => previousStatusIds.has(entry.status.id)));
  const tradeNonStandard = mode === 'detailed' && ((tradeMode === 'caution' && basePower > 2) || (tradeMode === 'hedge' && basePower < 2));
  const reactionMightTiers = might === -3 && largerThanLife ? 2 : Math.abs(might);
  const reactionMightTags = Math.abs(might) === 6 ? 3 : 1;
  const reactionMightSummary = might === 0 ? '' : `${might < 0 ? 'increase' : 'decrease'} ${reactionMightTiers} status tier${reactionMightTiers === 1 ? '' : 's'} or ${reactionMightTags} tag${reactionMightTags === 1 ? '' : 's'}`;
  const selectedRepelTheme = selected.find((entry) => entry.themeId && hero.themes.find((theme) => theme.id === entry.themeId)?.specialImprovements.includes('Repel Witchery'));
  const repelState = selectedRepelTheme?.themeId ? hero.themes.find((theme) => theme.id === selectedRepelTheme.themeId)?.specialStates?.['Repel Witchery'] : undefined;
  const canRepelWitchery = Boolean(result && mode === 'reaction' && !result.success && selectedRepelTheme);
  const improvedCounterAvailable = Boolean(result && mode === 'reaction' && result.total >= 10 && selected.some((entry) => previousTagIds.has(entry.tag.id) && entry.themeId && hero.themes.find((theme) => theme.id === entry.themeId)?.specialImprovements.includes('Improved Counter')));
  const commonHeroThemeId = hero.quintessences.find((record) => record.name === 'The Common Hero')?.themeId;
  const littleThingsThemeId = hero.quintessences.find((record) => record.name === 'Master of the Little Things')?.themeId;
  const commonHeroRelevant = Boolean(commonHeroThemeId && selected.some((entry) => entry.themeId === commonHeroThemeId));
  const littleThingsRelevant = Boolean(littleThingsThemeId && might < 0 && selected.some((entry) => entry.themeId === littleThingsThemeId));

  return (
    <section class={`action-panel action-tray minimal-action-tray roll-folio ${expanded ? 'is-open' : 'is-idle'}`} aria-label="Action roll">
      {!expanded ? (
        <div class="roll-folio-idle">
          <span class="roll-idle-diamond" aria-hidden="true">◇</span>
          <div class="roll-idle-copy">
            <span>Action</span>
            <strong>Tap tags on the sheet to build a roll</strong>
            <small>Selected tags are circled in ink. Shift-click, right-click, or hold for the opposite polarity.</small>
          </div>
          <button type="button" class="roll-idle-open" onClick={() => setManualOpen(true)}>Roll without tags</button>
        </div>
      ) : (
        <>
          <header class="roll-folio-head">
            <div class="roll-folio-title">
              <span>Action</span>
              <small>{modeText[mode]}</small>
            </div>
            <div class="mode-tabs roll-mode-tabs" role="group" aria-label="Action resolution mode">
              {(['quick','detailed','reaction'] as ActionMode[]).map((option) => (
                <button key={option} type="button" class={mode === option ? 'is-active' : ''} onClick={() => { invalidateResolvedRoll(); setMode(option); }}>{option}</button>
              ))}
            </div>
            <button type="button" class="roll-folio-close" onClick={clearAction} aria-label="Clear and close action">×</button>
          </header>

          <div class="roll-folio-main">
            <label class="roll-action-line">
              <span>What do you do?</span>
              <input value={description} onInput={(event) => setDescription(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); executeRoll(); } }} placeholder="Describe the action…" />
            </label>

            <label class="roll-might-control" title={mode === 'reaction' ? 'Might adjusts incoming Consequences in standard reactions' : 'Might modifier'}>
              <span>{mode === 'reaction' ? 'Source Might' : 'Might'}</span>
              <select value={might} onChange={(event) => { invalidateResolvedRoll(); setMight(Number(event.currentTarget.value)); }}>
                {mode === 'reaction' ? <><option value={-6}>Extremely Imperiled · Consequences +6</option><option value={-3}>Imperiled · Consequences +{largerThanLife ? 2 : 3}{largerThanLife ? ' · Larger Than Life' : ''}</option><option value={0}>Equal</option><option value={3}>Favored · Consequences −3</option><option value={6}>Extremely Favored · Consequences −6</option></> : <><option value={-6}>−6</option><option value={-3}>{largerThanLife ? '−2 · Larger Than Life' : '−3'}</option><option value={0}>0</option><option value={3}>+3</option><option value={6}>+6</option></>}
              </select>
            </label>

            <div class="roll-power-seal" title="Final Power before rolling">
              <span>Power</span>
              <strong>{displayedPower >= 0 ? '+' : ''}{displayedPower}</strong>
            </div>

            <button type="button" class="roll-throw-button" onClick={executeRoll}>
              <span class="roll-dice-mark" aria-hidden="true">⚄ ⚂</span>
              <strong>Roll 2d6</strong>
            </button>
          </div>

          <div class="roll-folio-ledger">
            {hasSelection ? (
              <div class="roll-contribution-overview" aria-label="Current roll contributions">
                <span class="roll-contribution-label">Contributing</span>
                <div class="roll-contribution-list">
                  {selected.map((entry) => {
                    const choice = choices[entry.tag.id];
                    if (!choice || choice.polarity === 'unused') return null;
                    const isWeakness = entry.tag.kind === 'weakness';
                    const canBurn = !isWeakness && choice.polarity === 'helpful';
                    const nonStandardBurn = canBurn && (entry.tag.storyMode === 'single-use' || entry.source === 'fellowship' || entry.source === 'relationship');
                    const entryTheme = entry.themeId ? hero.themes.find((theme) => theme.id === entry.themeId) : undefined;
                    const burnValue = surgeTagId === entry.tag.id ? 5 : entryTheme?.specialImprovements.includes('Big Personality') ? 4 : 3;
                    const canSurge = Boolean(canBurn && entryTheme?.specialImprovements.includes('Surge of Power'));
                    const surgeUsed = Boolean(entryTheme?.specialStates?.['Surge of Power']?.usedSession);
                    const reused = mode === 'reaction' && previousTagIds.has(entry.tag.id);
                    const opposite: Exclude<Polarity, 'unused'> = choice.polarity === 'helpful' ? 'hindering' : 'helpful';
                    return <span class={`roll-contribution is-${choice.polarity} ${isWeakness ? 'is-native-weakness' : ''} ${reused ? 'has-rule-warning' : ''}`} key={entry.tag.id}>
                      <button
                        type="button"
                        class={`roll-contribution-token kind-tag is-${choice.polarity}`}
                        onClick={() => setPolarity(entry.tag.id, opposite)}
                        title={`${entry.sourceLabel}. Click to switch to ${opposite}${reused ? '. Used in the immediately preceding action.' : ''}`}
                      >
                        {isWeakness && <WeaknessMarkIcon className="roll-contribution-weakness-icon" />}
                        <span>{entry.tag.name}</span>
                      </button>
                      <span class="roll-contribution-tools">
                        {canBurn && <button type="button" class={`roll-contribution-burn ${choice.burn ? 'is-active' : ''} ${nonStandardBurn ? 'has-rule-warning' : ''}`} onClick={() => { if (choice.burn && surgeTagId === entry.tag.id) setSurgeTagId(null); setBurn(entry.tag.id, !choice.burn); }} title={choice.burn ? 'Cancel burn' : nonStandardBurn ? `Burn for +${burnValue} Power · table ruling; this tag is normally single-use and not burnable` : `Burn for +${burnValue} Power`} aria-label={`${choice.burn ? 'Cancel burn for' : 'Burn'} ${entry.tag.name}`}><ScratchIcon filled={choice.burn} /></button>}
                        {canSurge && choice.burn && <button type="button" class={`roll-contribution-surge ${surgeTagId === entry.tag.id ? 'is-active' : ''} ${surgeUsed ? 'has-rule-warning' : ''}`} onClick={() => { invalidateResolvedRoll(); setSurgeTagId((current) => current === entry.tag.id ? null : entry.tag.id); }} title={`Surge of Power: burn for +5${surgeUsed ? '. Standard: already used this session; selecting again is a table ruling.' : ''}`}>+5</button>}
                        {entry.source === 'relationship' && choice.polarity === 'hindering' && hero.fellowship && <button type="button" class={`roll-contribution-relationship-weakness ${relationshipWeaknessIds.has(entry.tag.id) ? 'is-active' : ''}`} onClick={() => { invalidateResolvedRoll(); setRelationshipWeaknessIds((current) => { const next = new Set(current); if (next.has(entry.tag.id)) next.delete(entry.tag.id); else next.add(entry.tag.id); return next; }); }} title="Optional rule: treat this relationship tag as a Fellowship weakness and mark Improve">Improve</button>}
                        {isWeakness && choice.polarity === 'hindering' && hasQuintessence(hero, 'Fumbling Master') && entry.themeId && <button type="button" class={`roll-contribution-fumbling ${fumblingWeaknessIds.has(entry.tag.id) ? 'is-active' : ''}`} onClick={() => { invalidateResolvedRoll(); setFumblingWeaknessIds((current) => { const next = new Set(current); if (next.has(entry.tag.id)) next.delete(entry.tag.id); else next.add(entry.tag.id); return next; }); }} title="Toggle Fumbling Master" aria-label={`Toggle Fumbling Master for ${entry.tag.name}`}>F</button>}
                        <button type="button" class="roll-contribution-remove" onClick={() => setPolarity(entry.tag.id, 'unused')} title="Remove from roll" aria-label={`Remove ${entry.tag.name} from roll`}>×</button>
                      </span>
                    </span>;
                  })}
                  {selectedStatuses.map(({ status, polarity }) => {
                    const reused = mode === 'reaction' && previousStatusIds.has(status.id);
                    const opposite: Exclude<Polarity, 'unused'> = polarity === 'helpful' ? 'hindering' : 'helpful';
                    const tier = statusTier(status);
                    const highestTier = polarity === 'helpful' ? helpfulStatus : hinderingStatus;
                    const appliedId = polarity === 'helpful' ? appliedHelpfulStatusId : appliedHinderingStatusId;
                    const applied = status.id === appliedId;
                    const tied = !applied && tier === highestTier;
                    return <span class={`roll-contribution is-${polarity} is-status ${applied ? 'is-status-applied' : 'is-status-dropped'} ${tied ? 'is-status-tied' : ''} ${reused ? 'has-rule-warning' : ''}`} key={status.id}>
                      <button
                        type="button"
                        class={`roll-contribution-token kind-status is-${polarity}`}
                        onClick={() => { invalidateResolvedRoll(); onToggleStatus(status.id, opposite); }}
                        title={`Status. Click to switch to ${opposite}. ${applied ? 'This is the highest status of this polarity and contributes to Power.' : tied ? 'This ties the highest status; that tier is counted only once.' : `A higher ${polarity} status is selected, so this one does not add more Power.`}${reused ? ' Used in the immediately preceding action.' : ''}`}
                      >
                        <span>{status.name}-{tier}</span>
                      </button>
                      <span class="roll-contribution-tools">
                        <button type="button" class="roll-contribution-remove" onClick={() => { invalidateResolvedRoll(); onToggleStatus(status.id, polarity); }} title="Remove from roll" aria-label={`Remove ${status.name} from roll`}>×</button>
                      </span>
                    </span>;
                  })}
                </div>
              </div>
            ) : <span class="roll-empty-selection">No tags selected — roll at 0 Power.</span>}

            <div class="roll-power-breakdown" aria-label="Power breakdown">
              {sacrifice !== 'none' ? <><span>Normal Power <strong>ignored</strong></span>{manualPower !== 0 && <span>Narrator modifier <strong>{manualPower > 0 ? '+' : ''}{manualPower}</strong></span>}</> : <>
                <span>Tags <strong>{tagPower >= 0 ? '+' : ''}{tagPower}</strong></span>
                {(helpfulStatus > 0 || hinderingStatus > 0) && <span>Status <strong>{helpfulStatus - hinderingStatus >= 0 ? '+' : ''}{helpfulStatus - hinderingStatus}</strong></span>}
                {mightPower !== 0 && <span>Might <strong>{mightPower > 0 ? '+' : ''}{mightPower}</strong></span>}
                {mode === 'reaction' && might !== 0 && !reactionMightToPower && <span>Consequences <strong>{reactionMightSummary}</strong></span>}
                {manualPower !== 0 && <span>Manual <strong>{manualPower > 0 ? '+' : ''}{manualPower}</strong></span>}
                {fumblingExtraPenalty > 0 && <span>Fumbling <strong>−{fumblingExtraPenalty} extra</strong></span>}
              </>}
            </div>

            <button type="button" class={`roll-more-toggle ${moreOpen ? 'is-active' : ''}`} onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen}>Advanced</button>
          </div>

          {(burned.length > 1 || nonStandardBurns.length > 0 || reactionReuse || tradeNonStandard || extraFeatBeforeMain || (mode === 'reaction' && reactionMightToPower) || (sacrifice !== 'none' && hasSelection) || commonHeroRelevant || littleThingsRelevant) && <div class="rule-advisory-row">
            {burned.length > 1 && <span>Standard: burn one tag for Power. This roll keeps all {burned.length} burns as a table ruling.</span>}
            {nonStandardBurns.length > 0 && <span>Standard: single-use, Fellowship, and relationship tags are not burned for Power. Your selected burn{nonStandardBurns.length === 1 ? '' : 's'} still count{nonStandardBurns.length === 1 ? 's' : ''} here.</span>}
            {reactionReuse && <span>Standard: do not reuse tags or statuses from the immediately preceding action unless another rule permits it. Reuse remains allowed here.</span>}
            {tradeNonStandard && <span>Trade Power is outside its printed Power range. The selected trade is still applied.</span>}
            {extraFeatBeforeMain && <span>Standard: spend at least 1 Power on the action's main purpose before buying an extra feat. The spend is kept.</span>}
            {mode === 'reaction' && reactionMightToPower && <span>Table ruling: Might is being applied directly to reaction Power.</span>}
            {sacrifice !== 'none' && hasSelection && <span>Making a Sacrifice ignores normal tag, status, and Might Power. Your current selections stay on the sheet but are not invoked by this roll.</span>}
            {commonHeroRelevant && <span>The Common Hero: the linked theme may be treated as one Might level higher when its tags are used.</span>}
            {littleThingsRelevant && <span>Master of the Little Things: if the linked theme's Might is working against you, you may treat that theme as one Might level lower.</span>}
          </div>}

          {moreOpen && <div class="action-more-panel roll-more-panel">
            <label><span>{sacrifice !== 'none' ? 'Narrator modifier' : 'Manual modifier'}</span><input type="number" inputMode="numeric" value={manualPowerInput} onInput={(event) => { invalidateResolvedRoll(); setManualPowerInput(event.currentTarget.value); }} onBlur={() => { if (manualPowerInput === '' || manualPowerInput === '-') setManualPowerInput('0'); }} /><small>{sacrifice !== 'none' ? 'Making a Sacrifice uses no normal Power, but the Narrator may add a number to the roll.' : 'Another Hero’s help or a custom modifier.'}</small></label>
            <label class="action-checkbox"><input type="checkbox" checked={groupAction} onChange={(event) => setGroupAction(event.currentTarget.checked)} /><span>Acting together / group action</span><small>Reminder only. Use the agreed contributions.</small></label>
            {mode === 'reaction' && <label class="action-checkbox"><input type="checkbox" checked={reactionMightToPower} onChange={(event) => { invalidateResolvedRoll(); setReactionMightToPower(event.currentTarget.checked); }} /><span>Apply Might to reaction Power</span><small>Table ruling. Standard reactions use Might to adjust incoming Consequences instead.</small></label>}
            {mode === 'detailed' && <label><span>Trade Power</span><select value={tradeMode} onChange={(event) => { invalidateResolvedRoll(); setTradeMode(event.currentTarget.value as TradeMode); }}><option value="none">No trade</option><option value="caution">Throw caution to the wind · −1 to roll, +1 to spend</option><option value="hedge">Hedge risks · +1 to roll, −1 to spend</option></select><small>{tradeMode === 'caution' && basePower > 2 ? 'Standard range: final Power 2 or less. The app will still apply this choice.' : tradeMode === 'hedge' && basePower < 2 ? 'Standard range: final Power 2 or higher. The app will still apply this choice.' : 'Adjust the roll and spendable Power.'}</small></label>}
            {mode === 'quick' && <label><span>Make a Sacrifice</span><select value={sacrifice} onChange={(event) => { invalidateResolvedRoll(); setSacrifice(event.currentTarget.value as SacrificeLevel); }}><option value="none">No sacrifice</option><option value="painful">Painful</option><option value="scarring">Scarring</option><option value="grave">Grave</option></select><small>Uses its own Miracle / Fate / In Vain result. Power is not added to the roll.</small></label>}
          </div>}

          {result && <div class={`roll-result-sheet ${result.success ? 'is-success' : ''} ${result.consequences || pushLuck ? 'has-consequences' : ''}`}>
            <div class="dice-pair"><span>{result.dieA}</span><span>{result.dieB}</span></div>
            <div class="roll-result-copy"><strong>{sacrifice !== 'none' ? sacrificeOutcomeText(result, sacrifice) : outcomeText(result, pushLuck)}</strong><small>Total {result.total}{effectiveSpendable > 0 ? ` · ${remaining}/${effectiveSpendable} Power to spend` : ''}{sacrifice !== 'none' ? ` · ${sacrifice} sacrifice` : ''}{mode === 'reaction' && might !== 0 && !reactionMightToPower ? ` · Might ${reactionMightSummary}` : ''}{mode !== 'reaction' && sacrifice === 'none' && might !== 0 && (result.consequences || pushLuck) ? ` · Might ${reactionMightSummary} for Consequences` : ''}</small></div>
            <div class="result-override-actions">{canPushLuck && <button type="button" class={pushLuck ? 'is-active' : ''} onClick={() => { setPushLuck((value) => !value); setSpent(0); }}>Push your luck</button>}{canLucky && <button type="button" class={luckyNonStandard ? 'has-rule-warning' : ''} title={luckyNonStandard ? 'Outside the printed use: Lucky Bastard is once per session and cannot normally change double ones. The table may still choose it.' : 'Once per session, treat a 6 or less as a 7.'} onClick={() => applyRollOverride('lucky')}>Lucky Bastard → 7{luckyRecord?.usedSession ? ' · used' : ''}</button>}{canVirtuoso && <button type="button" class={virtuosoNonStandard ? 'has-rule-warning' : ''} title={virtuosoNonStandard ? 'Outside the printed use: Virtuoso is once per session, and double ones still override a 7–9 unless Beyond Luck applies. The table may still choose it.' : 'Once per session, treat a 7–9 as a 10.'} onClick={() => applyRollOverride('virtuoso')}>Virtuoso → 10{virtuosoRecord?.usedSession ? ' · used' : ''}</button>}{canRepelWitchery && !repelWitchery && <button type="button" class={repelState?.usedScene ? 'has-rule-warning' : ''} title={repelState?.usedScene ? 'Repel Witchery is once per scene; using it again is a table ruling.' : 'Use when these are magical Consequences.'} onClick={applyRepelWitchery}>Repel Witchery · spend Power</button>}</div>
            {improvedCounterAvailable && <small class="result-rule-note">Improved Counter applies: you may keep the spotlight to counterattack, and tags from that theme may double dip.</small>}
          </div>}

          {result && effectiveSpendable > 0 && <div class="effect-spender roll-effect-spender"><button type="button" disabled={remaining < 1} onClick={() => spend(1, 'main')}><strong>1</strong>{mode === 'reaction' ? ' lessen tier' : ' status tier'}</button><button type="button" disabled={remaining < 2} onClick={() => spend(2, 'main')}><strong>2</strong>{mode === 'reaction' ? ' lessen tag' : ' tag effect'}</button>{mode !== 'reaction' && <button type="button" disabled={remaining < 1} title="Create or scratch a single-use story tag" onClick={() => spend(1, 'main')}><strong>1</strong> single-use tag</button>}{!(mode === 'reaction' && result.consequences) && <><button type="button" disabled={remaining < 1} onClick={() => spend(1, 'main')}><strong>1</strong> discover</button><button type="button" disabled={remaining < 1} class={!mainEffectSpent ? 'has-rule-warning' : ''} title={!mainEffectSpent ? 'Standard: spend at least 1 Power on the main purpose first. The app still allows this table ruling.' : 'Perform an extra feat'} onClick={() => spend(1, 'extra')}><strong>1</strong> extra feat</button></>}</div>}
        </>
      )}
    </section>
  );
}
