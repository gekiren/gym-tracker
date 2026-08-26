import { create } from 'zustand';
import { FeatureId } from './settingsStore';
import { FeatureUnlockState, PointActionType } from '../types/featureUnlock';
import { saveSetting } from '../db/database';
import { ALL_FEATURE_IDS, getUnlockCost, POINT_REWARDS } from '../constants/featureUnlockConstants';

interface FeatureUnlockStoreState extends FeatureUnlockState {
  isInitialized: boolean;
  
  // Actions
  initializeStore: (state: Partial<FeatureUnlockState>) => void;
  awardPoints: (amount: number, type: PointActionType, description: string) => void;
  consumePoints: (amount: number, type: PointActionType, description: string) => boolean;
  unlockFeature: (featureId: FeatureId, isFree?: boolean) => boolean;
  setInitialFeatures: (features: [FeatureId, FeatureId]) => void;
  setForceUnlockAll: (force: boolean) => void;
  setPendingUnlockFeature: (featureId: FeatureId | null) => void;
  clearPendingPointNotice: () => void;
  showPointNotice: (points: number, title: string, desc?: string) => void;
  markFeatureRecorded: (featureId: FeatureId, dateStr: string) => { isFirstEver: boolean; isFirstToday: boolean; pointsAwarded: number };
}

export const initialFeatureUnlockState: FeatureUnlockState = {
  pointsBalance: 5, // 初期ボーナス 5P
  unlockedFeatures: ['workout', 'water'], // デフォルトフォールバック
  forceUnlockAll: false,
  firstRecordedFeatures: [],
  dailyRecordMap: {},
  hasCompletedInitialSelection: false,
  pendingUnlockFeature: null,
  pendingPointNotice: null,
};

