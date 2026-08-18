import { create } from 'zustand';
import { BodyCompositionLog } from '../types/bodyComposition';
import {
  getBodyLogByDate,
  getAllBodyLogs,
  upsertBodyLog,
  deleteBodyLog as dbDeleteBodyLog,
  getLatestBodyLog,
} from '../db/repositories/bodyRepository';
import { fetchTodayHealthData } from '../services/healthService';

export interface BodyState {
  currentLog: BodyCompositionLog | null;
  latestLog: BodyCompositionLog | null;
  historyLogs: BodyCompositionLog[];
  isLoading: boolean;
  isHealthSyncing: boolean;
  syncError: string | null;

  // Actions
  loadBodyData: (date: string) => Promise<void>;
  loadAllHistory: (limit?: number) => Promise<void>;
  saveBodyLog: (log: Partial<BodyCompositionLog> & { date: string }) => Promise<number>;
  deleteBodyLog: (id: number, currentDate?: string) => Promise<void>;
  syncWithHealthConnect: (date: string) => Promise<boolean>;
}

export const useBodyStore = create<BodyState>((set, get) => ({
  currentLog: null,
  latestLog: null,
  historyLogs: [],
  isLoading: false,
  isHealthSyncing: false,
  syncError: null,

  /**
   * 指定日の体組成ログと直近ログを読み込む
   */
  loadBodyData: async (date: string) => {
    set({ isLoading: true, syncError: null });
    try {
      const [current, latest, history] = await Promise.all([
        getBodyLogByDate(date),
        getLatestBodyLog(),
        getAllBodyLogs(50),
      ]);
      set({
        currentLog: current,
        latestLog: latest,
        historyLogs: history,
        isLoading: false,
      });
    } catch (e: any) {
      console.error('Failed to load body composition data:', e);
      set({ isLoading: false, syncError: e.message || 'データ読み込みに失敗しました' });
    }
  },

  /**
   * 体組成の全履歴を読み込む
   */
  loadAllHistory: async (limit: number = 100) => {
    try {
      const history = await getAllBodyLogs(limit);
      set({ historyLogs: history });
    } catch (e: any) {
      console.error('Failed to load body history:', e);
    }
  },

  /**
   * 体組成ログを保存（新規/更新）
   */
  saveBodyLog: async (log: Partial<BodyCompositionLog> & { date: string }) => {
    set({ isLoading: true });
    try {
      const savedId = await upsertBodyLog(log);
      const [updatedCurrent, updatedLatest, updatedHistory] = await Promise.all([
        getBodyLogByDate(log.date),
        getLatestBodyLog(),
        getAllBodyLogs(50),
      ]);
      set({
        currentLog: updatedCurrent,
        latestLog: updatedLatest,
        historyLogs: updatedHistory,
        isLoading: false,
      });

      // Obsidian 自動エクスポートとの連動
      if (updatedCurrent) {
        import('../services/obsidianService')
          .then(({ exportBodyCompositionToObsidian }) => {
            exportBodyCompositionToObsidian(updatedCurrent).catch((err) =>
              console.warn('[Obsidian] Auto body export failed:', err)
            );
          })
          .catch(() => {});
      }

      return savedId;
    } catch (e: any) {
      console.error('Failed to save body log:', e);
      set({ isLoading: false });
      throw e;
    }
  },

  /**
   * 体組成ログを削除
   */
  deleteBodyLog: async (id: number, currentDate?: string) => {
    try {
      await dbDeleteBodyLog(id);
      const date = currentDate || get().currentLog?.date;
      const [updatedCurrent, updatedLatest, updatedHistory] = await Promise.all([
        date ? getBodyLogByDate(date) : Promise.resolve(null),
        getLatestBodyLog(),
        getAllBodyLogs(50),
      ]);
      set({
        currentLog: updatedCurrent,
        latestLog: updatedLatest,
        historyLogs: updatedHistory,
      });
    } catch (e: any) {
      console.error('Failed to delete body log:', e);
    }
  },

  /**
   * Google Health Connect から最新体組成データを取得して反映
   */
  syncWithHealthConnect: async (date: string) => {
    set({ isHealthSyncing: true, syncError: null });
    try {
      const { data, error } = await fetchTodayHealthData(false);
      if (error || !data) {
        set({ isHealthSyncing: false, syncError: error || 'Health Connectからデータを取得できませんでした' });
        return false;
      }

      // 体重・体脂肪率・骨格筋量・身長の抽出
      const weight = data.weight > 0 ? data.weight : undefined;
      const bodyFatRate = data.bodyFatRate > 0 ? data.bodyFatRate : undefined;
      const muscleMass = data.muscleMass > 0 ? data.muscleMass : undefined;
      const heightCm = data.heightMeters > 0 ? Math.round(data.heightMeters * 100) : undefined;
      const lbm = weight && bodyFatRate ? Number((weight * (1 - bodyFatRate / 100)).toFixed(1)) : undefined;

      await get().saveBodyLog({
        date,
        weight,
        body_fat_rate: bodyFatRate,
        muscle_mass: muscleMass,
        lbm,
        height: heightCm,
        source: 'health_connect',
      });

      set({ isHealthSyncing: false, syncError: null });
      return true;
    } catch (e: any) {
      console.error('Error syncing with Health Connect:', e);
      set({ isHealthSyncing: false, syncError: e.message || 'Health Connect同期中にエラーが発生しました' });
      return false;
    }
  },
}));
