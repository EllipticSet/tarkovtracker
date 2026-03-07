// @vitest-environment happy-dom
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import type { UserProgressData } from '@/stores/progressState';
const replaceMock = vi.fn(async (_location: { query: Record<string, unknown> }) => undefined);
const routeState = reactive({
  query: {
    filter: 'active',
    highlightObjective: 'objective-1' as string | undefined,
    task: undefined as string | undefined,
  },
});
mockNuxtImport('useRoute', () => () => routeState);
mockNuxtImport('useRouter', () => () => ({
  replace: replaceMock,
}));
vi.mock('@/stores/useMetadata', () => ({
  useMetadataStore: () => ({
    getTaskById: (taskId: string) => ({
      id: taskId,
      name: taskId === 'task-1' ? 'Task One' : taskId,
    }),
  }),
}));
vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({
    t: (key: string, _params?: Record<string, string | number>, fallback?: string) =>
      fallback ?? key,
    te: () => false,
  }),
}));
const createProgressData = (overrides: Partial<UserProgressData> = {}): UserProgressData => ({
  level: 1,
  pmcFaction: 'USEC',
  displayName: null,
  xpOffset: 0,
  taskObjectives: {},
  taskCompletions: {},
  hideoutParts: {},
  hideoutModules: {},
  traders: {},
  skills: {},
  prestigeLevel: 0,
  progressEpoch: 0,
  skillOffsets: {},
  storyChapters: {},
  apiUpdateHistory: [],
  ...overrides,
});
const mountPanel = async () => {
  const { default: ApiUpdateLogPanel } = await import('@/features/tasks/ApiUpdateLogPanel.vue');
  return mount(ApiUpdateLogPanel, {
    props: {
      progressData: createProgressData({
        apiUpdateHistory: [
          {
            at: Date.now(),
            id: 'entry-1',
            source: 'api',
            tasks: [{ id: 'task-1', state: 'completed' }],
          },
        ],
      }),
    },
    global: {
      stubs: {
        Transition: false,
        UBadge: true,
        UButton: {
          props: ['ariaControls', 'ariaExpanded', 'class', 'color', 'icon', 'size', 'variant'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        UIcon: true,
      },
    },
  });
};
describe('ApiUpdateLogPanel', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    routeState.query.filter = 'active';
    routeState.query.highlightObjective = 'objective-1';
    routeState.query.task = undefined;
  });
  it('routes task clicks through the tasks deep-link query flow', async () => {
    const wrapper = await mountPanel();
    const taskButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Task One'));
    expect(taskButton).toBeTruthy();
    await taskButton!.trigger('click');
    expect(replaceMock).toHaveBeenCalledWith({
      query: {
        filter: 'active',
        highlightObjective: undefined,
        task: 'task-1',
      },
    });
  });
});
