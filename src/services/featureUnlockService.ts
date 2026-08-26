import { getDB } from '../db/connection';
import { FeatureId } from '../store/settingsStore';
import { useFeatureUnlockStore } from '../store/featureUnlockStore';
import { ALL_FEATURE_IDS, POINT_REWARDS } from '../constants/featureUnlockConstants';
import { saveSetting } from '../db/database';

/**
 * アプリ起動時の機能開放・Pポイント初期化とレトロアクティブ計算
 */
export async function initFeatureUnlockState(storedSettings: Record<string, string>) {
  const conn = getDB();

  // 1. 保存済み設定の読み込み
  const pointsBalanceStr = storedSettings['p_points_balance'];
  const unlockedFeaturesStr = storedSettings['unlocked_features'];
  const forceUnlockAllStr = storedSettings['force_unlock_all_features'];
  const firstRecordedStr = storedSettings['first_recorded_features'];
  const dailyRecordMapStr = storedSettings['daily_record_map'];
  const hasCompletedSelectionStr = storedSettings['has_completed_initial_feature_selection'];

  let pointsBalance = pointsBalanceStr ? parseInt(pointsBalanceStr, 10) : POINT_REWARDS.INITIAL_BONUS;
  if (isNaN(pointsBalance) || pointsBalance < 0) pointsBalance = POINT_REWARDS.INITIAL_BONUS;

  let unlockedFeatures: FeatureId[] = ['workout', 'water'];
  let hasCompletedInitialSelection = hasCompletedSelectionStr === 'true';

  if (unlockedFeaturesStr) {
    try {
      unlockedFeatures = JSON.parse(unlockedFeaturesStr);
    } catch (e) {
      console.warn('Failed to parse unlocked_features', e);
    }
  }

  const forceUnlockAll = forceUnlockAllStr === 'true';

  let firstRecordedFeatures: FeatureId[] = [];
  if (firstRecordedStr) {
    try {
      firstRecordedFeatures = JSON.parse(firstRecordedStr);
    } catch (e) {
      console.warn('Failed to parse first_recorded_features', e);
    }
  }

  let dailyRecordMap: Record<string, FeatureId[]> = {};
  if (dailyRecordMapStr) {
    try {
      dailyRecordMap = JSON.parse(dailyRecordMapStr);
    } catch (e) {
      console.warn('Failed to parse daily_record_map', e);
    }
  }

  // 2. 既存ユーザーへのレトロアクティブ計算（初回起動時に過去データがある場合）
  const isMigrated = storedSettings['p_points_retroactive_migrated'] === '1';
  if (!isMigrated) {
    try {
      const detectedFeatures: FeatureId[] = [];
      let calculatedPoints = pointsBalance;

      // 過去ワークアウト件数
      const workoutCountRow = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM workouts'
      );
      const workoutCount = workoutCountRow?.count ?? 0;
      if (workoutCount > 0) {
        detectedFeatures.push('workout');
        calculatedPoints += Math.min(workoutCount * POINT_REWARDS.WORKOUT_COMPLETE, 50);
      }

      // 過去水分ログ件数
      const waterCountRow = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM water_logs'
      );
      if ((waterCountRow?.count ?? 0) > 0) {
        detectedFeatures.push('water');
      }

      // 過去食事ログ件数
      const mealCountRow = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM meal_logs'
      );
      if ((mealCountRow?.count ?? 0) > 0) {
        detectedFeatures.push('nutrition');
      }

      // 過去体組成ログ件数
      const bodyCountRow = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM body_composition_logs'
      );
      if ((bodyCountRow?.count ?? 0) > 0) {
        detectedFeatures.push('body');
      }

      // 過去習慣ログ件数
      const habitCountRow = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM habit_logs'
      );
      if ((habitCountRow?.count ?? 0) > 0) {
        detectedFeatures.push('habit');
      }

      // 過去ルーティン完了件数
      const routineCountRow = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM routine_completion_logs'
      );
      if ((routineCountRow?.count ?? 0) > 0) {
        detectedFeatures.push('routine');
      }

      // 過去24時間ログ件数
      const zikanCountRow = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM zikan_logs'
      );
      if ((zikanCountRow?.count ?? 0) > 0) {
        detectedFeatures.push('zikan');
      }

      // 過去に記録がある機能は自動アンロック＆初回記録済みに設定
      if (detectedFeatures.length > 0) {
        unlockedFeatures = Array.from(new Set([...unlockedFeatures, ...detectedFeatures]));
        firstRecordedFeatures = Array.from(new Set([...firstRecordedFeatures, ...detectedFeatures]));
        hasCompletedInitialSelection = true;
        pointsBalance = Math.max(pointsBalance, calculatedPoints);

        await saveSetting('unlocked_features', JSON.stringify(unlockedFeatures));
        await saveSetting('first_recorded_features', JSON.stringify(firstRecordedFeatures));
        await saveSetting('has_completed_initial_feature_selection', 'true');
        await saveSetting('p_points_balance', String(pointsBalance));
      }

      await saveSetting('p_points_retroactive_migrated', '1');
    } catch (migErr) {
      console.warn('Retroactive point migration skipped/failed:', migErr);
    }
  }

  // 3. Zustandストアへ初期状態を反映
  useFeatureUnlockStore.getState().initializeStore({
    pointsBalance,
    unlockedFeatures,
    forceUnlockAll,
    firstRecordedFeatures,
    dailyRecordMap,
    hasCompletedInitialSelection,
  });

  return {
    pointsBalance,
    unlockedFeatures,
    hasCompletedInitialSelection,
  };
}

/**
 * ログ記録時のPポイント付与ヘルパー
 */
export function recordFeatureAction(featureId: FeatureId, dateStr?: string) {
  const targetDate = dateStr || getTodayDateStr();
  return useFeatureUnlockStore.getState().markFeatureRecorded(featureId, targetDate);
}

/**
 * ワークアウト完了時のPポイント付与ヘルパー (+2P)
 */
export function awardWorkoutCompletionPoints() {
  const store = useFeatureUnlockStore.getState();
  const reward = POINT_REWARDS.WORKOUT_COMPLETE;
  store.awardPoints(reward, 'workout_complete', 'ワークアウト完了');
  store.showPointNotice(reward, 'ワークアウト完了！', `トレーニング完了ボーナス (+${reward}P)`);
}

/**
 * 今日の日付文字列取得 (YYYY/MM/DD)
 */
function getTodayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}
