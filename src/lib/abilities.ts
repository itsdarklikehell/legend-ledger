import { quintessences, specialImprovementsByThemebook } from '../data/advancement';

type AbilityCadence = 'scene' | 'session' | 'persistent' | 'manual';

export const specialSummary = (themeTypeId: string, name: string): string =>
  (specialImprovementsByThemebook[themeTypeId] ?? []).find((item) => item.name === name)?.summary ?? '';

export const quintessenceSummary = (name: string): string => quintessences.find((item) => item.name === name)?.summary ?? '';

export const abilityCadence = (summary: string): AbilityCadence => {
  const normalized = summary.toLowerCase();
  if (normalized.includes('once per scene')) return 'scene';
  if (normalized.includes('once per session')) return 'session';
  if (normalized.includes('whenever') || normalized.includes('from now on') || normalized.includes('no longer') || normalized.includes('ignore consequences') || normalized.includes('statuses on you')) return 'persistent';
  return 'manual';
};
