import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import {
  getObsidianSettings,
  saveObsidianSettings,
  requestVaultDirectoryPermission,
  exportAllDataToObsidian,
  syncLifelogToObsidian,
  ObsidianSettings,
  ObsidianExportMode
} from '../../src/services/obsidianService';

interface ObsidianSectionProps {
  t: (key: string, options?: any) => string;
}

export const ObsidianSection: React.FC<ObsidianSectionProps> = ({ t }) => {
  const [settings, setSettings] = useState<ObsidianSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const data = await getObsidianSettings();
    setSettings(data);
    setIsLoading(false);
  };

  const handleToggleEnabled = async (val: boolean) => {
    if (!settings) return;
    if (val && !settings.vaultUri) {
      // フォルダ未選択の場合は許可をリクエスト
      const uri = await requestVaultDirectoryPermission();
      if (!uri) {
        Alert.alert('情報', 'Obsidian Vault フォルダが選択されなかったため、連携は無効のままです。');
        return;
      }
    }
    const updated = { ...settings, enabled: val };
    setSettings(updated);
    await saveObsidianSettings({ enabled: val });
  };

  const handleSelectFolder = async () => {
    const uri = await requestVaultDirectoryPermission();
    if (uri) {
      const updated = { ...settings!, vaultUri: uri, enabled: true };
      setSettings(updated);
      Alert.alert('設定完了', 'Obsidian Vault フォルダが正常に設定されました。');
    }
  };

  const handleChangeMode = async (mode: ObsidianExportMode) => {
    if (!settings) return;
    const updated = { ...settings, exportMode: mode };
    setSettings(updated);
    await saveObsidianSettings({ exportMode: mode });
  };

  const handleToggleSyncOnLaunch = async (val: boolean) => {
    if (!settings) return;
    const updated = { ...settings, syncOnLaunch: val };
    setSettings(updated);
    await saveObsidianSettings({ syncOnLaunch: val });
  };

  const handleUpdateScheduleTime = async (val: string) => {
    if (!settings) return;
    const updated = { ...settings, scheduleTime: val };
    setSettings(updated);
    await saveObsidianSettings({ scheduleTime: val });
  };

  const handleToggleExportItem = async (
    itemKey: 'exportWorkouts' | 'exportExercises' | 'exportWater' | 'exportTime' | 'exportHabits' | 'exportRoutines' | 'exportHealth',
    val: boolean
  ) => {
    if (!settings) return;
    const updated = { ...settings, [itemKey]: val };
    setSettings(updated);
    await saveObsidianSettings({ [itemKey]: val });
  };

  const handleUpdateFolder = async (
    folderKey: 'folderWorkouts' | 'folderExercises' | 'folderWater' | 'folderTime' | 'folderHabits' | 'folderRoutines' | 'folderDaily' | 'folderHealth',
    val: string
  ) => {
    if (!settings) return;
    const updated = { ...settings, [folderKey]: val };
    setSettings(updated);
    await saveObsidianSettings({ [folderKey]: val });
  };

  const handleManualSyncNow = async () => {
    if (!settings || !settings.vaultUri) {
      Alert.alert('エラー', 'Obsidian Vault フォルダを選択してください。');
      return;
    }
    setIsExporting(true);
    try {
      const success = await syncLifelogToObsidian(true);
      if (success) {
        Alert.alert('完了', '本日のログを Obsidian Vault へ正常に同期しました！');
      } else {
        Alert.alert('情報', '本日同期する新しいログがありませんでした。');
      }
    } catch (e: any) {
      Alert.alert('エラー', '同期中にエラーが発生しました: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    if (!settings || !settings.vaultUri) {
      Alert.alert('エラー', 'Obsidian Vault フォルダを選択してください。');
      return;
    }

    Alert.alert(
      '一括エクスポート確認',
      'これまでのすべての筋トレログ、種目ノート、ライフログ、ルーティンを Obsidian Vault へエクスポートします。実行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '実行する',
          onPress: async () => {
            setIsExporting(true);
            try {
              const res = await exportAllDataToObsidian();
              const d = res.details;
              const msg =
                `一括エクスポートが完了しました！\n\n` +
                `【出力フォルダ別内訳】\n` +
                `📅 デイリー (${settings.folderDaily}): ${d.dailyCount}件\n` +
                `🏋️ 筋トレ (${settings.folderWorkouts}): ${d.workoutsCount}件\n` +
                `💪 種目 (${settings.folderExercises}): ${d.exercisesCount}件\n` +
                `💧 水分 (${settings.folderWater}): ${d.waterCount}件\n` +
                `⏱ 時間 (${settings.folderTime}): ${d.timeCount}件\n` +
                `✅ 習慣 (${settings.folderHabits}): ${d.habitsCount}件\n` +
                `🔄 ルーティン (${settings.folderRoutines}): ${d.routinesCount}件\n` +
                `📊 ヘルス (${settings.folderHealth})\n\n` +
                `総出力ファイル数: ${res.successCount}件` +
                (res.failCount > 0 ? ` (失敗: ${res.failCount}件)` : '');
              Alert.alert('完了', msg);
            } catch (e: any) {
              Alert.alert('エラー', e.message);
            } finally {
              setIsExporting(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading || !settings) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={Theme.colors.primary} />
      </View>
    );
  }

  const decodeUriName = (uri: string) => {
    if (!uri) return '未設定';
    try {
      const decoded = decodeURIComponent(uri);
      const parts = decoded.split(':');
      return parts[parts.length - 1] || '選択済みフォルダ';
    } catch (_) {
      return '選択済みフォルダ';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={22} color={Theme.colors.primary} />
          <Text style={styles.cardTitle}>Obsidian 自動連携・蓄積</Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={handleToggleEnabled}
          trackColor={{ false: '#3a3a3c', true: Theme.colors.primary }}
          thumbColor="#ffffff"
        />
      </View>

      <Text style={styles.description}>
        筋トレや水分、時間管理などのログを、お使いの Obsidian Vault に Markdown ノートとして自動連携・蓄積します。
      </Text>

      {/* Vault Directory Selector */}
      <TouchableOpacity style={styles.folderButton} onPress={handleSelectFolder}>
        <View style={styles.folderInfo}>
          <Ionicons name="folder-open-outline" size={20} color={Theme.colors.textMuted} />
          <View style={styles.folderTextContainer}>
            <Text style={styles.folderLabel}>保存先 Obsidian Vault (ルート)</Text>
            <Text style={styles.folderValue} numberOfLines={1}>
              {decodeUriName(settings.vaultUri)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
      </TouchableOpacity>

      {/* Health Connect Button */}
      <TouchableOpacity
        style={[styles.folderButton, { marginTop: 10, borderColor: '#30d158' }]}
        onPress={() => router.push('/settings/health-connect')}
      >
        <View style={styles.folderInfo}>
          <Ionicons name="heart-circle-outline" size={22} color="#30d158" />
          <View style={styles.folderTextContainer}>
            <Text style={styles.folderLabel}>Health Connect 連携設定</Text>
            <Text style={styles.folderValue} numberOfLines={1}>
              歩数・睡眠・心拍・体組成の権限確認 ＆ 送信
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
      </TouchableOpacity>

      {settings.enabled && (
        <View style={styles.settingsSection}>
          {/* Mode Selector */}
          <Text style={styles.subTitle}>連携ノート形式</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[styles.modeButton, settings.exportMode === 'dedicated' && styles.modeButtonActive]}
              onPress={() => handleChangeMode('dedicated')}
            >
              <Text style={[styles.modeText, settings.exportMode === 'dedicated' && styles.modeTextActive]}>
                専用デイリー
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, settings.exportMode === 'append' && styles.modeButtonActive]}
              onPress={() => handleChangeMode('append')}
            >
              <Text style={[styles.modeText, settings.exportMode === 'append' && styles.modeTextActive]}>
                既存ノート末尾追記
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sync Triggers */}
          <Text style={styles.subTitle}>ライフログの同期タイミング</Text>
          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>アプリ起動時に同期</Text>
            <Switch
              value={settings.syncOnLaunch}
              onValueChange={handleToggleSyncOnLaunch}
              trackColor={{ false: '#3a3a3c', true: Theme.colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>定刻スケジュール指定</Text>
            <TextInput
              style={styles.timeInput}
              value={settings.scheduleTime}
              onChangeText={handleUpdateScheduleTime}
              placeholder="22:00"
              placeholderTextColor="#666"
              maxLength={5}
            />
          </View>

          {/* Target Data Items */}
          <Text style={styles.subTitle}>同期対象データ</Text>
          <View style={styles.chipContainer}>
            <TouchableOpacity
              style={[styles.chip, settings.exportWorkouts && styles.chipActive]}
              onPress={() => handleToggleExportItem('exportWorkouts', !settings.exportWorkouts)}
            >
              <Text style={[styles.chipText, settings.exportWorkouts && styles.chipTextActive]}>🏋️ 筋トレ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, settings.exportExercises && styles.chipActive]}
              onPress={() => handleToggleExportItem('exportExercises', !settings.exportExercises)}
            >
              <Text style={[styles.chipText, settings.exportExercises && styles.chipTextActive]}>💪 種目</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, settings.exportWater && styles.chipActive]}
              onPress={() => handleToggleExportItem('exportWater', !settings.exportWater)}
            >
              <Text style={[styles.chipText, settings.exportWater && styles.chipTextActive]}>💧 水分</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, settings.exportTime && styles.chipActive]}
              onPress={() => handleToggleExportItem('exportTime', !settings.exportTime)}
            >
              <Text style={[styles.chipText, settings.exportTime && styles.chipTextActive]}>⏱ 時間管理</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, settings.exportHabits && styles.chipActive]}
              onPress={() => handleToggleExportItem('exportHabits', !settings.exportHabits)}
            >
              <Text style={[styles.chipText, settings.exportHabits && styles.chipTextActive]}>✅ 習慣</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, settings.exportRoutines && styles.chipActive]}
              onPress={() => handleToggleExportItem('exportRoutines', !settings.exportRoutines)}
            >
              <Text style={[styles.chipText, settings.exportRoutines && styles.chipTextActive]}>🔄 ルーティン</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, settings.exportHealth && styles.chipActive]}
              onPress={() => handleToggleExportItem('exportHealth', !settings.exportHealth)}
            >
              <Text style={[styles.chipText, settings.exportHealth && styles.chipTextActive]}>📊 ヘルス</Text>
            </TouchableOpacity>
          </View>

          {/* Category Custom Folder Paths */}
          <TouchableOpacity
            style={styles.folderSectionHeader}
            onPress={() => setIsFoldersExpanded(!isFoldersExpanded)}
          >
            <View style={styles.folderHeaderLeft}>
              <Ionicons name="folder-outline" size={16} color={Theme.colors.primary} />
              <Text style={styles.folderHeaderTitle}>カテゴリ別保存先フォルダ設定</Text>
            </View>
            <Ionicons name={isFoldersExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          {isFoldersExpanded && (
            <View style={styles.folderInputsContainer}>
              <View style={styles.folderInputRow}>
                <Text style={styles.folderInputLabel}>📅 デイリーノート</Text>
                <TextInput
                  style={styles.folderTextInput}
                  value={settings.folderDaily}
                  onChangeText={(val) => handleUpdateFolder('folderDaily', val)}
                  placeholder="Daily"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.folderInputRow}>
                <Text style={styles.folderInputLabel}>🏋️ 筋トレ（ワークアウト）</Text>
                <TextInput
                  style={styles.folderTextInput}
                  value={settings.folderWorkouts}
                  onChangeText={(val) => handleUpdateFolder('folderWorkouts', val)}
                  placeholder="Workouts"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.folderInputRow}>
                <Text style={styles.folderInputLabel}>💪 筋トレ（種目）</Text>
                <TextInput
                  style={styles.folderTextInput}
                  value={settings.folderExercises}
                  onChangeText={(val) => handleUpdateFolder('folderExercises', val)}
                  placeholder="Exercises"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.folderInputRow}>
                <Text style={styles.folderInputLabel}>💧 水分補給</Text>
                <TextInput
                  style={styles.folderTextInput}
                  value={settings.folderWater}
                  onChangeText={(val) => handleUpdateFolder('folderWater', val)}
                  placeholder="Water"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.folderInputRow}>
                <Text style={styles.folderInputLabel}>⏱ 時間管理</Text>
                <TextInput
                  style={styles.folderTextInput}
                  value={settings.folderTime}
                  onChangeText={(val) => handleUpdateFolder('folderTime', val)}
                  placeholder="Time"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.folderInputRow}>
                <Text style={styles.folderInputLabel}>✅ 習慣</Text>
                <TextInput
                  style={styles.folderTextInput}
                  value={settings.folderHabits}
                  onChangeText={(val) => handleUpdateFolder('folderHabits', val)}
                  placeholder="Habits"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.folderInputRow}>
                <Text style={styles.folderInputLabel}>🔄 ルーティン</Text>
                <TextInput
                  style={styles.folderTextInput}
                  value={settings.folderRoutines}
                  onChangeText={(val) => handleUpdateFolder('folderRoutines', val)}
                  placeholder="Routines"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.folderInputRow}>
                <Text style={styles.folderInputLabel}>📊 ヘルスケア</Text>
                <TextInput
                  style={styles.folderTextInput}
                  value={settings.folderHealth}
                  onChangeText={(val) => handleUpdateFolder('folderHealth', val)}
                  placeholder="Health"
                  placeholderTextColor="#666"
                />
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.syncNowButton]}
              onPress={handleManualSyncNow}
              disabled={isExporting}
            >
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>今すぐ同期</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.exportAllButton]}
              onPress={handleExportAll}
              disabled={isExporting}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>全ログ過去一括出力</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  description: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginBottom: Theme.spacing.sm,
    lineHeight: 18,
  },
  folderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
  },
  folderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  folderTextContainer: {
    flex: 1,
  },
  folderLabel: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  folderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginTop: 2,
  },
  settingsSection: {
    marginTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: Theme.spacing.sm,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: Theme.colors.primary,
  },
  modeText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 14,
    color: Theme.colors.text,
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: Theme.colors.text,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 70,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: Theme.colors.primary,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  chipTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
    gap: 6,
  },
  syncNowButton: {
    backgroundColor: '#3b82f6',
  },
  exportAllButton: {
    backgroundColor: Theme.colors.primary,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  folderSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
    paddingVertical: 4,
  },
  folderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folderHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  folderInputsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    gap: 8,
    marginTop: 4,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  folderInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  folderInputLabel: {
    fontSize: 12,
    color: Theme.colors.text,
    flex: 1,
  },
  folderTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: Theme.colors.text,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 13,
    width: 140,
  },
});
