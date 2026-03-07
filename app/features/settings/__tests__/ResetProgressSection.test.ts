import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
import ResetProgressSection from '@/features/settings/ResetProgressSection.vue';
import type { PrestigeRunRecord } from '@/stores/useTarkov';
const {
  fetchPrestigeRunsMock,
  prestigePvPMock,
  resetAllDataMock,
  resetPvEDataMock,
  resetPvPDataMock,
  toastAddMock,
} = vi.hoisted(() => ({
  fetchPrestigeRunsMock: vi.fn(async (): Promise<PrestigeRunRecord[]> => []),
  prestigePvPMock: vi.fn(async () => undefined),
  resetAllDataMock: vi.fn(async () => undefined),
  resetPvEDataMock: vi.fn(async () => undefined),
  resetPvPDataMock: vi.fn(async () => undefined),
  toastAddMock: vi.fn(),
}));
const mockSupabaseUser = reactive({
  id: 'user-1' as string | null,
  loggedIn: true,
});
const routerReplaceMock = vi.fn(() => Promise.resolve());
mockNuxtImport('useNuxtApp', () => () => ({
  $supabase: {
    user: mockSupabaseUser,
  },
  $config: {
    public: {
      i18n: {},
    },
  },
  _payloadRevivers: {},
  _route: {
    sync: vi.fn(() => Promise.resolve()),
  },
  deferHydration: () => () => {},
  isHydrating: false,
  runWithContext: (fn: () => unknown) => fn(),
  hooks: {
    hookOnce: vi.fn(),
    callHookWith: vi.fn(() => Promise.resolve()),
    callHook: vi.fn(() => Promise.resolve()),
  },
}));
mockNuxtImport('useRouter', () => () => ({
  replace: routerReplaceMock,
  resolve: vi.fn(() => ({ href: '/' })),
  beforeEach: vi.fn(),
  beforeResolve: vi.fn(),
  onError: vi.fn(),
  afterEach: vi.fn(),
}));
mockNuxtImport('useRuntimeConfig', () => () => ({
  app: {
    baseURL: '/',
  },
  public: {
    i18n: {},
  },
}));
mockNuxtImport('useToast', () => () => ({
  add: toastAddMock,
}));
vi.mock('@/stores/useTarkov', () => ({
  useTarkovStore: () => ({
    getCurrentGameMode: () => 'pvp',
    fetchPrestigeRuns: fetchPrestigeRunsMock,
    getPvPProgressData: () => ({ prestigeLevel: 0 }),
    prestigePvP: prestigePvPMock,
    resetAllData: resetAllDataMock,
    resetPvEData: resetPvEDataMock,
    resetPvPData: resetPvPDataMock,
  }),
}));
vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));
const UButton = {
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  props: ['disabled', 'loading'],
  emits: ['click'],
};
const UInput = {
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue'],
  emits: ['update:modelValue'],
};
const UModal = {
  template:
    '<div v-if="open"><slot name="header" /><slot name="body" /><slot name="footer" :close="close" /></div>',
  props: ['open'],
  emits: ['update:open', 'close'],
  setup(
    _props: unknown,
    { emit }: { emit: (event: 'update:open' | 'close', value?: false) => void }
  ) {
    const close = () => {
      emit('update:open', false);
      emit('close');
    };
    return { close };
  },
};
const findButtonByText = (wrapper: ReturnType<typeof mount>, text: string) => {
  return wrapper.findAll('button').find((button) => button.text().includes(text));
};
const createPrestigeRun = (id: string): PrestigeRunRecord => ({
  createdAt: '2026-03-01T00:00:00.000Z',
  id,
  mode: 'pvp' as const,
  prestigeFrom: 0,
  prestigeTo: 1,
  summary: {
    completedHideoutModules: 1,
    completedHideoutParts: 1,
    completedObjectives: 2,
    completedStoryChapters: 1,
    completedTasks: 3,
    failedTasks: 0,
    firstActionAt: 1,
    lastActionAt: 2,
    level: 15,
    prestigeLevel: 1,
  },
});
describe('ResetProgressSection', () => {
  beforeEach(() => {
    fetchPrestigeRunsMock.mockReset();
    fetchPrestigeRunsMock.mockResolvedValue([]);
    prestigePvPMock.mockReset();
    prestigePvPMock.mockResolvedValue(undefined);
    resetAllDataMock.mockReset();
    resetAllDataMock.mockResolvedValue(undefined);
    resetPvEDataMock.mockReset();
    resetPvEDataMock.mockResolvedValue(undefined);
    resetPvPDataMock.mockReset();
    resetPvPDataMock.mockResolvedValue(undefined);
    toastAddMock.mockClear();
    routerReplaceMock.mockClear();
    mockSupabaseUser.loggedIn = true;
    mockSupabaseUser.id = 'user-1';
  });
  const createWrapper = () =>
    mount(ResetProgressSection, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          'i18n-t': {
            template: '<span><slot /><slot name="word" /></span>',
          },
          UAlert: true,
          UButton,
          UIcon: true,
          UInput,
          UModal,
          SelectMenuFixed: true,
        },
      },
    });
  it('requires confirm word before resetting all data', async () => {
    const wrapper = createWrapper();
    const openResetAllButton = findButtonByText(wrapper, 'settings.data_management.reset_all_data');
    expect(openResetAllButton).toBeTruthy();
    await openResetAllButton!.trigger('click');
    const confirmButton = findButtonByText(wrapper, 'settings.data_management.reset_confirm');
    const input = wrapper.find('input');
    expect(confirmButton).toBeTruthy();
    expect(confirmButton!.attributes('disabled')).toBeDefined();
    await input.setValue('wrong');
    expect(confirmButton!.attributes('disabled')).toBeDefined();
    await input.setValue('settings.danger_zone.confirm_word');
    expect(confirmButton!.attributes('disabled')).toBeUndefined();
    await confirmButton!.trigger('click');
    await flushPromises();
    expect(resetAllDataMock).toHaveBeenCalledTimes(1);
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'success',
        title: 'settings.reset_all.success_title',
      })
    );
  });
  it('resets PvP data from the confirmation dialog', async () => {
    const wrapper = createWrapper();
    const openButton = findButtonByText(wrapper, 'settings.data_management.reset_pvp_data');
    expect(openButton).toBeTruthy();
    await openButton!.trigger('click');
    const confirmButton = findButtonByText(wrapper, 'settings.data_management.reset_confirm');
    expect(confirmButton).toBeTruthy();
    await confirmButton!.trigger('click');
    await flushPromises();
    expect(resetPvPDataMock).toHaveBeenCalledTimes(1);
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'success',
        title: 'settings.reset_pvp.success_title',
      })
    );
  });
  it('resets PvE data from the confirmation dialog', async () => {
    const wrapper = createWrapper();
    const openButton = findButtonByText(wrapper, 'settings.data_management.reset_pve_data');
    expect(openButton).toBeTruthy();
    await openButton!.trigger('click');
    const confirmButton = findButtonByText(wrapper, 'settings.data_management.reset_confirm');
    expect(confirmButton).toBeTruthy();
    await confirmButton!.trigger('click');
    await flushPromises();
    expect(resetPvEDataMock).toHaveBeenCalledTimes(1);
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'success',
        title: 'settings.reset_pve.success_title',
      })
    );
  });
  it('prestiges PvP data from the confirmation dialog', async () => {
    const wrapper = createWrapper();
    const openButton = findButtonByText(wrapper, 'settings.data_management.prestige_pvp_data');
    expect(openButton).toBeTruthy();
    await openButton!.trigger('click');
    const input = wrapper.find('input');
    await input.setValue('settings.prestige.confirm_word');
    const prestigeButtons = wrapper
      .findAll('button')
      .filter((button) => button.text().includes('settings.data_management.prestige_pvp_data'));
    const confirmButton = prestigeButtons[prestigeButtons.length - 1];
    expect(confirmButton).toBeTruthy();
    await confirmButton!.trigger('click');
    await flushPromises();
    expect(prestigePvPMock).toHaveBeenCalledTimes(1);
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'success',
        title: 'settings.prestige_pvp.success_title',
      })
    );
  });
  it('disables prestige actions when logged out', async () => {
    mockSupabaseUser.loggedIn = false;
    mockSupabaseUser.id = null;
    const wrapper = createWrapper();
    await flushPromises();
    const openButton = findButtonByText(wrapper, 'settings.data_management.prestige_pvp_data');
    expect(openButton).toBeTruthy();
    expect(openButton!.attributes('disabled')).toBeDefined();
    expect(fetchPrestigeRunsMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('settings.prestige.login_required');
  });
  it('reloads prestige history when the authenticated user changes', async () => {
    fetchPrestigeRunsMock.mockResolvedValue([createPrestigeRun('run-1')]);
    mockSupabaseUser.loggedIn = false;
    mockSupabaseUser.id = null;
    const wrapper = createWrapper();
    await flushPromises();
    expect(fetchPrestigeRunsMock).not.toHaveBeenCalled();
    mockSupabaseUser.loggedIn = true;
    mockSupabaseUser.id = 'user-1';
    await nextTick();
    await flushPromises();
    expect(fetchPrestigeRunsMock).toHaveBeenCalledTimes(1);
    mockSupabaseUser.loggedIn = false;
    mockSupabaseUser.id = null;
    await nextTick();
    await flushPromises();
    expect(wrapper.text()).toContain('settings.prestige.login_required');
  });
});
