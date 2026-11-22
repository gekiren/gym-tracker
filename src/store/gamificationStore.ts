import { create } from 'zustand';
import { saveSetting } from '../db/database';
import {
  ClassUpEvent,
  GamificationMetrics,
  MedalUnlockNotice,
  PersistedGamificationState,
  RetroactiveSummaryNotice,
  WorkoutGamificationSummary,
} from '../types/gamification';
import {
  createEmptyMetrics,
  createInitialPersistedGamificationState,
} from '../constants/gamificationConstants';

export const GAMIFICATION_SETTING_KEY = 'gamification_state_v1';

interface GamificationStoreState extends PersistedGamificationState {
  isInitialized: boolean;
  metrics: GamificationMetrics;
  pendingClassUp: ClassUpEvent | null;
  pendingMedalNotice: MedalUnlockNotice | null;
  pendingRetroactiveSummary: RetroactiveSummaryNotice | null;
  lastWorkoutGamification: WorkoutGamificationSummary | null;

  hydrateState: (
    persisted: PersistedGamificationState,
    metrics: GamificationMetrics,
    retroactiveSummary?: RetroactiveSummaryNotice | null
  ) => void;
  applyPersistedUpdate: (
    next: PersistedGamificationState,
    options?: {
      metrics?: GamificationMetrics;
      classUp?: ClassUpEvent | null;
      medalNotice?: MedalUnlockNotice | null;
      retroactiveSummary?: RetroactiveSummaryNotice | null;
      workoutSummary?: WorkoutGamificationSummary | null;
      persist?: boolean;
    }
  ) => void;
  setMetrics: (metrics: GamificationMetrics) => void;
  clearPendingClassUp: () => void;
  clearPendingMedalNotice: () => void;
  clearPendingRetroactiveSummary: () => void;
  showPreviewClassUp: (event: ClassUpEvent) => void;
  showPreviewMedalNotice: (notice: MedalUnlockNotice) => void;
  resetAll: () => void;
}

function mergeClassUpEvents(existing: ClassUpEvent | null, incoming: ClassUpEvent): ClassUpEvent {
  if (!existing) return incoming;
  const mergedOverall = incoming.overall
    ? existing.overall
      ? {
          from: existing.overall.from,
          to: incoming.overall.to,
          bonusPoints: existing.overall.bonusPoints + incoming.overall.bonusPoints,
        }
      : incoming.overall
    : existing.overall;

  const featureMap = new Map(existing.features.map((f) => [f.featureId, { ...f }]));
  for (const f of incoming.features) {
    const prev = featureMap.get(f.featureId);
    if (prev) {
      featureMap.set(f.featureId, {
        featureId: f.featureId,
        from: prev.from,
        to: f.to,
        bonusPoints: prev.bonusPoints + f.bonusPoints,
      });
    } else {
      featureMap.set(f.featureId, { ...f });
    }
  }

  return {
    overall: mergedOverall,
    features: Array.from(featureMap.values()),
  };
}

function mergeMedalNotices(
  existing: MedalUnlockNotice | null,
  incoming: MedalUnlockNotice
): MedalUnlockNotice {
  if (!existing) return incoming;
  const existingIds = new Set(existing.medals.map((m) => m.id));
  const mergedMedals = [
    ...existing.medals,
    ...incoming.medals.filter((m) => !existingIds.has(m.id)),
  ];
  return {
    medals: mergedMedals,
    totalBonusXp: existing.totalBonusXp + incoming.totalBonusXp,
    totalBonusPoints: existing.totalBonusPoints + incoming.totalBonusPoints,
  };
}

export const useGamificationStore = create<GamificationStoreState>((set, get) => ({
  ...createInitialPersistedGamificationState(),
  isInitialized: false,
  metrics: createEmptyMetrics(),
  pendingClassUp: null,
  pendingMedalNotice: null,
  pendingRetroactiveSummary: null,
  lastWorkoutGamification: null,

  hydrateState: (persisted, metrics, retroactiveSummary = null) => {
    set({
      ...persisted,
      metrics,
      isInitialized: true,
      pendingRetroactiveSummary: retroactiveSummary,
    });
  },

  applyPersistedUpdate: (next, options) => {
    const state = get();
    const nextClassUp = options?.classUp
      ? mergeClassUpEvents(state.pendingClassUp, options.classUp)
      : state.pendingClassUp;
    const nextMedalNotice = options?.medalNotice
      ? mergeMedalNotices(state.pendingMedalNotice, options.medalNotice)
      : state.pendingMedalNotice;

    set({
      ...next,
      metrics: options?.metrics ?? state.metrics,
      pendingClassUp: nextClassUp,
      pendingMedalNotice: nextMedalNotice,
      pendingRetroactiveSummary:
        options?.retroactiveSummary !== undefined
          ? options.retroactiveSummary
          : state.pendingRetroactiveSummary,
      lastWorkoutGamification:
        options?.workoutSummary !== undefined
          ? options.workoutSummary
          : state.lastWorkoutGamification,
      isInitialized: true,
    });

    if (options?.persist !== false) {
      saveSetting(GAMIFICATION_SETTING_KEY, JSON.stringify(next)).catch((err) => {
        console.warn('Failed to persist gamification state:', err);
      });
    }
  },

  setMetrics: (metrics) => {
    set({ metrics });
  },

  clearPendingClassUp: () => {
    set({ pendingClassUp: null });
  },

  clearPendingMedalNotice: () => {
    set({ pendingMedalNotice: null });
  },

  clearPendingRetroactiveSummary: () => {
    set({ pendingRetroactiveSummary: null });
  },

  showPreviewClassUp: (event) => {
    set({ pendingClassUp: event });
  },

  showPreviewMedalNotice: (notice) => {
    set({ pendingMedalNotice: notice });
  },

  resetAll: () => {
    set({
      ...createInitialPersistedGamificationState(),
      isInitialized: false,
      metrics: createEmptyMetrics(),
      pendingClassUp: null,
      pendingMedalNotice: null,
      pendingRetroactiveSummary: null,
      lastWorkoutGamification: null,
    });
  },
}));
