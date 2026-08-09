import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import {
  isHealthDataAvailable,
  hasHealthPermissions,
  requestHealthPermissions,
  fetchTodayHealthData,
  DailyHealthData,
} from '../../src/services/healthService';
import { exportHealthDataToObsidian, getObsidianSettings } from '../../src/services/obsidianService';

export default function HealthConnectSettingsScreen() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<DailyHealthData | null>(null);
  const [obsidianConfigured, setObsidianConfigured] = useState<boolean>(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    if (Platform.OS !== 'android') {
      setIsAvailable(false);
      setHasPermissions(false);
      setIsLoading(false);
      return;
    }

    const available = await isHealthDataAvailable();
    setIsAvailable(available);

    if (available) {
      const permitted = await hasHealthPermissions();
      setHasPermissions(permitted);
    } else {
      setHasPermissions(false);
    }

    const obsSettings = await getObsidianSettings();
    setObsidianConfigured(Boolean(obsSettings.enabled && obsSettings.vaultUri));
    setIsLoading(false);
  };

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    const granted = await requestHealthPermissions();
    setHasPermissions(granted);
    setIsLoading(false);

    if (granted) {
      Alert.alert('成功', 'Health Connect の権限が正常に許可されました。');
    } else {
      Alert.alert('通知', '一部またはすべての権限が許可されませんでした。設定画面等から許可してください。');
    }
  };

  const handleFetchAndExport = async (isMock: boolean = false) => {
    setIsFetching(true);
    try {
      const { data, error } = await fetchTodayHealthData(isMock);

      if (error || !data) {
        Alert.alert('取得エラー', error || 'ヘルスケアデータの取得に失敗しました。');
        setIsFetching(false);
        return;
      }

      setHealthData(data);

      const obsSettings = await getObsidianSettings();
      if (!obsSettings.enabled || !obsSettings.vaultUri) {
        Alert.alert(
          'ヘルスデータ取得成功',
          `歩数: ${data.steps}歩, 心拍: ${data.averageHeartRate}bpm を取得しました。\n※ Obsidian連携が無効またはVault未設定のためファイル出力はスキップされました。`
        );
        setIsFetching(false);
        return;
      }

      const success = await exportHealthDataToObsidian(data);
      if (success) {
        Alert.alert(
          '連携完了',
          `Obsidian Vault のデイリーノート (${data.date}) へヘルスデータレポートを正常に書き込みました！`
        );
      } else {
        Alert.alert('エラー', 'Obsidian への書き込みに失敗しました。Vaultのアクセス権限を確認してください。');
      }
    } catch (e: any) {
      Alert.alert('エラー', `処理中にエラーが発生しました: ${e.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Connect 連携</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart-circle" size={24} color={Theme.colors.primary} />
            <Text style={styles.cardTitle}>ステータス確認</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginVertical: 12 }} color={Theme.colors.primary} />
          ) : (
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>プラットフォーム</Text>
                <Text style={styles.statusValue}>{Platform.OS === 'android' ? 'Android (対応)' : 'iOS (非対応)'}</Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Health Connect SDK</Text>
                <View style={styles.badgeContainer}>
                  <Ionicons
                    name={isAvailable ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={isAvailable ? '#4cd964' : '#ff3b30'}
                  />
                  <Text style={[styles.badgeText, { color: isAvailable ? '#4cd964' : '#ff3b30' }]}>
                    {isAvailable ? '利用可能' : '利用不可 / 未インストール'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>アクセス権限</Text>
                <View style={styles.badgeContainer}>
                  <Ionicons
                    name={hasPermissions ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={hasPermissions ? '#4cd964' : '#ff9500'}
                  />
                  <Text style={[styles.badgeText, { color: hasPermissions ? '#4cd964' : '#ff9500' }]}>
                    {hasPermissions ? '全権限許可済み' : '要許可'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Obsidian Vault 設定</Text>
                <View style={styles.badgeContainer}>
                  <Ionicons
                    name={obsidianConfigured ? 'checkmark-circle' : 'help-circle'}
                    size={16}
                    color={obsidianConfigured ? '#4cd964' : '#ff9500'}
                  />
                  <Text style={[styles.badgeText, { color: obsidianConfigured ? '#4cd964' : '#ff9500' }]}>
                    {obsidianConfigured ? '設定済み' : '未設定'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={[styles.primaryButton, hasPermissions && styles.secondaryButton]}
              onPress={handleRequestPermissions}
            >
              <Ionicons name="key-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>
                {hasPermissions ? '権限を再取得・更新' : 'Health Connect 権限を許可'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sync Action Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sync-circle" size={24} color={Theme.colors.primary} />
            <Text style={styles.cardTitle}>Obsidian デイリーノートへ書き込み</Text>
          </View>
          <Text style={styles.description}>
            Health Connect から今日の歩数・睡眠・心拍数・体組成データを取得し、Obsidian のデイリーノート (`YYYY-MM-DD.md`) に `## 📊 ヘルスデータレポート` セクションとして書き込みます。
          </Text>

          <TouchableOpacity
            style={[styles.syncButton, isFetching && styles.disabledButton]}
            onPress={() => handleFetchAndExport(false)}
            disabled={isFetching || Platform.OS !== 'android'}
          >
            {isFetching ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.syncButtonText}>実データを取得して Obsidian 送信</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mockButton, isFetching && styles.disabledButton]}
            onPress={() => handleFetchAndExport(true)}
            disabled={isFetching}
          >
            <Ionicons name="flask-outline" size={18} color="#4facfe" style={{ marginRight: 8 }} />
            <Text style={styles.mockButtonText}>モックデータで動作テスト送信</Text>
          </TouchableOpacity>
        </View>

        {/* Data Preview Card */}
        {healthData && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics" size={24} color={Theme.colors.primary} />
              <Text style={styles.cardTitle}>取得データプレビュー ({healthData.date})</Text>
            </View>

            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>{healthData.steps}</Text>
                <Text style={styles.gridLabel}>🚶 歩数 (歩)</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>{healthData.averageHeartRate}</Text>
                <Text style={styles.gridLabel}>💓 平均心拍 (bpm)</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>
                  {Math.floor(healthData.sleepDurationMinutes / 60)}h {healthData.sleepDurationMinutes % 60}m
                </Text>
                <Text style={styles.gridLabel}>😴 睡眠時間</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>{healthData.weight} kg</Text>
                <Text style={styles.gridLabel}>⚖️ 体重</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>{healthData.activeCaloriesBurned} kcal</Text>
                <Text style={styles.gridLabel}>🔥 消費カロリー</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>{healthData.bloodOxygenAverage}%</Text>
                <Text style={styles.gridLabel}>🩸 血中酸素</Text>
              </View>
            </View>
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
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: Theme.spacing.md,
  },
  statusContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusLabel: { fontSize: 13, color: Theme.colors.textMuted },
  statusValue: { fontSize: 13, fontWeight: '600', color: Theme.colors.text },
  badgeContainer: { flexDirection: 'row', alignItems: 'center' },
  badgeText: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#3a3a3c',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  syncButton: {
    backgroundColor: '#30d158',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  syncButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  mockButton: {
    backgroundColor: '#1c1c1e',
    borderColor: '#4facfe',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  mockButtonText: { color: '#4facfe', fontSize: 14, fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: Theme.spacing.md,
    marginBottom: 10,
  },
  gridValue: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 2 },
  gridLabel: { fontSize: 12, color: Theme.colors.textMuted },
});
