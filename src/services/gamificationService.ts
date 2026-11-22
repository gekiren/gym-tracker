import { saveSetting } from '../db/database';
import {
  createEmptyFeatureXp,
  createInitialPersistedGamificationState,
  evaluateUnlockableMedals,
  FEATURE_DISPLAY_META,
  GAMIFICATION_FEATURE_IDS,
  getFeatureClassForXp,
  getOverallClassForXp,
  getPromotionBonusBetweenFeature,
  getPromotionBonusBetweenOverall,
  isGamificationFeatureId,
  MEDAL_RARITY_REWARDS,
  normalizeDateKey,
  XP_REWARDS,
} from '../constants/gamificationConstants';
import { FeatureId, useSettingsStore } from '../store/settingsStore';
import { useFeatureUnlockStore } from '../store/featureUnlockStore';
import { GAMIFICATION_SETTING_KEY, useGamificationStore } from '../store/gamificationStore';
import {
  AchievementMedalDef,
  ClassUpEvent,
  GamificationFeatureId,
  GamificationMetrics,
  MedalUnlockNotice,
  PersistedGamificationState,
  RetroactiveSummaryNotice,
  WorkoutGamificationSummary,
  XpHistoryItem,
} from '../types/gamification';
import {
  collectGamificationMetrics,
  getDistinctHabitDaysCount,
  inferHistoricalPrUpdateCount,
} from './gamificationMetricsService';

let pendingMedalCheckTimer: ReturnType<typeof setTimeout> | null = null;
let isEvaluating = false;

function clonePersistedFromStore(): PersistedGamificationState {
  const s = useGamificationStore.getState();
  return {
    totalXp: s.totalXp,
    featureXp: { ...s.featureXp },
    unlockedMedals: { ...s.unlockedMedals },
    prUpdateCount: s.prUpdateCount,
    firstRecordedFeatures: [...s.firstRecordedFeatures],
    dailyXpMap: { ...s.dailyXpMap },
    awardedWorkoutIds: [...s.awardedWorkoutIds],
    recentXpHistory: [...s.recentXpHistory],
    retroactiveMigrated: s.retroactiveMigrated,
  };
}

function pruneDailyXpMap(
  dailyXpMap: Record<string, string[]>,
  keepDateKey?: string
): Record<string, string[]> {
  const keys = Object.keys(dailyXpMap)
    .filter((k) => Array.isArray(dailyXpMap[k]))
    .sort((a, b) => b.localeCompare(a));
  const kept = new Set(keys.slice(0, 120));
  if (keepDateKey && Array.isArray(dailyXpMap[keepDateKey])) {
    kept.add(keepDateKey);
  }
  const pruned: Record<string, string[]> = {};
  for (const k of kept) {
    pruned[k] = dailyXpMap[k];
  }
  return pruned;
}

export function cancelPendingGamificationEvaluation() {
  if (pendingMedalCheckTimer) {
    clearTimeout(pendingMedalCheckTimer);
    pendingMedalCheckTimer = null;
  }
}

