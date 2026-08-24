export type Might = 'Origin' | 'Adventure' | 'Greatness';
export type ActionMode = 'quick' | 'detailed' | 'reaction';
export type Polarity = 'helpful' | 'hindering' | 'unused';
export type TagKind = 'power' | 'weakness' | 'story';
export type StoryTagMode = 'standard' | 'single-use' | 'consumable';

export interface Tag {
  id: string;
  name: string;
  kind: TagKind;
  scratched?: boolean;
  active?: boolean;
  storyMode?: StoryTagMode;
  storyGroupId?: string;
  storyGroupName?: string;
  permanent?: boolean;
}

export interface AbilityState {
  description?: string;
  notes?: string;
  cadence?: 'scene' | 'session' | 'persistent' | 'manual';
  usedScene?: boolean;
  usedSession?: boolean;
}

export interface Theme {
  id: string;
  typeId: string;
  typeName?: string;
  title: string;
  might: Might;
  powerTags: Tag[];
  weaknessTags: Tag[];
  quest: string;
  improve: number;
  abandon: number;
  milestone: number;
  specialImprovements: string[];
  specialStates: Record<string, AbilityState>;
  pendingImprovements: number;
  nascentPowerTagsNeeded: number;
  pendingNascentPowerTags: number;
}

export interface Status {
  id: string;
  name: string;
  polarity: Exclude<Polarity, 'unused'>;
  marks: number[];
}

export interface ChronicleEntry {
  id: string;
  at: string;
  text: string;
}

export type FulfillmentType =
  | 'journeys-end'
  | 'reforged'
  | 'quintessence'
  | 'new-magic'
  | 'words-eternal'
  | 'lost-truths';

export interface FulfillmentRecord {
  id: string;
  at: string;
  type: FulfillmentType;
  title: string;
  details?: string;
}

export interface QuintessenceRecord {
  id: string;
  name: string;
  themeId?: string;
  uses?: number;
  /** Rules text for a custom Quintessence. Built-in Quintessences use their catalog definition. */
  rulesText?: string;
  notes?: string;
  usedScene?: boolean;
  usedSession?: boolean;
}

export interface FellowshipRelationship {
  id: string;
  heroName: string;
  tag: Tag;
}

export interface Fellowship {
  id: string;
  name: string;
  theme: Theme;
  relationships: FellowshipRelationship[];
}


export interface LegacyThemeRecord {
  id: string;
  title: string;
  typeName: string;
  might: Might;
  quest: string;
  powerTags: string[];
  weaknessTags: string[];
  specialImprovements: string[];
  at: string;
  reason: 'evolved' | 'replaced' | 'expanded-away' | 'reforged' | 'removed';
}

export type SafeHavenBenefit = 'permanent-tag' | 'safe-third-period';

export interface SafeHaven {
  id: string;
  name: string;
  notes?: string;
  benefit?: SafeHavenBenefit;
  advantageTag?: Tag;
}

export interface ActionSnapshot {
  tagIds: string[];
  statusIds: string[];
  at: string;
}

export interface Hero {
  id: string;
  name: string;
  pronouns: string;
  concept: string;
  portrait?: string;
  themes: Theme[];
  backpack: Tag[];
  sceneTags: Tag[];
  worldTags: Tag[];
  statuses: Status[];
  fellowship?: Fellowship;
  safeHavens: SafeHaven[];
  legacyNotes: string[];
  pastThemes: LegacyThemeRecord[];
  previousAction?: ActionSnapshot;
  promise: number;
  fulfillmentCredits: number;
  fulfillmentHistory: FulfillmentRecord[];
  quintessences: QuintessenceRecord[];
  globalImprovementCredits: number;
  globalSpecialImprovementCredits: number;
  savedMagicPower: number;
  savedPackingPower: number;
  lostPowerTags: string[];
  retired?: boolean;
  chronicle: ChronicleEntry[];
}

export interface Themebook {
  id: string;
  name: string;
  fixedMight?: Might;
  summary: string;
  titlePrompt: string;
  powerPrompts: string[];
  weaknessPrompts: string[];
  questHints: string[];
}

export interface ActionTagChoice {
  id: string;
  label: string;
  source: 'theme' | 'backpack' | 'scene' | 'world' | 'fellowship';
  tagKind: TagKind;
  themeId?: string;
  polarity: Polarity;
  burn: boolean;
}

export interface ActionChoice {
  polarity: Polarity;
  burn: boolean;
}

export type ActionChoiceMap = Record<string, ActionChoice>;
export type ActionStatusMap = Record<string, Polarity>;

export interface RollResult {
  dieA: number;
  dieB: number;
  power: number;
  total: number;
  success: boolean;
  consequences: boolean;
  spendable: number;
  special: 'double-ones' | 'double-sixes' | null;
}
