import { useMemo, useState } from 'preact/hooks';
import type { FulfillmentRecord, FulfillmentType, Hero, SafeHaven, SafeHavenBenefit } from '../types';
import { fulfillmentOptions, quintessences } from '../data/advancement';
import { addChronicle, improvementValueOfTheme, makeTag, uid } from '../lib/rules';
import { useDismissTransition } from '../hooks/useDismissTransition';

interface FulfillmentDialogProps {
  hero: Hero;
  onChange: (hero: Hero) => void;
  onClose: () => void;
  onReforge: (heroAfterFulfillment: Hero) => void;
}

type OptionLabel = typeof fulfillmentOptions[number];
const CUSTOM_QUINTESSENCE = '__custom__';

const optionType: Record<OptionLabel, FulfillmentType> = {
  'Arrive at Journey’s End': 'journeys-end',
  'Be Reforged': 'reforged',
  'Gain a Quintessence': 'quintessence',
  'Shake the Foundations of Magic': 'new-magic',
  'Speak Words Eternal': 'words-eternal',
  'Unearth Lost Truths': 'lost-truths',
};

const optionSummary: Record<OptionLabel, string> = {
  'Arrive at Journey’s End': 'Retire this Hero, establish a safe haven, and choose its lasting benefit.',
  'Be Reforged': 'Replace all four themes at once and carry accumulated growth into the rebuilt Hero.',
  'Gain a Quintessence': 'Gain a permanent defining quality that remains even as themes change.',
  'Shake the Foundations of Magic': 'Record a groundbreaking magical truth, resource, ability, or exception.',
  'Speak Words Eternal': 'Create a permanent world story tag on an NPC, group, force, or place.',
  'Unearth Lost Truths': 'Record a deep discovery and the new truth it establishes in the story.',
};