export const useFeatureUnlockStore = create<FeatureUnlockStoreState>((set, get) => ({
  ...initialFeatureUnlockState,
  isInitialized: false,

  initializeStore: (payload) => {
    set((state) => ({
      ...state,
      ...payload,
      isInitialized: true,
    }));
  },

  awardPoints: (amount: number, type: PointActionType, description: string) => {
    if (amount <= 0) return;
    const newBalance = get().pointsBalance + amount;
    set({ pointsBalance: newBalance });
    saveSetting('p_points_balance', String(newBalance)).catch(e => console.warn('Failed to save p_points_balance', e));
  },

  consumePoints: (amount: number, type: PointActionType, description: string) => {
    const current = get().pointsBalance;
    if (current < amount) {
      return false;
    }
    const newBalance = current - amount;
    set({ pointsBalance: newBalance });
    saveSetting('p_points_balance', String(newBalance)).catch(e => console.warn('Failed to save p_points_balance', e));
    return true;
  },

  unlockFeature: (featureId: FeatureId, isFree = false) => {
    const state = get();
    if (state.unlockedFeatures.includes(featureId)) {
      return true; // Already unlocked
    }

    const cost = isFree ? 0 : getUnlockCost(state.unlockedFeatures.length);
    if (!isFree && state.pointsBalance < cost) {
      return false; // Not enough points
    }

    const nextUnlocked = Array.from(new Set([...state.unlockedFeatures, featureId]));
    const nextBalance = isFree ? state.pointsBalance : state.pointsBalance - cost;

    set({
      unlockedFeatures: nextUnlocked,
      pointsBalance: nextBalance,
      pendingUnlockFeature: featureId,
    });

    saveSetting('unlocked_features', JSON.stringify(nextUnlocked)).catch(e => console.warn('Failed to save unlocked_features', e));
    if (!isFree) {
      saveSetting('p_points_balance', String(nextBalance)).catch(e => console.warn('Failed to save p_points_balance', e));
    }
    return true;
  },

  setInitialFeatures: (features: [FeatureId, FeatureId]) => {
    const nextUnlocked = Array.from(new Set(features));
    const nextBalance = Math.max(get().pointsBalance, POINT_REWARDS.INITIAL_BONUS);
    
    set({
      unlockedFeatures: nextUnlocked,
      hasCompletedInitialSelection: true,
      pointsBalance: nextBalance,
    });

    saveSetting('unlocked_features', JSON.stringify(nextUnlocked)).catch(e => console.warn('Failed to save unlocked_features', e));
    saveSetting('has_completed_initial_feature_selection', 'true').catch(e => console.warn('Failed to save has_completed_initial_feature_selection', e));
    saveSetting('p_points_balance', String(nextBalance)).catch(e => console.warn('Failed to save p_points_balance', e));
  },

  setForceUnlockAll: (force: boolean) => {
    set({ forceUnlockAll: force });
    saveSetting('force_unlock_all_features', force ? 'true' : 'false').catch(e => console.warn('Failed to save force_unlock_all_features', e));
  },

  setPendingUnlockFeature: (featureId: FeatureId | null) => {
    set({ pendingUnlockFeature: featureId });
  },

  clearPendingPointNotice: () => {
    set({ pendingPointNotice: null });
  },

  showPointNotice: (points: number, title: string, desc?: string) => {
    set({ pendingPointNotice: { points, title, desc } });
  },

  markFeatureRecorded: (featureId: FeatureId, dateStr: string) => {
    const state = get();
    const isFirstEver = !state.firstRecordedFeatures.includes(featureId);
    const todayList = state.dailyRecordMap[dateStr] || [];
    const isFirstToday = !todayList.includes(featureId);

    let pointsAwarded = 0;
    const nextFirstRecorded = isFirstEver
      ? [...state.firstRecordedFeatures, featureId]
      : state.firstRecordedFeatures;

    const nextDailyList = isFirstToday ? [...todayList, featureId] : todayList;
    const nextDailyMap = {
      ...state.dailyRecordMap,
      [dateStr]: nextDailyList,
    };

    if (isFirstEver) {
      pointsAwarded += POINT_REWARDS.FIRST_RECORD_BONUS;
    } else if (isFirstToday) {
      pointsAwarded += POINT_REWARDS.DAILY_RECORD_BONUS;
    }

    if (pointsAwarded > 0) {
      const nextBalance = state.pointsBalance + pointsAwarded;
      set({
        pointsBalance: nextBalance,
        firstRecordedFeatures: nextFirstRecorded,
        dailyRecordMap: nextDailyMap,
        pendingPointNotice: {
          points: pointsAwarded,
          title: isFirstEver ? '初記録ボーナス！' : '今日の記録ポイント！',
          desc: isFirstEver
            ? `初めての記録を達成しました (+${pointsAwarded}P)`
            : `今日の記録を達成しました (+${pointsAwarded}P)`,
        },
      });

      saveSetting('p_points_balance', String(nextBalance)).catch(e => console.warn('Failed to save p_points_balance', e));
      if (isFirstEver) {
        saveSetting('first_recorded_features', JSON.stringify(nextFirstRecorded)).catch(e => console.warn('Failed to save first_recorded_features', e));
      }
      saveSetting('daily_record_map', JSON.stringify(nextDailyMap)).catch(e => console.warn('Failed to save daily_record_map', e));
    } else {
      set({
        firstRecordedFeatures: nextFirstRecorded,
        dailyRecordMap: nextDailyMap,
      });
    }

    return { isFirstEver, isFirstToday, pointsAwarded };
  },
}));

// セレクターヘルパー: ある機能がアンロックされているか判定
export const isFeatureUnlockedHelper = (
  featureId: FeatureId,
  unlockedFeatures: FeatureId[],
  forceUnlockAll: boolean,
  isPremium: boolean,
  isEarlyAdopter: boolean
): boolean => {
  if (isPremium || isEarlyAdopter || forceUnlockAll) {
    return true;
  }
  return unlockedFeatures.includes(featureId);
};
