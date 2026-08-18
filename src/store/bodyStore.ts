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
import { getSettings, saveSetting } from '../db/database';

export interface SavedBodyMeasurements {
  neck?: number | null;
  waist?: number | null;
  hip?: number | null;
  wrist?: number | null;
  ankle?: number | null;
  targetFatRate?: number;
  height?: number | null;
}

export interface BodyState {
  currentLog: BodyCompositionLog | null;
  latestLog: BodyCompositionLog | null;
  savedMeasurements: SavedBodyMeasurements;
  historyLogs: BodyCompositionLog[];
  isLoading: boolean;
  isHealthSyncing: boolean;
  syncError: string | null;

  // Actions
  loadBodyData: (date: string) => Promise<void>;
  loadAllHistory: (limit?: number) => Promise<void>;
  saveBodyLog: (log: Partial<BodyCompositionLog> & { date: string }) => Promise<number>;
  saveLastMeasurements: (measurements: Partial<SavedBodyMeasurements>) => Promise<void>;
  deleteBodyLog: (id: number, currentDate?: string) => Promise<void>;
  syncWithHealthConnect: (date: string) => Promise<boolean>;
}

export const useBodyStore = create<BodyState>((set, get) => ({
  currentLog: null,
  latestLog: null,
  savedMeasurements: {},
  historyLogs: [],
  isLoading: false,
  isHealthSyncing: false,
  syncError: null,

  /**
   * 指定日の体組成ログ、直近ログ、保存された測定設定値を読み込む
   */
  loadBodyData: async (date: string) => {
    set({ isLoading: true, syncError: null });
    try {
      const [current, latest, history, dbSettings] = await Promise.all([
        getBodyLogByDate(date),
        getLatestBodyLog(),
        getAllBodyLogs(50),
        getSettings().catch(() => ({} as Record<string, string>)),
      ]);

      let parsedSaved: SavedBodyMeasurements = {};
      if (dbSettings && dbSettings['body_last_measurements']) {
        try {
          parsedSaved = JSON.parse(dbSettings['body_last_measurements']);
        } catch (_) {}
      }

      set({
        currentLog: current,
        latestLog: latest,
        savedMeasurements: parsedSaved,
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
   * 測定値（首・ウエスト・手首・足首など）の永続キャッシュ保存
   */
  saveLastMeasurements: async (measurements: Partial<SavedBodyMeasurements>) => {
    const current = get().savedMeasurements;
    const merged: SavedBodyMeasurements = {
      ...current,
      ...measurements,
    };
    set({ savedMeasurements: merged });
    try {
      await saveSetting('body_last_measurements', JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to save body_last_measurements setting:', e);
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

      // 測定値があれば永続キャッシュにも即時反映
      const toCache: Partial<SavedBodyMeasurements> = {};
      if (log.neck !== undefined && log.neck !== null) toCache.neck = log.neck;
      if (log.waist !== undefined && log.waist !== null) toCache.waist = log.waist;
      if (log.hip !== undefined && log.hip !== null) toCache.hip = log.hip;
      if (log.wrist !== undefined && log.wrist !== null) toCache.wrist = log.wrist;
      if (log.ankle !== undefined && log.ankle !== null) toCache.ankle = log.ankle;
      if (log.height !== undefined && log.height !== null) toCache.height = log.height;

      if (Object.keys(toCache).length > 0) {
        get().saveLastMeasurements(toCache);
      }

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
