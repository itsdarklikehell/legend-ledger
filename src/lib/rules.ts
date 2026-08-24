import type { ActionMode, Hero, LegacyThemeRecord, RollResult, Status, Tag, Theme } from '../types';

export const uid = (prefix = 'id'): string => `${prefix}-${crypto.randomUUID()}`;

export const statusTier = (status: Status): number => Math.max(0, ...status.marks);

export const applyStatusMark = (status: Status, incomingTier: number): Status => {
  const boundedTier = Math.max(1, Math.min(6, incomingTier));
  let slot = boundedTier;
  const occupied = new Set(status.marks);

  while (occupied.has(slot) && slot < 6) slot += 1;
  occupied.add(slot);
  return { ...status, marks: [...occupied].sort((a, b) => a - b) };
};

export const toggleStatusMark = (status: Status, tier: number): Status => {
  const boundedTier = Math.max(1, Math.min(6, tier));
  const occupied = new Set(status.marks);
  if (occupied.has(boundedTier)) occupied.delete(boundedTier);
  else occupied.add(boundedTier);
  return { ...status, marks: [...occupied].sort((a, b) => a - b) };
};

export const reduceStatus = (status: Status, amount: number): Status => {
  const shifted = status.marks
    .map((mark) => mark - Math.max(1, amount))
    .filter((mark) => mark > 0);

  return { ...status, marks: [...new Set(shifted)].sort((a, b) => a - b) };
};


export const HERO_STATUS_LIMIT = 5;

export const applyPolarStatus = (
  existing: Status,
  incomingName: string,
  incomingPolarity: Status['polarity'],
  incomingTier: number,
): Status | null => {
  const currentTier = statusTier(existing);
  const boundedIncoming = Math.max(1, Math.min(6, incomingTier));
  if (boundedIncoming < currentTier) {
    const reduced = reduceStatus(existing, boundedIncoming);
    return reduced.marks.length > 0 ? reduced : null;
  }
  if (boundedIncoming === currentTier) return null;
  return {
    ...existing,
    name: incomingName.trim(),
    polarity: incomingPolarity,
    marks: [Math.min(6, boundedIncoming - currentTier)],
  };
};

export const makeTag = (name: string, kind: Tag['kind']): Tag => ({
  id: uid(kind),
  name: name.trim(),
  kind,
  scratched: false,
  active: true,
  ...(kind === 'story' ? { storyMode: 'standard' as const } : {}),
});

export const emptyTheme = (index: number): Theme => ({
  id: uid('theme'),
  typeId: 'trait',
  title: `Theme ${index + 1}`,
  might: 'Origin',
  powerTags: [makeTag('', 'power'), makeTag('', 'power'), makeTag('', 'power')],
  weaknessTags: [makeTag('', 'weakness')],
  quest: '',
  improve: 0,
  abandon: 0,
  milestone: 0,
  specialImprovements: [],
  specialStates: {},
  pendingImprovements: 0,
  nascentPowerTagsNeeded: 0,
  pendingNascentPowerTags: 0,
});

export const emptyFellowshipTheme = (): Theme => ({
  ...emptyTheme(0),
  id: uid('fellowship-theme'),
  typeId: 'fellowship',
  typeName: 'Fellowship',
  title: 'Our Fellowship',
  powerTags: [makeTag('Our Fellowship', 'power'), makeTag('', 'power'), makeTag('', 'power')],
  weaknessTags: [makeTag('', 'weakness')],
});

export const hasQuintessence = (hero: Hero, name: string): boolean => hero.quintessences.some((item) => item.name === name);

export const improveTrackLimit = (hero: Hero): number => hasQuintessence(hero, 'Diligent Drudge') ? 5 : 3;

export const hasJourneyAttention = (hero: Hero): boolean =>
  hero.fulfillmentCredits > 0
  || hero.themes.some((theme) => theme.pendingImprovements > 0
    || theme.pendingNascentPowerTags > 0
    || theme.improve >= improveTrackLimit(hero)
    || theme.abandon >= 3
    || theme.milestone >= 3)
  || Boolean(hero.fellowship && (hero.fellowship.theme.pendingImprovements > 0
    || hero.fellowship.theme.pendingNascentPowerTags > 0
    || hero.fellowship.theme.improve >= 3
    || hero.fellowship.theme.abandon >= 3
    || hero.fellowship.theme.milestone >= 3));

export const clampTrack = (value: number, max = 3): number => Math.max(0, Math.min(max, value));

export const improvementValueOfTheme = (theme: Theme): number =>
  Math.max(0, theme.powerTags.length - 3) +
  Math.max(0, theme.weaknessTags.length - 1) +
  theme.specialImprovements.length;

export const replacementPromiseValue = (theme: Theme): number => 1 + improvementValueOfTheme(theme);

