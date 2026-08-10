import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { AutophagyConfig, MealLog } from '../../src/db/types';

interface Props {
  config: AutophagyConfig;
  lastMealLog: MealLog | null;
  onUpdateConfig: (newConfig: AutophagyConfig) => Promise<void>;
}

export default function AutophagyCard({ config, lastMealLog, onUpdateConfig }: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  // 最終食事時間との自動同期
  useEffect(() => {
    if (config.auto_sync_with_last_meal && lastMealLog && lastMealLog.created_at) {
      const lastMealIso = new Date(lastMealLog.created_at).toISOString();
      if (config.start_time !== lastMealIso) {
        onUpdateConfig({ ...config, start_time: lastMealIso, notified: false });
      }
    }
  }, [lastMealLog?.created_at, config.auto_sync_with_last_meal, config.start_time]);

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
        <Text style={styles.timeText}>{formatHMS(elapsedSeconds)}</Text>
        <Text style={styles.targetText}>/ {config.target_hours}:00:00</Text>
      </View>

      {/* プログレスバー */}
      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPct}%`,
              backgroundColor: isGoalReached ? '#10b981' : '#4facfe',
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

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleStartNow}>
          <Text style={styles.actionBtnText}>🚀 今すぐ絶食開始</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.resetBtn]} onPress={handleReset}>
          <Text style={styles.resetBtnText}>リセット</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardOff: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    opacity: 0.6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#f8fafc' },
  titleOff: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  timerDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginVertical: 8 },
  timeText: { fontSize: 24, fontWeight: '800', color: '#4facfe' },
  targetText: { fontSize: 13, color: '#64748b' },
  progressBg: { height: 8, backgroundColor: '#0f172a', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  statusRow: { marginBottom: 10 },
  statusText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, backgroundColor: '#0f172a', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#4facfe' },
  resetBtn: { flex: 0.4, borderColor: '#334155' },
  resetBtnText: { fontSize: 12, color: '#64748b' },
});
