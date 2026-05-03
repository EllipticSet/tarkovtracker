const PAGE_SETTINGS_DRAWER_STATE_KEYS = {
  hideout: 'hideoutSettingsDrawer:isOpen',
  needed_items: 'neededItemsSettingsDrawer:isOpen',
  tasks: 'taskSettingsDrawer:isOpen',
} as const;
type PageSettingsDrawerKey = keyof typeof PAGE_SETTINGS_DRAWER_STATE_KEYS;
export function usePageSettingsDrawer(pageKey: PageSettingsDrawerKey): {
  isOpen: globalThis.Ref<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
} {
  const stateKey = PAGE_SETTINGS_DRAWER_STATE_KEYS[pageKey];
  const isOpen = useState<boolean>(stateKey, () => false);
  const open = () => {
    isOpen.value = true;
  };
  const close = () => {
    isOpen.value = false;
  };
  const toggle = () => {
    isOpen.value = !isOpen.value;
  };
  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
