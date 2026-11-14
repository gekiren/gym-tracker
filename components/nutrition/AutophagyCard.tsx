import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { AutophagyConfig, MealLog } from '../../src/db/types';
import { getMealLogsLast24Hours } from '../../src/db/database';
import { analyzeAutophagyRecommendation, AutophagyAIProposal } from '../../src/services/aiCoachService';
import { getMealDateTime } from '../../src/utils/nutritionUtils';
import AutophagyAiModal from './AutophagyAiModal';

interface Props {
  config: AutophagyConfig;
  lastMealLog: MealLog | null;
  onUpdateConfig: (newConfig: AutophagyConfig) => Promise<void>;
}

export default function AutophagyCard({ config, lastMealLog, onUpdateConfig }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [proposal, setProposal] = useState<AutophagyAIProposal | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // タイマー更新ループ
  useEffect(() => {
    if (!config.enabled || !config.start_time) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const startMs = new Date(config.start_time!).getTime();
      const nowMs = Date.now();
      const diff = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [config.enabled, config.start_time]);

  // 最終食事時間との自動同期（操作時間 created_at ではなく実際の記録時間 meal_time / date を基準）
  const lastMealTimestamp = lastMealLog ? getMealDateTime(lastMealLog).getTime() : null;

  useEffect(() => {
    if (config.auto_sync_with_last_meal && lastMealLog) {
      const mealDateTime = getMealDateTime(lastMealLog);
      const lastMealIso = mealDateTime.toISOString();
      if (config.start_time !== lastMealIso) {
        onUpdateConfig({ ...config, start_time: lastMealIso, notified: false });
      }
    }
  }, [lastMealTimestamp, config.auto_sync_with_last_meal, config.start_time]);

  // 開始時刻（最終食事時刻）の表示用フォーマット
  const startTimeLabel = useMemo(() => {
    if (!config.start_time) return '';
    try {
      const d = new Date(config.start_time);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isSameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      if (isSameDay) {
        return timeStr;
      }
      return `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`;
    } catch {
      return '';
    }
  }, [config.start_time]);

  const targetSeconds = (config.target_hours || 16) * 3600;
  const progressPct = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));
  const isGoalReached = elapsedSeconds >= targetSeconds;

  const formatHMS = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleToggleEnable = (enabled: boolean) => {
    onUpdateConfig({ ...config, enabled });
  };

  const handleStartNow = () => {
    onUpdateConfig({
      ...config,
      start_time: new Date().toISOString(),
      notified: false,
    });
  };

  const handleReset = () => {
    onUpdateConfig({
      ...config,
      start_time: undefined,
      notified: false,
    });
  };

  // AIによるオートファジー時間の解析・提案
  const handleAnalyzeAi = async () => {
    try {
      setIsAnalyzing(true);
      const logs = await getMealLogsLast24Hours();
      if (!logs || logs.length === 0) {
        Alert.alert(
          '食事ログがありません',
          '直近24時間の食事ログが見つかりませんでした。まずは本日の食事を記録してから解析を行ってください。'
        );
        return;
      }

      const result = await analyzeAutophagyRecommendation(logs);
      setProposal(result);
      setShowAiModal(true);
    } catch (err: any) {
      console.error('Autophagy AI analysis failed:', err);
      Alert.alert(
        '解析エラー',
        err?.message || 'AIによる解析処理に失敗しました。通信状況を確認して再度お試しください。'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyTargetHours = (hours: number) => {
    onUpdateConfig({
      ...config,
      target_hours: hours,
    });
  };

  if (!config.enabled) {
    return (
      <View style={styles.cardOff}>
        <View style={styles.header}>
          <Text style={styles.titleOff}>⏳ オートファジー絶食タイマー</Text>
          <Switch value={false} onValueChange={handleToggleEnable} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>⏳ オートファジー ({config.target_hours}h絶食)</Text>
        <Switch value={config.enabled} onValueChange={handleToggleEnable} />
      </View>

      <View style={styles.timerDisplay}>
        <View style={styles.timerLeft}>
          <Text style={styles.timeText}>{formatHMS(elapsedSeconds)}</Text>
          <Text style={styles.targetText}>/ {config.target_hours}:00:00</Text>
        </View>
        {startTimeLabel ? (
          <View style={styles.startTimeBadge}>
            <Text style={styles.startTimeBadgeText}>🍽️ 最終食事 {startTimeLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* プログレスバー */}
      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPct}%`,
              backgroundColor: isGoalReached ? '#10b981' : colors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusText}>
          {isGoalReached
            ? '🎉 絶食目標時間を達成しました！'
            : `残り ${formatHMS(Math.max(0, targetSeconds - elapsedSeconds))}`}
        </Text>
      </View>

      {/* AI絶食時間最適化ボタン */}
      <TouchableOpacity
        style={styles.aiOptimizeBtn}
        onPress={handleAnalyzeAi}
        disabled={isAnalyzing}
        activeOpacity={0.8}
      >
        {isAnalyzing ? (
          <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
        ) : (
          <Ionicons name="sparkles" size={15} color="#ffffff" style={{ marginRight: 6 }} />
        )}
        <Text style={styles.aiOptimizeBtnText}>
          {isAnalyzing ? '直近24時間の食事をAI解析中...' : '✨ オートファジー時間最適化'}
        </Text>
      </TouchableOpacity>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleStartNow}>
          <Text style={styles.actionBtnText}>🚀 今すぐ絶食開始</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.resetBtn]} onPress={handleReset}>
          <Text style={styles.resetBtnText}>リセット</Text>
        </TouchableOpacity>
      </View>

      {/* AI結果提案モーダル */}
      <AutophagyAiModal
        visible={showAiModal}
        proposal={proposal}
        onClose={() => setShowAiModal(false)}
        onApplyTargetHours={handleApplyTargetHours}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardOff: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  titleOff: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  timerDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  timerLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  timeText: { fontSize: 24, fontWeight: '800', color: colors.primary },
  targetText: { fontSize: 13, color: colors.textMuted },
  startTimeBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  startTimeBadgeText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  progressBg: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  statusRow: { marginBottom: 10 },
  statusText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  aiOptimizeBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  aiOptimizeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  resetBtn: { flex: 0.4, borderColor: colors.border },
  resetBtnText: { fontSize: 12, color: colors.textMuted },
});