export const legacyThemeRecord = (theme: Theme, reason: LegacyThemeRecord['reason']): LegacyThemeRecord => ({
  id: uid('legacy-theme'),
  title: theme.title,
  typeName: theme.typeName?.trim() || theme.typeId,
  might: theme.might,
  quest: theme.quest,
  powerTags: theme.powerTags.map((tag) => tag.name),
  weaknessTags: theme.weaknessTags.map((tag) => tag.name),
  specialImprovements: [...theme.specialImprovements],
  at: new Date().toISOString(),
  reason,
});

export const gainPromise = (hero: Hero, amount: number): Hero => {
  if (amount <= 0) return hero;
  const total = hero.promise + amount;
  return {
    ...hero,
    promise: total % 5,
    fulfillmentCredits: hero.fulfillmentCredits + Math.floor(total / 5),
  };
};

export const markImprove = (hero: Hero, themeId: string, amount = 1): Hero => ({
  ...hero,
  themes: hero.themes.map((theme) => {
    if (theme.id !== themeId) return theme;

    if (theme.nascentPowerTagsNeeded > 0) {
      const available = Math.max(0, theme.nascentPowerTagsNeeded - theme.pendingNascentPowerTags);
      const gained = Math.min(Math.max(0, amount), available);
      const overflow = Math.max(0, amount - gained);
      return {
        ...theme,
        pendingNascentPowerTags: theme.pendingNascentPowerTags + gained,
        improve: theme.improve + overflow,
      };
    }

    return { ...theme, improve: theme.improve + Math.max(0, amount) };
  }),
});

export const markFellowshipImprove = (theme: Theme, amount = 1): Theme => {
  const gain = Math.max(0, amount);
  if (theme.nascentPowerTagsNeeded > 0) {
    const available = Math.max(0, theme.nascentPowerTagsNeeded - theme.pendingNascentPowerTags);
    const nascentGain = Math.min(gain, available);
    return {
      ...theme,
      pendingNascentPowerTags: theme.pendingNascentPowerTags + nascentGain,
      improve: theme.improve + Math.max(0, gain - nascentGain),
    };
  }
  return { ...theme, improve: theme.improve + gain };
};

export const resetAbilityUses = (hero: Hero, scope: 'scene' | 'session'): Hero => ({
  ...hero,
  themes: hero.themes.map((theme) => ({
    ...theme,
    specialStates: Object.fromEntries(
      Object.entries(theme.specialStates ?? {}).map(([name, state]) => [name, {
        ...state,
        ...(scope === 'scene' ? { usedScene: false } : { usedScene: false, usedSession: false }),
      }]),
    ),
  })),
  fellowship: hero.fellowship ? {
    ...hero.fellowship,
    theme: {
      ...hero.fellowship.theme,
      specialStates: Object.fromEntries(
        Object.entries(hero.fellowship.theme.specialStates ?? {}).map(([name, state]) => [name, {
          ...state,
          ...(scope === 'scene' ? { usedScene: false } : { usedScene: false, usedSession: false }),
        }]),
      ),
    },
  } : undefined,
  quintessences: hero.quintessences.map((record) => ({
    ...record,
    ...(scope === 'scene' ? { usedScene: false } : { usedScene: false, usedSession: false }),
  })),
});

const roll2d6 = (): [number, number] => {
  const randomDie = (): number => {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return ((buffer[0] ?? 0) % 6) + 1;
  };

  return [randomDie(), randomDie()];
};

export const resolveRoll = (mode: ActionMode, power: number, dice = roll2d6(), ignoreDoubleOnes = false): RollResult => {
  const [dieA, dieB] = dice;
  const total = dieA + dieB + power;
  const doubleOnes = dieA === 1 && dieB === 1;
  const doubleSixes = dieA === 6 && dieB === 6;

  let success = total >= 7;
  let consequences = total <= 9;
  let special: RollResult['special'] = null;

  if (doubleOnes && !ignoreDoubleOnes) {
    success = false;
    consequences = true;
    special = 'double-ones';
  } else if (doubleSixes) {
    success = true;
    consequences = false;
    special = 'double-sixes';
  }

  let spendable = 0;
  if (success && mode === 'detailed') spendable = Math.max(1, power);
  if (success && mode === 'reaction') {
    spendable = Math.max(1, power) + (total >= 10 || doubleSixes ? 1 : 0);
  }

  return { dieA, dieB, power, total, success, consequences, spendable, special };
};

export const addChronicle = (hero: Hero, text: string): Hero => ({
  ...hero,
  chronicle: [
    {
      id: uid('log'),
      at: new Date().toISOString(),
      text,
    },
    ...hero.chronicle,
  ].slice(0, 160),
});
