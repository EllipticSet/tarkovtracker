import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computed, defineComponent, ref } from 'vue';
import { useOverlayFocusTrap } from '@/composables/useOverlayFocusTrap';
const mountHarness = () => {
  const Harness = defineComponent({
    setup() {
      const containerRef = ref<HTMLElement | null>(null);
      const isOverlayMode = computed(() => true);
      const { restoreTriggerFocus, trapFocus } = useOverlayFocusTrap({
        containerRef,
        isOverlayMode,
      });
      return {
        containerRef,
        restoreTriggerFocus,
        trapFocus,
      };
    },
    template: `
      <aside ref="containerRef" tabindex="-1" @keydown="trapFocus">
        <button id="first-button" type="button">First</button>
        <button id="last-button" type="button">Last</button>
      </aside>
    `,
  });
  return mount(Harness, {
    attachTo: document.body,
  });
};
describe('useOverlayFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });
  it('keeps tab focus inside the overlay container', async () => {
    const triggerButton = document.createElement('button');
    triggerButton.type = 'button';
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    const wrapper = mountHarness();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    const overlay = wrapper.get('aside').element as HTMLElement;
    const firstButton = wrapper.get('#first-button').element as HTMLButtonElement;
    const lastButton = wrapper.get('#last-button').element as HTMLButtonElement;
    expect(document.activeElement).toBe(overlay);
    lastButton.focus();
    lastButton.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
      })
    );
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(firstButton);
    firstButton.focus();
    firstButton.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
        shiftKey: true,
      })
    );
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(lastButton);
  });
  it('restores focus to the trigger element when requested', async () => {
    const triggerButton = document.createElement('button');
    triggerButton.type = 'button';
    triggerButton.textContent = 'Trigger';
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    const wrapper = mountHarness();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    wrapper.vm.restoreTriggerFocus();
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(triggerButton);
  });
});