export function FulfillmentDialog({ hero, onChange, onClose: commitClose, onReforge }: FulfillmentDialogProps) {
  const { closing, dismiss: onClose } = useDismissTransition(commitClose);
  const [choice, setChoice] = useState<OptionLabel>('Gain a Quintessence');
  const [details, setDetails] = useState('');
  const [quintessence, setQuintessence] = useState('');
  const [customQuintessenceName, setCustomQuintessenceName] = useState('');
  const [themeId, setThemeId] = useState('');
  const [customQuintessenceRules, setCustomQuintessenceRules] = useState('');
  const [lastingTag, setLastingTag] = useState('');
  const [havenName, setHavenName] = useState('');
  const [havenBenefit, setHavenBenefit] = useState<SafeHavenBenefit>('permanent-tag');
  const [havenAdvantage, setHavenAdvantage] = useState('');

  const selectedQuintessence = quintessences.find((item) => item.name === quintessence);
  const isCustomQuintessence = quintessence === CUSTOM_QUINTESSENCE;
  const selectedQuintessenceName = isCustomQuintessence ? customQuintessenceName.trim() : selectedQuintessence?.name ?? '';
  const reforgeCredits = useMemo(() => hero.themes.reduce((sum, theme) => sum + improvementValueOfTheme(theme), 0), [hero]);
  const highestMight = useMemo(() => {
    const rank = { Origin: 0, Adventure: 1, Greatness: 2 } as const;
    return hero.themes.reduce((highest, theme) => rank[theme.might] > rank[highest] ? theme.might : highest, 'Origin' as Hero['themes'][number]['might']);
  }, [hero.themes]);
  const validBindingThemes = useMemo(() => {
    if (!selectedQuintessence?.themeBinding) return hero.themes;
    if (selectedQuintessence.themeBinding === 'origin-or-adventure') return hero.themes.filter((theme) => theme.might === 'Origin' || theme.might === 'Adventure');
    return hero.themes.filter((theme) => theme.might === 'Adventure' || theme.might === 'Greatness');
  }, [hero, selectedQuintessence]);

  const canConfirm = hero.fulfillmentCredits > 0 && (() => {
    if (choice === 'Gain a Quintessence') return Boolean(selectedQuintessenceName) && (!selectedQuintessence?.themeBinding || validBindingThemes.length > 0);
    if (choice === 'Arrive at Journey’s End') return Boolean(havenName.trim()) && (havenBenefit !== 'permanent-tag' || Boolean(havenAdvantage.trim()));
    if (choice === 'Speak Words Eternal') return Boolean(lastingTag.trim());
    if (choice === 'Shake the Foundations of Magic' || choice === 'Unearth Lost Truths') return Boolean(details.trim());
    return true;
  })();

  const confirm = () => {
    if (!canConfirm) return;
    const type = optionType[choice];
    const at = new Date().toISOString();
    const chosenThemeId = themeId || validBindingThemes[0]?.id;
    let recordDetails = details.trim();
    let nextHero: Hero = { ...hero, fulfillmentCredits: Math.max(0, hero.fulfillmentCredits - 1) };

    if (choice === 'Gain a Quintessence' && selectedQuintessenceName) {
      const boundThemeId = selectedQuintessence?.themeBinding ? chosenThemeId : undefined;
      nextHero = {
        ...nextHero,
        quintessences: [...nextHero.quintessences, {
          id: uid('quintessence'),
          name: selectedQuintessenceName,
          themeId: boundThemeId,
          uses: selectedQuintessenceName === 'Nine Lives' ? 3 : undefined,
          rulesText: isCustomQuintessence ? customQuintessenceRules.trim() || undefined : undefined,
        }],
        globalSpecialImprovementCredits: nextHero.globalSpecialImprovementCredits + (selectedQuintessenceName === 'Old Hand' ? 7 : 0),
      };
      recordDetails = `${selectedQuintessenceName}${boundThemeId ? ` · ${hero.themes.find((theme) => theme.id === boundThemeId)?.title ?? ''}` : ''}${isCustomQuintessence && customQuintessenceRules.trim() ? ` · ${customQuintessenceRules.trim()}` : ''}`;
    }

    if (choice === 'Arrive at Journey’s End') {
      const advantageTag = havenBenefit === 'permanent-tag'
        ? { ...makeTag(havenAdvantage.trim(), 'story'), permanent: true }
        : undefined;
      const haven: SafeHaven = {
        id: uid('haven'),
        name: havenName.trim(),
        notes: details.trim() || undefined,
        benefit: havenBenefit,
        advantageTag,
      };
      nextHero = { ...nextHero, retired: true, safeHavens: [...nextHero.safeHavens, haven] };
      const benefitText = havenBenefit === 'permanent-tag'
        ? `permanent camp tag: ${advantageTag?.name ?? ''}`
        : 'third camp/sojourn period without the usual Consequences';
      recordDetails = `${haven.name} · ${benefitText}${haven.notes ? ` · ${haven.notes}` : ''}`;
    }

    if (choice === 'Speak Words Eternal') {
      const tag = { ...makeTag(lastingTag.trim(), 'story'), permanent: true };
      nextHero = { ...nextHero, worldTags: [...nextHero.worldTags, tag] };
      recordDetails = `${tag.name}${details.trim() ? ` · ${details.trim()}` : ''}`;
    }

    if (choice === 'Shake the Foundations of Magic' || choice === 'Unearth Lost Truths') {
      const note = `${choice}: ${details.trim()}`;
      nextHero = { ...nextHero, legacyNotes: [...nextHero.legacyNotes, note] };
      recordDetails = details.trim();
    }

    if (choice === 'Be Reforged') nextHero = { ...nextHero, globalImprovementCredits: nextHero.globalImprovementCredits + reforgeCredits };

    const record: FulfillmentRecord = { id: uid('fulfillment'), at, type, title: choice, details: recordDetails || undefined };
    nextHero = { ...nextHero, fulfillmentHistory: [...nextHero.fulfillmentHistory, record] };
    nextHero = addChronicle(nextHero, `Moment of Fulfillment: ${choice}${recordDetails ? ` — ${recordDetails}` : ''}.`);

    if (choice === 'Be Reforged') {
      onReforge(nextHero);
      onClose();
      return;
    }

    onChange(nextHero);
    onClose();
  };

  return (
    <div class={`modal-backdrop ${closing ? 'is-closing' : ''}`} role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section class="development-dialog fulfillment-dialog" role="dialog" aria-modal="true" aria-labelledby="fulfillment-title">
        <header><div><p class="eyebrow">Promise fulfilled</p><h2 id="fulfillment-title">Moment of Fulfillment</h2></div><button type="button" class="icon-button" onClick={onClose} aria-label="Close">×</button></header>
        <p class="rules-callout">Choose how this Moment of Fulfillment changes your Hero.</p>
        <div class="fulfillment-option-grid">{fulfillmentOptions.map((option) => <button type="button" class={choice === option ? 'is-selected' : ''} onClick={() => { setChoice(option); setThemeId(''); }} key={option}><strong>{option}</strong><span>{optionSummary[option]}</span></button>)}</div>

        {choice === 'Gain a Quintessence' ? <div class="quintessence-picker">
          {quintessences.map((item) => { const already = hero.quintessences.some((owned) => owned.name === item.name); return <button type="button" class={quintessence === item.name ? 'is-selected' : ''} onClick={() => { setQuintessence(item.name); setThemeId(''); }} key={item.name}><strong>{item.name}</strong><span>{item.summary}</span>{already && <small>Already recorded</small>}</button>; })}
          <button type="button" class={`custom-quintessence-choice ${isCustomQuintessence ? 'is-selected' : ''}`} onClick={() => { setQuintessence(CUSTOM_QUINTESSENCE); setThemeId(''); }}><strong>Custom Quintessence</strong><span>Record a permanent defining quality.</span></button>
          {isCustomQuintessence && <><label class="full-width"><span>Quintessence name</span><input value={customQuintessenceName} onInput={(event) => setCustomQuintessenceName(event.currentTarget.value)} placeholder="Name the Quintessence" /></label><label class="full-width"><span>Rules</span><textarea value={customQuintessenceRules} onInput={(event) => setCustomQuintessenceRules(event.currentTarget.value)} placeholder="What does this Quintessence do?" /></label></>}
          {selectedQuintessence?.themeBinding && <label class="full-width"><span>Linked theme</span><select value={themeId || validBindingThemes[0]?.id || ''} onChange={(event) => setThemeId(event.currentTarget.value)}>{validBindingThemes.map((theme) => <option value={theme.id} key={theme.id}>{theme.title} · {theme.might}</option>)}</select></label>}
        </div> : choice === 'Be Reforged' ? <div class="rules-callout reforge-credit-note"><strong>{reforgeCredits} free improvement{reforgeCredits === 1 ? '' : 's'}</strong> will carry from the old themes. Free credits can be adjusted afterward.</div> : choice === 'Arrive at Journey’s End' ? <div class="reforge-grid journey-end-fields">
          <label class="full-width"><span>Where the Hero settles</span><input value={havenName} onInput={(event) => setHavenName(event.currentTarget.value)} placeholder="Home, refuge, community, solitude…" /></label>
          <fieldset class="full-width fulfillment-benefit-choice"><legend>Safe haven benefit</legend><div class="choice-tabs"><button type="button" class={havenBenefit === 'permanent-tag' ? 'is-active' : ''} onClick={() => setHavenBenefit('permanent-tag')}>Permanent advantage</button><button type="button" class={havenBenefit === 'safe-third-period' ? 'is-active' : ''} onClick={() => setHavenBenefit('safe-third-period')}>Safe third period</button></div><small>{havenBenefit === 'permanent-tag' ? 'A permanent story tag for relevant camp and sojourn actions here. It can be burned without being lost.' : 'The Fellowship may take a third camp or sojourn period here without the usual Consequences.'}</small></fieldset>
          {havenBenefit === 'permanent-tag' && <label class="full-width"><span>Safe haven story tag</span><input value={havenAdvantage} onInput={(event) => setHavenAdvantage(event.currentTarget.value)} placeholder="place of healing, library of the ancients…" /></label>}
          <label class="full-width"><span>Epilogue <em>optional</em></span><textarea value={details} onInput={(event) => setDetails(event.currentTarget.value)} placeholder="What does the Hero's life look like after the journey?" /></label>
        </div> : choice === 'Speak Words Eternal' ? <div class="reforge-grid"><label class="full-width"><span>Permanent world tag</span><input value={lastingTag} onInput={(event) => setLastingTag(event.currentTarget.value)} placeholder="The lasting truth placed on the world" /></label><label class="full-width"><span>Target / meaning <em>optional</em></span><textarea value={details} onInput={(event) => setDetails(event.currentTarget.value)} placeholder="Who or what is changed, and what does the enchantment mean?" /></label><p class="soft-rule-note full-width">Standard play places this on an NPC, group, force, or place rather than a Hero. Its normal reach is no greater than your most Mighty theme ({highestMight}); the Narrator can widen that when the story calls for it.</p></div> : <label class="fulfillment-details"><span>{choice === 'Shake the Foundations of Magic' ? 'The new magical truth or breakthrough' : 'The lost truth revealed'}</span><textarea value={details} onInput={(event) => setDetails(event.currentTarget.value)} placeholder="Record the fiction and the lasting effect…" /></label>}

        <footer class="dialog-footer"><button type="button" class="button ghost" onClick={onClose}>Not yet</button><button type="button" class="button primary" disabled={!canConfirm} onClick={confirm}>Fulfill Promise</button></footer>
      </section>
    </div>
  );
}
