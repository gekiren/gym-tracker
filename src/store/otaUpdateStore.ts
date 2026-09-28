import { create } from 'zustand';

interface OTAUpdateState {
  isVisible: boolean;
  isSuppressed: boolean;
  showModal: () => void;
  hideModal: () => void;
  suppressModal: () => void;
}

export const useOTAUpdateStore = create<OTAUpdateState>((set, get) => ({
  isVisible: false,
  isSuppressed: false,
  showModal: () => {
    if (get().isSuppressed) return;
    set({ isVisible: true });
  },
  hideModal: () => set({ isVisible: false }),
  suppressModal: () => set({ isSuppressed: true, isVisible: false }),
}));
