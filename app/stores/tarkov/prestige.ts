import { defaultState, type UserProgressData } from '@/stores/progressState';
import { getNextProgressEpoch } from '@/stores/tarkov/progressMerge';
export type PrestigeRunSummary = {
  completedHideoutModules: number;
  completedHideoutParts: number;
  completedObjectives: number;
  completedStoryChapters: number;
  completedTasks: number;
  failedTasks: number;
  firstActionAt: number | null;
  lastActionAt: number | null;
  level: number;
  prestigeLevel: number;
};
export type PrestigeRunRecord = {
  createdAt: string;
  id: string;
  mode: 'pvp' | 'pve';
  prestigeFrom: number;
  prestigeTo: number;
  summary: PrestigeRunSummary;
};
export type UserPrestigeRunRow = {
  created_at?: string | null;
  id?: string | null;
  mode?: 'pvp' | 'pve' | null;
  prestige_from?: number | null;
  prestige_to?: number | null;
  summary?: Record<string, unknown> | null;
};
export const toSafeInteger = (value: unknown, fallback = 0): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.trunc(value);
};
export const collectTimestamp = (timestamps: number[], value: number | undefined) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    timestamps.push(Math.trunc(value));
  }
};
export const buildPrestigeRunSummary = (
  modeData: UserProgressData
): Record<string, number | null> => {
  const taskCompletions = Object.values(modeData.taskCompletions || {});
  const taskObjectives = Object.values(modeData.taskObjectives || {});
  const hideoutModules = Object.values(modeData.hideoutModules || {});
  const hideoutParts = Object.values(modeData.hideoutParts || {});
  const storyChapters = Object.values(modeData.storyChapters || {});
  const completedTasks = taskCompletions.reduce((count, completion) => {
    if (completion?.complete === true && completion?.failed !== true) {
      return count + 1;
    }
    return count;
  }, 0);
  const failedTasks = taskCompletions.reduce((count, completion) => {
    if (completion?.failed === true) {
      return count + 1;
    }
    return count;
  }, 0);
  const completedObjectives = taskObjectives.reduce((count, objective) => {
    if (objective?.complete === true) {
      return count + 1;
    }
    return count;
  }, 0);
  const completedHideoutModules = hideoutModules.reduce((count, module) => {
    if (module?.complete === true) {
      return count + 1;
    }
    return count;
  }, 0);
  const completedHideoutParts = hideoutParts.reduce((count, part) => {
    if (part?.complete === true) {
      return count + 1;
    }
    return count;
  }, 0);
  const completedStoryChapters = storyChapters.reduce((count, chapter) => {
    if (chapter?.complete === true) {
      return count + 1;
    }
    return count;
  }, 0);
  const timestamps: number[] = [];
  for (const completion of taskCompletions) {
    collectTimestamp(timestamps, completion?.timestamp);
  }
  for (const objective of taskObjectives) {
    collectTimestamp(timestamps, objective?.timestamp);
  }
  for (const module of hideoutModules) {
    collectTimestamp(timestamps, module?.timestamp);
  }
  for (const part of hideoutParts) {
    collectTimestamp(timestamps, part?.timestamp);
  }
  for (const chapter of storyChapters) {
    collectTimestamp(timestamps, chapter?.timestamp);
    for (const objective of Object.values(chapter?.objectives || {})) {
      collectTimestamp(timestamps, objective?.timestamp);
    }
  }
  const firstActionAt = timestamps.length > 0 ? Math.min(...timestamps) : null;
  const lastActionAt = timestamps.length > 0 ? Math.max(...timestamps) : null;
  return {
    completedHideoutModules,
    completedHideoutParts,
    completedObjectives,
    completedStoryChapters,
    completedTasks,
    failedTasks,
    firstActionAt,
    lastActionAt,
    level: modeData.level ?? 1,
    prestigeLevel: modeData.prestigeLevel ?? 0,
  };
};
export const buildPrestigeResetData = (
  modeData: UserProgressData,
  nextPrestigeLevel: number
): UserProgressData => ({
  ...structuredClone(defaultState.pvp),
  displayName: modeData.displayName ?? null,
  pmcFaction: modeData.pmcFaction ?? 'USEC',
  prestigeLevel: Math.max(0, Math.min(6, nextPrestigeLevel)),
  progressEpoch: getNextProgressEpoch(modeData),
});
export const parsePrestigeSummary = (value: unknown): PrestigeRunSummary => {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const toCount = (input: unknown): number => Math.max(0, toSafeInteger(input, 0));
  const toNullableTimestamp = (input: unknown): number | null => {
    if (typeof input !== 'number' || !Number.isFinite(input)) return null;
    const truncated = Math.trunc(input);
    return truncated > 0 ? truncated : null;
  };
  return {
    completedHideoutModules: toCount(raw.completedHideoutModules),
    completedHideoutParts: toCount(raw.completedHideoutParts),
    completedObjectives: toCount(raw.completedObjectives),
    completedStoryChapters: toCount(raw.completedStoryChapters),
    completedTasks: toCount(raw.completedTasks),
    failedTasks: toCount(raw.failedTasks),
    firstActionAt: toNullableTimestamp(raw.firstActionAt),
    lastActionAt: toNullableTimestamp(raw.lastActionAt),
    level: Math.max(1, toCount(raw.level)),
    prestigeLevel: Math.max(0, Math.min(6, toCount(raw.prestigeLevel))),
  };
};
export const parsePrestigeRunRows = (
  rows: UserPrestigeRunRow[] | null | undefined
): PrestigeRunRecord[] => {
  if (!Array.isArray(rows)) return [];
  const parsed: PrestigeRunRecord[] = [];
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id) continue;
    const mode = row.mode === 'pve' ? 'pve' : 'pvp';
    const createdAt =
      typeof row.created_at === 'string' ? row.created_at : new Date().toISOString();
    const prestigeFrom = Math.max(0, Math.min(6, toSafeInteger(row.prestige_from, 0)));
    const prestigeTo = Math.max(1, Math.min(6, toSafeInteger(row.prestige_to, prestigeFrom + 1)));
    parsed.push({
      createdAt,
      id: row.id,
      mode,
      prestigeFrom,
      prestigeTo,
      summary: parsePrestigeSummary(row.summary),
    });
  }
  return parsed.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
};
