import type { PageHelpKey } from '@/composables/usePageHelpContent';
export interface PageHelpCloseOptions {
  restoreFocus?: boolean;
}
export function usePageHelpState(pageKey: PageHelpKey): {
  isOpen: globalThis.Ref<boolean>;
  open: () => void;
  close: (options?: PageHelpCloseOptions) => void;
  toggle: () => void;
  consumeRestoreFocusOnClose: () => boolean;
} {
  const isOpen = useState<boolean>(`pageHelp:${pageKey}:isOpen`, () => false);
  const restoreFocusOnClose = useState<boolean>(`pageHelp:${pageKey}:restoreFocus`, () => true);
  const open = () => {
    restoreFocusOnClose.value = true;
    isOpen.value = true;
  };
  const close = (options: PageHelpCloseOptions = {}) => {
    restoreFocusOnClose.value = options.restoreFocus ?? true;
    isOpen.value = false;
  };
  const toggle = () => {
    if (isOpen.value) {
      close();
      return;
    }
    open();
  };
  const consumeRestoreFocusOnClose = () => {
    const shouldRestoreFocus = restoreFocusOnClose.value;
    restoreFocusOnClose.value = true;
    return shouldRestoreFocus;
  };
  return {
    isOpen,
    open,
    close,
    toggle,
    consumeRestoreFocusOnClose,
  };
}
