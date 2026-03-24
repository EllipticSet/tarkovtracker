export function useHideoutSettingsDrawer(): {
  isOpen: globalThis.Ref<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
} {
  const isOpen = useState<boolean>('hideoutSettingsDrawer:isOpen', () => false);
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