function appendHistory(
  history: XpHistoryItem[],
  item: Omit<XpHistoryItem, 'id' | 'timestamp'>
): XpHistoryItem[] {
  const now = Date.now();
  const next: XpHistoryItem = {
    id: `${now}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now,
    ...item,
  };
  return [next, ...history].slice(0, 50);
}

function getWeightUnitSafe(): string {
  try {
    return useSettingsStore.getState().settings.weightUnit || 'kg';
  } catch {
    return 'kg';
  }
}

function parsePersistedState(raw: string | undefined): PersistedGamificationState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const base = createInitialPersistedGamificationState();
    const featureXp = createEmptyFeatureXp();
    for (const fid of GAMIFICATION_FEATURE_IDS) {
      const val = Number(parsed.featureXp?.[fid]);
      featureXp[fid] = Number.isFinite(val) && val > 0 ? Math.floor(val) : 0;
    }
    return {
      totalXp:
        Number.isFinite(Number(parsed.totalXp)) && Number(parsed.totalXp) > 0
          ? Math.floor(Number(parsed.totalXp))
          : base.totalXp,
      featureXp,
      unlockedMedals:
        parsed.unlockedMedals && typeof parsed.unlockedMedals === 'object'
          ? parsed.unlockedMedals
          : {},
      prUpdateCount:
        Number.isFinite(Number(parsed.prUpdateCount)) && Number(parsed.prUpdateCount) > 0
          ? Math.floor(Number(parsed.prUpdateCount))
          : 0,
      firstRecordedFeatures: Array.isArray(parsed.firstRecordedFeatures)
        ? parsed.firstRecordedFeatures
        : [],
      dailyXpMap:
        parsed.dailyXpMap && typeof parsed.dailyXpMap === 'object' ? parsed.dailyXpMap : {},
      awardedWorkoutIds: Array.isArray(parsed.awardedWorkoutIds) ? parsed.awardedWorkoutIds : [],
      recentXpHistory: Array.isArray(parsed.recentXpHistory) ? parsed.recentXpHistory : [],
      retroactiveMigrated: Boolean(parsed.retroactiveMigrated),
    };
  } catch (e) {
    console.warn('[GamificationService] Failed to parse gamification_state_v1:', e);
    return null;
  }
}

/**
 * 既存状態と新しいXP・メトリクスからメダル解除とクラスアップを解決する純粋ロジック
 */
export function resolveMedalsAndClassUps(
  prevState: PersistedGamificationState,
  nextState: PersistedGamificationState,
  metrics: GamificationMetrics,
  options?: { suppressNotices?: boolean }
): {
  finalState: PersistedGamificationState;
  unlockedMedals: AchievementMedalDef[];
  classUpEvent: ClassUpEvent | null;
  medalNotice: MedalUnlockNotice | null;
  totalBonusPoints: number;
} {
  const working: PersistedGamificationState = {
    ...nextState,
    featureXp: { ...nextState.featureXp },
    unlockedMedals: { ...nextState.unlockedMedals },
    recentXpHistory: [...nextState.recentXpHistory],
  };

  const newlyUnlocked = evaluateUnlockableMedals(metrics, working.unlockedMedals);
  let medalBonusXpTotal = 0;
  let medalBonusPointsTotal = 0;
  const now = Date.now();

  for (const medal of newlyUnlocked) {
    working.unlockedMedals[medal.id] = now;
    const reward = MEDAL_RARITY_REWARDS[medal.rarity];
    medalBonusXpTotal += reward.xp;
    medalBonusPointsTotal += reward.points;
    working.totalXp += reward.xp;
    if (medal.featureId) {
      working.featureXp[medal.featureId] = (working.featureXp[medal.featureId] || 0) + reward.xp;
    }
    if (!options?.suppressNotices) {
      working.recentXpHistory = appendHistory(working.recentXpHistory, {
        amount: reward.xp,
        featureId: medal.featureId,
        source: 'medal_unlock',
        label: `メダル獲得: ${medal.titleJa}`,
      });
    }
  }

  // クラス昇格判定（昇格前 vs メダルXP加算後）
  const prevOverall = getOverallClassForXp(prevState.totalXp);
  const nextOverall = getOverallClassForXp(working.totalXp);
  let classUpBonusPoints = 0;

  let overallPromotion: ClassUpEvent['overall'] = undefined;
  if (nextOverall.rankIndex > prevOverall.rankIndex) {
    const pts = getPromotionBonusBetweenOverall(prevOverall.rankIndex, nextOverall.rankIndex);
    classUpBonusPoints += pts;
    overallPromotion = {
      from: prevOverall,
      to: nextOverall,
      bonusPoints: pts,
    };
  }

  const featurePromotions: ClassUpEvent['features'] = [];
  for (const fid of GAMIFICATION_FEATURE_IDS) {
    const prevFeatureCls = getFeatureClassForXp(prevState.featureXp[fid] || 0, fid);
    const nextFeatureCls = getFeatureClassForXp(working.featureXp[fid] || 0, fid);
    if (nextFeatureCls.rankIndex > prevFeatureCls.rankIndex) {
      const pts = getPromotionBonusBetweenFeature(
        prevFeatureCls.rankIndex,
        nextFeatureCls.rankIndex,
        fid
      );
      classUpBonusPoints += pts;
      featurePromotions.push({
        featureId: fid,
        from: prevFeatureCls,
        to: nextFeatureCls,
        bonusPoints: pts,
      });
    }
  }

  const classUpEvent: ClassUpEvent | null =
    overallPromotion || featurePromotions.length > 0
      ? {
          overall: overallPromotion,
          features: featurePromotions,
        }
      : null;

  const medalNotice: MedalUnlockNotice | null =
    newlyUnlocked.length > 0
      ? {
          medals: newlyUnlocked,
          totalBonusXp: medalBonusXpTotal,
          totalBonusPoints: medalBonusPointsTotal,
        }
      : null;

  return {
    finalState: working,
    unlockedMedals: newlyUnlocked,
    classUpEvent: options?.suppressNotices ? null : classUpEvent,
    medalNotice: options?.suppressNotices ? null : medalNotice,
    totalBonusPoints: medalBonusPointsTotal + classUpBonusPoints,
  };
}

/**
 * アプリ起動時のゲーミフィケーション初期化と過去データ遡及計算
 */
export async function initGamificationState(storedSettings: Record<string, string>) {
  const parsed = parsePersistedState(storedSettings[GAMIFICATION_SETTING_KEY]);
  const weightUnit = storedSettings['weight_unit'] || getWeightUnitSafe();

  if (parsed && parsed.retroactiveMigrated) {
    // すでに移行済み：即座にハイドレートし、バックグラウンドで最新メトリクスを同期
    useGamificationStore.getState().hydrateState(parsed, useGamificationStore.getState().metrics);
    refreshGamificationMetrics().catch((e) => {
      console.warn('[GamificationService] Background metrics refresh failed:', e);
    });
    return;
  }

  // 初回または未移行：過去のSQLite記録から遡及計算を実行
  const inferredPrCount = await inferHistoricalPrUpdateCount();
  const metrics = await collectGamificationMetrics(weightUnit, inferredPrCount);
  const habitDays = await getDistinctHabitDaysCount();

  const emptyBase = createInitialPersistedGamificationState();
  const featureXp = createEmptyFeatureXp();
  const firstRecorded: string[] = [];

  // 1. 各機能の過去実績ベースXP
  if (metrics.workoutCount > 0) {
    featureXp.workout =
      metrics.workoutCount * XP_REWARDS.WORKOUT_COMPLETE +
      XP_REWARDS.FIRST_RECORD_BONUS +
      metrics.prUpdateCount * XP_REWARDS.PR_UPDATE_BONUS;
    firstRecorded.push('workout');
  }
  if (metrics.waterDays > 0) {
    featureXp.water = metrics.waterDays * XP_REWARDS.DAILY_RECORD + XP_REWARDS.FIRST_RECORD_BONUS;
    firstRecorded.push('water');
  }
  if (metrics.nutritionDays > 0) {
    featureXp.nutrition =
      metrics.nutritionDays * XP_REWARDS.DAILY_RECORD + XP_REWARDS.FIRST_RECORD_BONUS;
    firstRecorded.push('nutrition');
  }
  if (metrics.bodyDays > 0) {
    featureXp.body = metrics.bodyDays * XP_REWARDS.DAILY_RECORD + XP_REWARDS.FIRST_RECORD_BONUS;
    firstRecorded.push('body');
  }
  if (habitDays > 0) {
    featureXp.habit = habitDays * XP_REWARDS.DAILY_RECORD + XP_REWARDS.FIRST_RECORD_BONUS;
    firstRecorded.push('habit');
  }
  if (metrics.routineDays > 0) {
    featureXp.routine =
      metrics.routineDays * XP_REWARDS.DAILY_RECORD + XP_REWARDS.FIRST_RECORD_BONUS;
    firstRecorded.push('routine');
  }
  if (metrics.zikanDays > 0) {
    featureXp.zikan = metrics.zikanDays * XP_REWARDS.DAILY_RECORD + XP_REWARDS.FIRST_RECORD_BONUS;
    firstRecorded.push('zikan');
  }

  const baseTotalXp = GAMIFICATION_FEATURE_IDS.reduce((sum, fid) => sum + featureXp[fid], 0);
  const preMedalState: PersistedGamificationState = {
    ...emptyBase,
    totalXp: baseTotalXp,
    featureXp,
    prUpdateCount: metrics.prUpdateCount,
    firstRecordedFeatures: firstRecorded,
    retroactiveMigrated: true,
  };

  // 2. メダル＆昇格ボーナス計算（個別通知は抑制し、サマリーモーダル1枚に集約）
  const resolved = resolveMedalsAndClassUps(emptyBase, preMedalState, metrics, {
    suppressNotices: true,
  });

  if (resolved.finalState.totalXp > 0) {
    resolved.finalState.recentXpHistory = appendHistory([], {
      amount: resolved.finalState.totalXp,
      source: 'retroactive',
      label: '過去データからの経験値反映',
    });
  }

  // 3. Pポイント加算
  if (resolved.totalBonusPoints > 0) {
    useFeatureUnlockStore
      .getState()
      .awardPoints(resolved.totalBonusPoints, 'manual_adjustment', '過去実績・クラス反映ボーナス');
  }

  // 4. サマリーモーダル生成（過去実績がある場合のみ）
  const unlockedCount = Object.keys(resolved.finalState.unlockedMedals).length;
  let summaryNotice: RetroactiveSummaryNotice | null = null;
  if (resolved.finalState.totalXp > 0 || unlockedCount > 0) {
    const overallCls = getOverallClassForXp(resolved.finalState.totalXp);
    const featureHighlights = GAMIFICATION_FEATURE_IDS.filter(
      (fid) => resolved.finalState.featureXp[fid] > 0
    ).map((fid) => ({
      featureId: fid,
      classDef: getFeatureClassForXp(resolved.finalState.featureXp[fid], fid),
    }));

    summaryNotice = {
      overallClass: overallCls,
      totalXp: resolved.finalState.totalXp,
      unlockedMedalCount: unlockedCount,
      totalBonusPoints: resolved.totalBonusPoints,
      featureHighlights,
    };
  }

  useGamificationStore.getState().hydrateState(resolved.finalState, metrics, summaryNotice);
  saveSetting(GAMIFICATION_SETTING_KEY, JSON.stringify(resolved.finalState)).catch((e) => {
    console.warn('[GamificationService] Failed to save initial gamification state:', e);
  });
}

/**
 * メトリクスを再集計し、新たに解除可能なメダル・クラスアップを評価・反映する
 */
export async function refreshGamificationMetrics(): Promise<AchievementMedalDef[]> {
  if (isEvaluating) return [];
  isEvaluating = true;
  try {
    const prevState = clonePersistedFromStore();
    const metrics = await collectGamificationMetrics(getWeightUnitSafe(), prevState.prUpdateCount);
    const resolved = resolveMedalsAndClassUps(prevState, prevState, metrics);

    if (resolved.totalBonusPoints > 0) {
      useFeatureUnlockStore
        .getState()
        .awardPoints(resolved.totalBonusPoints, 'manual_adjustment', '実績メダル・クラス昇格ボーナス');
    }

    const hasChanges =
      resolved.unlockedMedals.length > 0 || resolved.classUpEvent !== null;

    if (hasChanges) {
      useGamificationStore.getState().applyPersistedUpdate(resolved.finalState, {
        metrics,
        classUp: resolved.classUpEvent,
        medalNotice: resolved.medalNotice,
      });
    } else {
      useGamificationStore.getState().setMetrics(metrics);
    }

    return resolved.unlockedMedals;
  } finally {
    isEvaluating = false;
  }
}

function scheduleMetricsEvaluation() {
  if (pendingMedalCheckTimer) {
    clearTimeout(pendingMedalCheckTimer);
  }
  pendingMedalCheckTimer = setTimeout(() => {
    pendingMedalCheckTimer = null;
    refreshGamificationMetrics().catch((e) => {
      console.warn('[GamificationService] Scheduled evaluation failed:', e);
    });
  }, 300);
}

/**
 * ライフログ／音声AIの記録時にXPを付与し、メダル・クラスを評価する
 * （ワークアウトは recordWorkoutCompletionGamification で専用処理するためここでは加算しない）
 */
export function recordGamificationFeatureActivity(
  featureId: FeatureId,
  dateStr?: string,
  options?: { forceMedalRefresh?: boolean }
): number {
  if (featureId === 'workout') {
    return 0;
  }

  const prevState = clonePersistedFromStore();
  const dateKey = normalizeDateKey(dateStr);
  const isFirstEver = !prevState.firstRecordedFeatures.includes(featureId);
  const todayFeatures = prevState.dailyXpMap[dateKey] || [];
  const isFirstToday = !todayFeatures.includes(featureId);

  let earnedXp = 0;
  const nextFirst = isFirstEver
    ? [...prevState.firstRecordedFeatures, featureId]
    : prevState.firstRecordedFeatures;
  const nextTodayList = isFirstToday ? [...todayFeatures, featureId] : todayFeatures;
  const nextDailyMap = pruneDailyXpMap(
    {
      ...prevState.dailyXpMap,
      [dateKey]: nextTodayList,
    },
    dateKey
  );

  let nextHistory = [...prevState.recentXpHistory];
  const nextFeatureXp = { ...prevState.featureXp };

  if (isFirstEver) {
    earnedXp += XP_REWARDS.FIRST_RECORD_BONUS;
  }
  if (isFirstToday) {
    earnedXp += XP_REWARDS.DAILY_RECORD;
  }

  if (earnedXp > 0) {
    const nextTotalXp = prevState.totalXp + earnedXp;
    const gamFeatureId = isGamificationFeatureId(featureId) ? featureId : undefined;
    if (gamFeatureId) {
      nextFeatureXp[gamFeatureId] = (nextFeatureXp[gamFeatureId] || 0) + earnedXp;
    }

    const featureTitle = gamFeatureId
      ? FEATURE_DISPLAY_META[gamFeatureId].titleJa
      : '音声AIアシスタント';

    nextHistory = appendHistory(nextHistory, {
      amount: earnedXp,
      featureId: gamFeatureId ?? 'voice_ai',
      source: isFirstEver ? 'first_record' : 'daily_record',
      label: isFirstEver ? `${featureTitle} 初記録XP` : `${featureTitle} デイリー記録XP`,
    });

    const draftState: PersistedGamificationState = {
      ...prevState,
      totalXp: nextTotalXp,
      featureXp: nextFeatureXp,
      firstRecordedFeatures: nextFirst,
      dailyXpMap: nextDailyMap,
      recentXpHistory: nextHistory,
    };

    // XP増加によるクラス昇格を即時評価（メダルは直後の非同期集計で解決）
    const immediateResolved = resolveMedalsAndClassUps(
      prevState,
      draftState,
      useGamificationStore.getState().metrics
    );

    if (immediateResolved.totalBonusPoints > 0) {
      useFeatureUnlockStore
        .getState()
        .awardPoints(
          immediateResolved.totalBonusPoints,
          'manual_adjustment',
          'クラス昇格ボーナス'
        );
    }

    useGamificationStore.getState().applyPersistedUpdate(immediateResolved.finalState, {
      classUp: immediateResolved.classUpEvent,
      medalNotice: immediateResolved.medalNotice,
    });
  }

  if (earnedXp > 0 || options?.forceMedalRefresh) {
    scheduleMetricsEvaluation();
  }

  return earnedXp;
}

/**
 * ワークアウト完了時のXP付与・PRボーナス・メダル・クラス昇格処理（同一workoutIdは冪等）
 */
export async function recordWorkoutCompletionGamification(
  workoutId: number,
  hasPRUpdate: boolean
): Promise<WorkoutGamificationSummary | null> {
  const prevState = clonePersistedFromStore();
  if (prevState.awardedWorkoutIds.includes(workoutId)) {
    return useGamificationStore.getState().lastWorkoutGamification;
  }

  const isFirstEverWorkout = !prevState.firstRecordedFeatures.includes('workout');
  const baseXp = XP_REWARDS.WORKOUT_COMPLETE;
  const firstBonusXp = isFirstEverWorkout ? XP_REWARDS.FIRST_RECORD_BONUS : 0;
  const prBonusXp = hasPRUpdate ? XP_REWARDS.PR_UPDATE_BONUS : 0;
  const xpEarned = baseXp + firstBonusXp + prBonusXp;

  const nextFirst = isFirstEverWorkout
    ? [...prevState.firstRecordedFeatures, 'workout']
    : prevState.firstRecordedFeatures;
  const nextAwardedIds = [...prevState.awardedWorkoutIds, workoutId].slice(-50);
  const nextPrCount = prevState.prUpdateCount + (hasPRUpdate ? 1 : 0);

  let nextHistory = appendHistory(prevState.recentXpHistory, {
    amount: baseXp + firstBonusXp,
    featureId: 'workout',
    source: 'workout_complete',
    label: isFirstEverWorkout ? '初回ワークアウト完了XP' : 'ワークアウト完了XP',
  });
  if (prBonusXp > 0) {
    nextHistory = appendHistory(nextHistory, {
      amount: prBonusXp,
      featureId: 'workout',
      source: 'pr_update',
      label: '自己ベスト（PR）更新ボーナスXP',
    });
  }

  const nextFeatureXp = {
    ...prevState.featureXp,
    workout: (prevState.featureXp.workout || 0) + xpEarned,
  };

  const draftState: PersistedGamificationState = {
    ...prevState,
    totalXp: prevState.totalXp + xpEarned,
    featureXp: nextFeatureXp,
    prUpdateCount: nextPrCount,
    firstRecordedFeatures: nextFirst,
    awardedWorkoutIds: nextAwardedIds,
    recentXpHistory: nextHistory,
  };

  const metrics = await collectGamificationMetrics(getWeightUnitSafe(), nextPrCount);
  const resolved = resolveMedalsAndClassUps(prevState, draftState, metrics);

  if (resolved.totalBonusPoints > 0) {
    useFeatureUnlockStore
      .getState()
      .awardPoints(
        resolved.totalBonusPoints,
        'manual_adjustment',
        '実績メダル・クラス昇格ボーナス'
      );
  }

  const summary: WorkoutGamificationSummary = {
    workoutId,
    xpEarned,
    prBonusXp,
    newlyUnlockedMedals: resolved.unlockedMedals,
    overallClassAfter: getOverallClassForXp(resolved.finalState.totalXp),
    workoutClassAfter: getFeatureClassForXp(resolved.finalState.featureXp.workout, 'workout'),
  };

  useGamificationStore.getState().applyPersistedUpdate(resolved.finalState, {
    metrics,
    classUp: resolved.classUpEvent,
    medalNotice: resolved.medalNotice,
    workoutSummary: summary,
  });

  return summary;
}

/**
 * 開発者メニュー用：任意のXPを加算してクラスアップ演出等をテストする
 */
export function applyDebugXp(amount: number, target: 'overall' | GamificationFeatureId) {
  if (amount <= 0) return;
  const prevState = clonePersistedFromStore();
  const nextFeatureXp = { ...prevState.featureXp };

  if (target !== 'overall') {
    nextFeatureXp[target] = (nextFeatureXp[target] || 0) + amount;
  }

  const targetLabel = target === 'overall' ? '総合' : FEATURE_DISPLAY_META[target].titleJa;
  const nextHistory = appendHistory(prevState.recentXpHistory, {
    amount,
    featureId: target === 'overall' ? undefined : target,
    source: 'manual_debug',
    label: `デバッグ加算 (${targetLabel})`,
  });

  const draftState: PersistedGamificationState = {
    ...prevState,
    totalXp: prevState.totalXp + amount,
    featureXp: nextFeatureXp,
    recentXpHistory: nextHistory,
  };

  const resolved = resolveMedalsAndClassUps(
    prevState,
    draftState,
    useGamificationStore.getState().metrics
  );

  if (resolved.totalBonusPoints > 0) {
    useFeatureUnlockStore
      .getState()
      .awardPoints(resolved.totalBonusPoints, 'manual_adjustment', 'デバッグ昇格ボーナス');
  }

  useGamificationStore.getState().applyPersistedUpdate(resolved.finalState, {
    classUp: resolved.classUpEvent,
    medalNotice: resolved.medalNotice,
  });
}

/**
 * 開発者メニュー用：ゲーミフィケーション状態をリセットして過去データから再集計する
 */
export async function resetAndRecalculateGamification() {
  cancelPendingGamificationEvaluation();
  useGamificationStore.getState().resetAll();
  await saveSetting(GAMIFICATION_SETTING_KEY, '');
  await initGamificationState({
    weight_unit: getWeightUnitSafe(),
  });
}
