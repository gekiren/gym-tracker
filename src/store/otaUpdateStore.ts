import { create } from 'zustand';

interface OTAUpdateState {
  isVisible: boolean;
  showModal: () => void;
  hideModal: () => void;
}

export const useOTAUpdateStore = create<OTAUpdateState>((set) => ({
  isVisible: false,
  showModal: () => set({ isVisible: true }),
  hideModal: () => set({ isVisible: false }),
}));
