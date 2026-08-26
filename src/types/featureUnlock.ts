import { FeatureId } from '../store/settingsStore';

export type PointActionType =
  | 'first_record'      // 各機能の初回記録 (+5P)
  | 'daily_record'      // 各機能のデイリー初回記録 (+1P)
  | 'workout_complete'  // ワークアウト完了 (+2P)
  | 'unlock_feature'    // 機能アンロック (消費)
  | 'ai_voice_use'      // 音声AIアシスタント利用 (消費: 1P)
  | 'ai_coach_use'      // AIコーチ相談・解析 (消費: 1P)
  | 'initial_bonus'     // 初期ボーナス (+5P)
  | 'manual_adjustment';// デバッグ・手動調整

export interface PointHistoryItem {
  id: string;
  type: PointActionType;
  points: number; // プラスは獲得、マイナスは消費
  description: string;
  createdAt: number;
}

export interface FeatureUnlockState {
  pointsBalance: number;
  unlockedFeatures: FeatureId[];
  forceUnlockAll: boolean;
  firstRecordedFeatures: FeatureId[];
  dailyRecordMap: Record<string, FeatureId[]>; // YYYY/MM/DD -> recorded FeatureIds
  hasCompletedInitialSelection: boolean;
  pendingUnlockFeature: FeatureId | null;
  pendingPointNotice: { points: number; title: string; desc?: string } | null;
}
