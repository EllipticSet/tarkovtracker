import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HideoutCard from '@/features/hideout/HideoutCard.vue';
const trackEventMock = vi.fn();
const toastAddMock = vi.fn();
let arePrereqsMetResult = true;
let stationReqMetResult = true;
let skillReqMetResult = true;
let traderReqMetResult = true;
vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => translations[key] ?? key,
    }),
  };
});
vi.mock('@/composables/useAnalyticsEvents', () => ({
  useAnalyticsEvents: () => ({
    trackEvent: trackEventMock,
  }),
}));
vi.mock('@/composables/useHideoutStationStatus', () => ({
  useHideoutStationStatus: () => ({
    arePrereqsMet: () => arePrereqsMetResult,
    isSkillReqMet: () => skillReqMetResult,
    isStationReqMet: () => stationReqMetResult,
    isTraderReqMet: () => traderReqMetResult,
  }),
}));
vi.mock('@/stores/useMetadata', () => ({
  useMetadataStore: () => ({
    getStationById: () => ({
      levels: [
        {
          id: 'generator-level-1',
          level: 1,
        },
      ],
    }),
  }),
}));
vi.mock('@/stores/useProgress', () => ({
  useProgressStore: () => ({
    gameEditionData: [],
    hideoutLevels: {
      generator: { self: 0 },
      workbench: { self: 0 },
    },
  }),
}));
vi.mock('@/stores/useTarkov', () => ({
  useTarkovStore: () => ({
    getCurrentGameMode: () => 'pvp',
    getGameEdition: () => 'standard',
    setHideoutModuleComplete: vi.fn(),
    setHideoutModuleUncomplete: vi.fn(),
    setHideoutPartComplete: vi.fn(),
    setHideoutPartUncomplete: vi.fn(),
  }),
}));
vi.mock('#imports', () => ({
  useToast: () => ({
    add: toastAddMock,
  }),
}));
const translations: Record<string, string> = {
  'hideout.collapse': 'Collapse',
  'hideout.expand': 'Expand',
  'page.hideout.stationcard.level_not_ready': 'Not ready',
  'page.hideout.stationcard.max_level': 'Max level',
  'page.hideout.stationcard.next_level': 'Next level',
  'page.hideout.stationcard.prerequisites': 'Prerequisites',
  'page.hideout.stationcard.upgrade': 'Build',
  'page.hideout.stationcard.upgrade_unavailable': 'Unavailable',
};
const GenericCardStub = {
  inheritAttrs: false,
  template: `
    <div v-bind="$attrs">
      <slot name="header" />
      <slot name="content" />
      <slot name="footer" />
    </div>
  `,
};
const UButtonStub = {
  inheritAttrs: false,
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
};
const NuxtLinkStub = {
  inheritAttrs: false,
  template: '<a v-bind="$attrs"><slot /></a>',
};
describe('HideoutCard', () => {
  beforeEach(() => {
    arePrereqsMetResult = true;
    stationReqMetResult = true;
    skillReqMetResult = true;
    traderReqMetResult = true;
    trackEventMock.mockReset();
    toastAddMock.mockReset();
  });
  it('uses shared hideout status checks when rendering availability and prerequisite rows', async () => {
    const wrapper = await mountSuspended(HideoutCard, {
      props: {
        station: {
          id: 'workbench',
          imageLink: '/workbench.png',
          levels: [
            {
              constructionTime: 0,
              crafts: [],
              id: 'workbench-level-1',
              itemRequirements: [
                {
                  count: 1,
                  id: 'req-1',
                  item: {
                    id: 'item-1',
                    name: 'Bolts',
                  },
                  quantity: 1,
                },
              ],
              level: 1,
              skillRequirements: [
                {
                  id: 'skill-req-1',
                  level: 2,
                  name: 'Crafting',
                  skill: {
                    id: 'crafting',
                    name: 'Crafting',
                  },
                },
              ],
              stationLevelRequirements: [
                {
                  id: 'station-req-1',
                  level: 1,
                  station: {
                    id: 'generator',
                    name: 'Generator',
                  },
                },
              ],
              traderRequirements: [
                {
                  id: 'trader-req-1',
                  trader: {
                    id: 'mechanic',
                    name: 'Mechanic',
                  },
                  value: 1,
                },
              ],
            },
          ],
          name: 'Workbench',
          normalizedName: 'workbench',
        },
      },
      global: {
        stubs: {
          GenericCard: GenericCardStub,
          HideoutRequirement: {
            template: '<div data-testid="hideout-requirement-stub" />',
          },
          NuxtLink: NuxtLinkStub,
          UButton: UButtonStub,
          UIcon: true,
          'i18n-t': {
            template:
              '<span><slot name="level" /><slot name="stationname" /><slot name="skillname" /><slot name="tradername" /><slot name="loyaltylevel" /></span>',
          },
        },
        mocks: {
          $t: (key: string) => translations[key] ?? key,
          $toast: {
            add: toastAddMock,
          },
        },
      },
    });
    expect(wrapper.text()).not.toContain('Not ready');
    expect(wrapper.html()).toContain('text-success-400');
    expect(wrapper.html()).not.toContain('text-error-400');
  });
});
