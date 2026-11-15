import { create } from 'zustand';
import {
  AppliedProposalHistoryEntry,
  DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS,
  GoogleDriveSyncSettings,
  PendingDriveProposal,
  RestorePauseState,
  TrainerAdviceEntry,
} from '../services/googleDrive/types';

export type DriveSyncActivity = 'idle' | 'uploading' | 'downloading' | 'applying';

interface GoogleDriveSyncStoreState {
  settings: GoogleDriveSyncSettings;
  activity: DriveSyncActivity;
  restorePause: RestorePauseState | null;
  pendingProposal: PendingDriveProposal | null;
  advices: TrainerAdviceEntry[];
  appliedHistory: AppliedProposalHistoryEntry[];
  lastStatusMessage: string | null;
  appliedRevision: number;

  setSettings: (settings: GoogleDriveSyncSettings) => void;
  setActivity: (activity: DriveSyncActivity) => void;
  setRestorePause: (pause: RestorePauseState | null) => void;
  setPendingProposal: (proposal: PendingDriveProposal | null) => void;
  setAdvices: (advices: TrainerAdviceEntry[]) => void;
  setAppliedHistory: (history: AppliedProposalHistoryEntry[]) => void;
  setLastStatusMessage: (msg: string | null) => void;
  bumpAppliedRevision: () => void;
}

export const useGoogleDriveSyncStore = create<GoogleDriveSyncStoreState>((set) => ({
  settings: DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS,
  activity: 'idle',
  restorePause: null,
  pendingProposal: null,
  advices: [],
  appliedHistory: [],
  lastStatusMessage: null,
  appliedRevision: 0,

  setSettings: (settings) => set({ settings }),
  setActivity: (activity) => set({ activity }),
  setRestorePause: (restorePause) => set({ restorePause }),
  setPendingProposal: (pendingProposal) => set({ pendingProposal }),
  setAdvices: (advices) => set({ advices }),
  setAppliedHistory: (appliedHistory) => set({ appliedHistory }),
  setLastStatusMessage: (lastStatusMessage) => set({ lastStatusMessage }),
  bumpAppliedRevision: () => set((s) => ({ appliedRevision: s.appliedRevision + 1 })),
}));
