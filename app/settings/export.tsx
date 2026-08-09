import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  getWorkoutsForDate,
  getWaterLogs,
  getTimeLogs,
  getHabitLogs,
  getWaterGoal,
  getCaffeineLimit,
  getHabitItems,
} from '../../src/db/database';
import { calculateSummary } from '../../src/store/lifelogStore';

const formatTime = (isoString: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch (e) {
    return '';
  }
};

const getTodayDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
};

export default function DataExportScreen() {
  const { t } = useTranslation();
  const [selectedDate] = useState(getTodayDateStr());
  const [loading, setLoading] = useState(false);
  const [exportedContent, setExportedContent] = useState('');

  const loadAndGenerateSummary = async () => {
    setLoading(true);
    try {
      const dbDateStr = selectedDate.replace(/\//g, '-');
      const workouts = await getWorkoutsForDate(selectedDate);
      const waterLogs = await getWaterLogs(dbDateStr);
      const timeLogs = await getTimeLogs(dbDateStr);
      const habitLogs = await getHabitLogs(dbDateStr);
      const waterGoal = await getWaterGoal();
      const caffeineLimit = await getCaffeineLimit();
      const habitItems = await getHabitItems();

      const daySummary = calculateSummary(selectedDate, waterLogs, waterGoal, caffeineLimit, timeLogs, habitItems, habitLogs, []);

      let md = `# TreNote 本日のサマリー - ${selectedDate}\n\n`;

      // 1. Workouts
      md += `## 🏋️ ワークアウト記録\n`;
      if (workouts && workouts.length > 0) {
        workouts.forEach((w: any) => {
          let durationStr = '';
          if (w.start_time && w.end_time) {
            const start = new Date(w.start_time).getTime();
            const end = new Date(w.end_time).getTime();
            const mins = Math.max(1, Math.round((end - start) / 60000));
            durationStr = ` | 時間: ${mins}分`;
          }
          const calStr = w.calories ? ` | 消費カロリー: ${Math.round(w.calories)} kcal` : '';
          md += `### ■ ${w.title} (${formatTime(w.start_time)} 〜 ${formatTime(w.end_time)}${durationStr}${calStr})\n`;
          if (w.notes) {
            md += `全体メモ: "${w.notes}"\n`;
          }
          if (w.exercises && w.exercises.length > 0) {
            w.exercises.forEach((ex: any) => {
              md += `- **${ex.exercise_name}**`;
              if (ex.notes) {
                md += ` (メモ: "${ex.notes}")`;
              }
              md += `\n`;
              if (ex.sets && ex.sets.length > 0) {
                ex.sets.forEach((s: any) => {
                  const weightStr = s.weight !== null ? `${s.weight}kg` : '-';
                  const repsStr = s.reps !== null ? `${s.reps}回` : '-';
                  const rpeStr = s.rpe ? ` (RPE: ${s.rpe})` : '';
                  const stanceStr = s.stance ? ` (スタンス: ${s.stance})` : '';
                  const sideStr = s.side ? ` [${s.side === 'L' ? '左' : '右'}]` : '';
                  const compStr = s.is_completed ? ' [完了]' : ' [未完了]';
                  md += `  - セット ${s.set_number}:${sideStr} ${weightStr} x ${repsStr}${rpeStr}${stanceStr}${compStr}\n`;
                });
              }
            });
          }
          md += `\n`;
        });
      } else {
        md += `本日のワークアウト記録はありません。\n\n`;
      }

      // 2. Water
      md += `## 💧 水分補給\n`;
      if (daySummary?.water) {
        const w = daySummary.water;
        md += `- 総摂取量: ${w.amount} ml / 目標: ${w.goal} ml (${w.percentage}%)\n`;
        md += `- カフェイン量: ${w.caffeine} mg / 上限: ${w.caffeineLimit} mg\n\n`;
      } else {
        md += `- 記録なし\n\n`;
      }

      // 3. 24h Activity
      md += `## ⏱️ 24時間活動管理\n`;
      if (timeLogs && timeLogs.length > 0) {
        const sortedLogs = [...timeLogs].sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
        sortedLogs.forEach((log: any) => {
          md += `- ${log.start_time} 〜 ${log.end_time} | **${log.activity_name}** (${log.duration_minutes}分)\n`;
        });
        const hours = (daySummary?.totalZikanMinutes / 60).toFixed(1);
        md += `- **合計記録時間**: ${hours}時間 (${daySummary?.totalZikanMinutes || 0}分)\n\n`;
      } else {
        md += `本日の活動記録はありません。\n\n`;
      }

      // 4. Habits
      md += `## 🎯 習慣カウンター\n`;
      if (daySummary?.habits && daySummary.habits.length > 0) {
        daySummary.habits.forEach((h: any) => {
          md += `- **${h.name}**: ${h.count} 回\n`;
        });
        md += `\n`;
      } else {
        md += `登録されている習慣はありません。\n\n`;
      }

      setExportedContent(md);
    } catch (e) {
      console.error('Failed to generate summary export:', e);
      Alert.alert('エラー', 'サマリーデータの生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAndGenerateSummary();
  }, [selectedDate]);

  const handleCopyToClipboard = async () => {
    if (!exportedContent) return;
    await Clipboard.setStringAsync(exportedContent);
    Alert.alert('完了', 'Markdownサマリーをクリップボードにコピーしました！');
  };

  const handleShareFile = async () => {
    if (!exportedContent) return;
    try {
      const dateStr = selectedDate.replace(/\//g, '');
      const filePath = FileSystem.cacheDirectory + `trenote_summary_${dateStr}.md`;
      await FileSystem.writeAsStringAsync(filePath, exportedContent, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/markdown',
          dialogTitle: 'Markdownサマリー共有',
          UTI: 'net.daringfireball.markdown',
        });
      } else {
        Alert.alert('エラー', 'この端末では共有機能が利用できません。');
      }
    } catch (e) {
      console.error('Failed to share file:', e);
      Alert.alert('エラー', 'ファイルの共有に失敗しました。');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>日次ログ Markdown 出力</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={22} color="#4caf50" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>本日のサマリー生成</Text>
        </View>

        <Text style={styles.descText}>
          筋トレ記録、水分補給、24時間活動、習慣カウンターのデータを統合した Markdown サマリーを生成・出力します。
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            id="btn-copy-clipboard"
            style={[styles.button, styles.primaryButton]}
            onPress={handleCopyToClipboard}
            disabled={loading || !exportedContent}
          >
            <Ionicons name="copy-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryButtonText}>クリップボードへコピー</Text>
          </TouchableOpacity>

          <TouchableOpacity
            id="btn-share-file"
            style={[styles.button, styles.secondaryButton]}
            onPress={handleShareFile}
            disabled={loading || !exportedContent}
          >
            <Ionicons name="share-outline" size={18} color={Theme.colors.text} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryButtonText}>ファイル共有 (.md)</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>Markdown生成中...</Text>
          </View>
        ) : (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>出力プレビュー</Text>
            <ScrollView style={styles.previewScroll} nestedScrollEnabled>
              <Text style={styles.previewCode}>{exportedContent}</Text>
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: 54,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  content: { padding: Theme.spacing.md, paddingBottom: 60 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, color: Theme.colors.text, fontWeight: 'bold' },
  descText: { fontSize: 13, color: Theme.colors.textMuted, lineHeight: 18, marginBottom: Theme.spacing.md },
  actionRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginBottom: Theme.spacing.lg },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: Theme.borderRadius.md },
  primaryButton: { backgroundColor: '#4caf50' },
  secondaryButton: { backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.border },
  primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  secondaryButtonText: { color: Theme.colors.text, fontWeight: '600', fontSize: 14 },
  loadingBox: { padding: 30, alignItems: 'center' },
  loadingText: { color: Theme.colors.textMuted, marginTop: 8, fontSize: 13 },
  previewCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border, padding: Theme.spacing.md },
  previewTitle: { fontSize: 14, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 8 },
  previewScroll: { maxHeight: 400, backgroundColor: '#111', borderRadius: Theme.borderRadius.sm, padding: Theme.spacing.sm },
  previewCode: { fontFamily: 'monospace', fontSize: 12, color: '#4caf50', lineHeight: 18 },
});
