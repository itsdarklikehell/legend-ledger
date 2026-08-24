import { APP_NAME, HERO_EXPORT_FORMAT, HERO_EXPORT_VERSION, STORAGE_PREFIX } from '../app-meta';
import type { Fellowship, Hero, QuintessenceRecord, SafeHaven, Tag, Theme } from '../types';
import { quintessences } from '../data/advancement';

const LIBRARY_KEY = `${STORAGE_PREFIX}:heroes:v1`;
const ACTIVE_HERO_KEY = `${STORAGE_PREFIX}:active-hero:v1`;

interface HeroExportEnvelope {
  format: typeof HERO_EXPORT_FORMAT;
  version: typeof HERO_EXPORT_VERSION;
  hero: Hero;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isHeroLike = (value: unknown): value is Hero => {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && Array.isArray(value.themes);
};

interface HeroLibrary {
  heroes: Hero[];
  activeHeroId: string | null;
}

const normalizeTag = (tag: Tag): Tag => ({
  ...tag,
  scratched: Boolean(tag.scratched),
  active: tag.active !== false,
  ...(tag.kind === 'story' ? { storyMode: tag.storyMode ?? 'standard' } : {}),
});

const normalizeTheme = (theme: Theme): Theme => {
  const normalized = {
    ...theme,
    typeName: theme.typeName ?? '',
    powerTags: (theme.powerTags ?? []).map(normalizeTag),
    weaknessTags: (theme.weaknessTags ?? []).map(normalizeTag),
    specialImprovements: Array.isArray(theme.specialImprovements) ? theme.specialImprovements : [],
    specialStates: theme.specialStates ?? {},
    pendingImprovements: Number(theme.pendingImprovements ?? 0),
    nascentPowerTagsNeeded: Number(theme.nascentPowerTagsNeeded ?? 0),
    pendingNascentPowerTags: Number(theme.pendingNascentPowerTags ?? 0),
  } as Theme & { ruleNotes?: unknown; milestoneNotes?: unknown };
  delete normalized.ruleNotes;
  delete normalized.milestoneNotes;
  return normalized;
};

const normalizeFellowship = (fellowship?: Fellowship): Fellowship | undefined => {
  if (!fellowship) return undefined;
  const normalized = {
    ...fellowship,
    theme: normalizeTheme(fellowship.theme),
    relationships: fellowship.relationships ?? [],
  } as Fellowship & { ruleNotes?: unknown };
  delete normalized.ruleNotes;
  return normalized;
};


const normalizeSafeHaven = (haven: SafeHaven): SafeHaven => ({
  id: haven.id,
  name: haven.name,
  notes: haven.notes || undefined,
  benefit: haven.benefit,
  advantageTag: haven.advantageTag ? { ...normalizeTag(haven.advantageTag), permanent: true } : undefined,
});

const normalizeQuintessence = (record: QuintessenceRecord): QuintessenceRecord => {
  const definition = quintessences.find((item) => item.name === record.name);
  if (!definition) return { ...record };
  const legacyOverride = record.rulesText?.trim();
  return {
    ...record,
    rulesText: undefined,
    notes: record.notes ?? (legacyOverride && legacyOverride !== definition.summary ? legacyOverride : undefined),
    ...(record.name === 'Nine Lives' ? { uses: record.uses ?? 3 } : {}),
  };
};

const normalizeHero = (hero: Hero): Hero => {
  const rawPromise = Math.max(0, Number(hero.promise ?? 0));
  return {
    ...hero,
    themes: (hero.themes ?? []).map(normalizeTheme),
    backpack: (hero.backpack ?? []).map(normalizeTag),
    sceneTags: (hero.sceneTags ?? []).map(normalizeTag),
    worldTags: (hero.worldTags ?? []).map(normalizeTag),
    statuses: (hero.statuses ?? []).map((status) => ({ ...status, marks: status.marks ?? [] })),
    fellowship: normalizeFellowship(hero.fellowship),
    safeHavens: (hero.safeHavens ?? []).map(normalizeSafeHaven),
    legacyNotes: hero.legacyNotes ?? [],
    pastThemes: hero.pastThemes ?? [],
    promise: rawPromise % 5,
    fulfillmentCredits: Number(hero.fulfillmentCredits ?? Math.floor(rawPromise / 5)),
    fulfillmentHistory: hero.fulfillmentHistory ?? [],
    quintessences: (hero.quintessences ?? []).map(normalizeQuintessence),
    globalImprovementCredits: Number(hero.globalImprovementCredits ?? 0),
    globalSpecialImprovementCredits: Number(hero.globalSpecialImprovementCredits ?? 0),
    savedMagicPower: Math.max(0, Number(hero.savedMagicPower ?? 0)),
    savedPackingPower: Math.max(0, Number(hero.savedPackingPower ?? 0)),
    lostPowerTags: hero.lostPowerTags ?? [],
    chronicle: hero.chronicle ?? [],
  };
};

export const loadHeroLibrary = (): HeroLibrary => {
  try {
    const rawLibrary = localStorage.getItem(LIBRARY_KEY);
    if (rawLibrary) {
      const parsed: unknown = JSON.parse(rawLibrary);
      const rawHeroes = Array.isArray(parsed)
        ? parsed
        : isRecord(parsed) && Array.isArray(parsed.heroes)
          ? parsed.heroes
          : [];
      const heroes = rawHeroes.filter(isHeroLike).map(normalizeHero);
      const storedActiveId = localStorage.getItem(ACTIVE_HERO_KEY);
      const activeHeroId = heroes.some((item) => item.id === storedActiveId) ? storedActiveId : heroes[0]?.id ?? null;
      return { heroes, activeHeroId };
    }
  } catch {
    return { heroes: [], activeHeroId: null };
  }

  return { heroes: [], activeHeroId: null };
};

export const saveHeroLibrary = (heroes: Hero[], activeHeroId: string | null): boolean => {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify({ heroes }));
    if (activeHeroId) localStorage.setItem(ACTIVE_HERO_KEY, activeHeroId);
    else localStorage.removeItem(ACTIVE_HERO_KEY);

    return true;
  } catch {
    return false;
  }
};

export const downloadHero = (hero: Hero): void => {
  const payload: HeroExportEnvelope = {
    format: HERO_EXPORT_FORMAT,
    version: HERO_EXPORT_VERSION,
    hero,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = hero.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hero';
  anchor.href = url;
  anchor.download = `${safeName}-legend-ledger.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const readHeroFile = async (file: File): Promise<Hero> => {
  const raw = await file.text();
  const parsed: unknown = JSON.parse(raw);

  if (!isRecord(parsed) || parsed.format !== HERO_EXPORT_FORMAT) {
    throw new Error(`Invalid ${APP_NAME} Hero export.`);
  }
  if (parsed.version !== HERO_EXPORT_VERSION) {
    throw new Error(`Unsupported ${APP_NAME} export version.`);
  }
  if (!isHeroLike(parsed.hero)) throw new Error(`Invalid ${APP_NAME} Hero export.`);
  return normalizeHero(parsed.hero);
};
