import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoryChapter } from '@/types/tarkov';
const objectiveCompletionState = new Set<string>();
const chapterCompletionState = new Set<string>();
const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'chapter-1',
    name: 'Chapter 1',
    normalizedName: 'chapter-1',
    wikiLink: 'https://example.com/chapter-1',
    order: 1,
    autoStart: false,
    chapterRequirements: [{ id: 'req-1', name: 'Finish Intro' }],
    mapUnlocks: [
      { id: 'map-1', name: 'Route B Objective' },
      { id: 'map-2', name: 'Side Objective' },
    ],
    traderUnlocks: [{ id: 'trader-1', name: 'Peacekeeper' }],
    rewards: {
      description: 'Chapter completion package',
    },
    objectives: {
      'obj-a': {
        id: 'obj-a',
        order: 1,
        type: 'main',
        description: 'Route A Objective',
        notes: 'Savior ending - cooperate fully with Kerman',
        mutuallyExclusiveWith: ['obj-b'],
      },
      'obj-b': {
        id: 'obj-b',
        order: 2,
        type: 'main',
        description: 'Route B Objective',
        notes: 'Fallen ending - keep the evidence',
        mutuallyExclusiveWith: ['obj-a'],
      },
      'obj-c': {
        id: 'obj-c',
        order: 3,
        type: 'optional',
        description: 'Side Objective',
      },
      'obj-d': {
        id: 'obj-d',
        order: 4,
        type: 'optional',
        description: 'Unknown Link Objective',
        mutuallyExclusiveWith: ['missing-objective'],
      },
    },
  },
];
const loadComposable = async (storyChapters: StoryChapter[] = STORY_CHAPTERS) => {
  vi.resetModules();
  vi.doMock('@/stores/useMetadata', () => ({
    useMetadataStore: () => ({
      storyChapters,
    }),
  }));
  vi.doMock('@/stores/useTarkov', () => ({
    useTarkovStore: () => ({
      isStoryChapterComplete: (chapterId: string) => chapterCompletionState.has(chapterId),
      isStoryObjectiveComplete: (chapterId: string, objectiveId: string) =>
        objectiveCompletionState.has(`${chapterId}:${objectiveId}`),
    }),
  }));
  const { useStorylineChapters } = await import('@/composables/useStorylineChapters');
  return useStorylineChapters();
};
const requireDefined = <T>(value: T | null | undefined, message: string): T => {
  expect(value, message).toBeDefined();
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};
describe('useStorylineChapters', () => {
  beforeEach(() => {
    objectiveCompletionState.clear();
    chapterCompletionState.clear();
  });
  it('derives chosen, blocked, and open storyline route states', async () => {
    objectiveCompletionState.add('chapter-1:obj-b');
    const { normalizedChapters } = await loadComposable();
    const chapter = requireDefined(
      normalizedChapters.value[0],
      'Expected first normalized chapter'
    );
    expect(chapter.requirements).toEqual([{ id: 'req-1', label: 'Finish Intro' }]);
    const objectiveA = requireDefined(
      chapter.objectives.find((objective) => objective.id === 'obj-a'),
      'Expected obj-a objective'
    );
    const objectiveB = requireDefined(
      chapter.objectives.find((objective) => objective.id === 'obj-b'),
      'Expected obj-b objective'
    );
    const objectiveC = requireDefined(
      chapter.objectives.find((objective) => objective.id === 'obj-c'),
      'Expected obj-c objective'
    );
    expect(objectiveA.routeState).toBe('blocked');
    expect(objectiveA.routeAlternatives).toEqual([
      { id: 'obj-b', label: 'Route B Objective', complete: true },
    ]);
    expect(objectiveA.routeBlockingAlternatives).toEqual([
      { id: 'obj-b', label: 'Route B Objective', complete: true },
    ]);
    expect(objectiveB.routeState).toBe('chosen');
    expect(objectiveC.routeState).toBe('open');
    expect(chapter.mainObjectiveCompleted).toBe(1);
    expect(chapter.mainObjectiveTotal).toBe(2);
    expect(chapter.mainRouteChoices).toHaveLength(1);
    expect(chapter.mainRouteChoices[0]?.objectives.map((objective) => objective.id)).toEqual([
      'obj-a',
      'obj-b',
    ]);
    expect(chapter.endings).toEqual([
      {
        id: 'obj-a-ending',
        label: 'Savior Ending',
        objectiveId: 'obj-a',
        objectiveLabel: 'Route A Objective',
        routeBlockingAlternatives: [{ id: 'obj-b', label: 'Route B Objective', complete: true }],
        routeChoiceIndex: 1,
        routeState: 'blocked',
      },
      {
        id: 'obj-b-ending',
        label: 'Fallen Ending',
        objectiveId: 'obj-b',
        objectiveLabel: 'Route B Objective',
        routeBlockingAlternatives: [],
        routeChoiceIndex: 1,
        routeState: 'chosen',
      },
    ]);
    const objectiveAUnlocks = objectiveA.unlocks.map((unlock) => unlock.label);
    const objectiveBUnlocks = objectiveB.unlocks.map((unlock) => unlock.label);
    const objectiveCUnlocks = objectiveC.unlocks.map((unlock) => unlock.label);
    expect(objectiveAUnlocks).toContain('Peacekeeper');
    expect(objectiveBUnlocks).toContain('Route B Objective');
    expect(objectiveBUnlocks).toContain('Chapter completion package');
    expect(objectiveCUnlocks).toContain('Side Objective');
    expect(objectiveA.hasEstimatedUnlocks).toBe(true);
    expect(objectiveB.hasEstimatedUnlocks).toBe(true);
    expect(objectiveC.hasEstimatedUnlocks).toBe(false);
    expect(chapter.chapterUnlocks).toEqual([]);
    expect(chapter.mainLinearObjectives).toEqual([]);
    expect(chapter.optionalRouteChoices).toEqual([]);
    expect(chapter.optionalLinearObjectives.map((objective) => objective.id)).toEqual([
      'obj-c',
      'obj-d',
    ]);
  });
  it('ignores missing mutually exclusive links when deriving route alternatives', async () => {
    const { normalizedChapters } = await loadComposable();
    const chapter = requireDefined(
      normalizedChapters.value[0],
      'Expected first normalized chapter'
    );
    const objectiveD = requireDefined(
      chapter.objectives.find((objective) => objective.id === 'obj-d'),
      'Expected obj-d objective'
    );
    expect(objectiveD.routeAlternatives).toEqual([]);
    expect(objectiveD.routeBlockingAlternatives).toEqual([]);
    expect(objectiveD.routeState).toBe('open');
    expect(chapter.endings.map((ending) => ending.objectiveId)).toEqual(['obj-a', 'obj-b']);
  });
  it('does not classify lead-to route notes as endings', async () => {
    const chapters = JSON.parse(JSON.stringify(STORY_CHAPTERS)) as StoryChapter[];
    const chapter = chapters[0];
    if (!chapter) {
      throw new Error('Missing storyline chapter fixture');
    }
    chapter.objectives = chapter.objectives ?? {};
    chapter.objectives['obj-e'] = {
      description: 'Kerman Route',
      id: 'obj-e',
      mutuallyExclusiveWith: ['obj-f'],
      notes: 'Kerman Route — leads to Savior or Fallen ending',
      order: 5,
      type: 'optional',
    };
    chapter.objectives['obj-f'] = {
      description: 'Kerman Route Alternative',
      id: 'obj-f',
      order: 6,
      type: 'optional',
    };
    const { normalizedChapters } = await loadComposable(chapters);
    const normalizedChapter = requireDefined(
      normalizedChapters.value[0],
      'Expected first normalized chapter'
    );
    expect(normalizedChapter.optionalRouteChoices).toHaveLength(1);
    expect(normalizedChapter.endings.map((ending) => ending.objectiveId)).toEqual([
      'obj-a',
      'obj-b',
    ]);
  });
});
