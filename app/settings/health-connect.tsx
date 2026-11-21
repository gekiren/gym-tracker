import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '../../src/theme';
import {
  DEFAULT_HEALTH_SYNC_SETTINGS,
  fetchTodayHealthData,
  getHealthPermissionSummary,
  getHealthSyncSettings,
  isHealthDataAvailable,
  openSystemHealthConnectSettings,
  pushRecentDataToHealthConnect,
  READ_PERMISSIONS,
  requestHealthPermissions,
  saveHealthSyncSettings,
  syncHealthData,
  WRITE_PERMISSIONS,
  type DailyHealthData,
  type HealthPermissionSummary,
  type HealthSyncSettings,
  type HealthWriteSummary,
} from '../../src/services/healthService';
import { exportHealthDataToObsidian, getObsidianSettings } from '../../src/services/obsidianService';

const INTERVAL_OPTIONS = [
  { label: '1時間', value: 60 },
  { label: '3時間', value: 180 },
  { label: '6時間', value: 360 },
  { label: '12時間', value: 720 },
  { label: '24時間', value: 1440 },
];

export default function HealthConnectSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [permSummary, setPermSummary] = useState<HealthPermissionSummary>({
    readGranted: 0,
    readTotal: READ_PERMISSIONS.length,
    writeGranted: 0,
    writeTotal: WRITE_PERMISSIONS.length,
    grantedSet: new Set<string>(),
    hasAnyRead: false,
    hasAnyWrite: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<DailyHealthData | null>(null);
  const [lastWriteSummary, setLastWriteSummary] = useState<HealthWriteSummary | null>(null);
  const [obsidianConfigured, setObsidianConfigured] = useState<boolean>(false);
  const [isGuideExpanded, setIsGuideExpanded] = useState<boolean>(false);
  const [syncSettings, setSyncSettings] = useState<HealthSyncSettings>(
    DEFAULT_HEALTH_SYNC_SETTINGS
  );

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    const syncSt = await getHealthSyncSettings();
    setSyncSettings(syncSt);

    if (Platform.OS !== 'android') {
      setIsAvailable(false);
      setIsLoading(false);
      return;
    }

    const available = await isHealthDataAvailable();
    setIsAvailable(available);

    if (available) {
      const summary = await getHealthPermissionSummary();
      setPermSummary(summary);
    }

    const obsSettings = await getObsidianSettings();
    setObsidianConfigured(Boolean(obsSettings.enabled && obsSettings.vaultUri));
    setIsLoading(false);
  };

  const updateBooleanSetting = async (
    key: keyof Pick<
      HealthSyncSettings,
      | 'autoSyncOnLaunch'
      | 'autoSyncPeriodic'
      | 'autoWriteEnabled'
      | 'writeWorkouts'
      | 'writeBody'
      | 'writeNutrition'
      | 'writeHydration'
      | 'importBodyOnSync'
      | 'importHydrationOnSync'
    >,
    value: boolean
  ) => {
    setSyncSettings((prev) => ({ ...prev, [key]: value }));
    await saveHealthSyncSettings({ [key]: value });
  };

  const handleSelectInterval = async (intervalMins: number) => {
    setSyncSettings((prev) => ({ ...prev, periodicIntervalMinutes: intervalMins }));
    await saveHealthSyncSettings({ periodicIntervalMinutes: intervalMins });
  };

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    const granted = await requestHealthPermissions('all');
    const summary = await getHealthPermissionSummary();
    setPermSummary(summary);
    setIsLoading(false);

    if (granted || summary.hasAnyRead || summary.hasAnyWrite) {
      Alert.alert(
        '権限を更新しました',
        `読取: ${summary.readGranted}/${summary.readTotal} 件\n書込: ${summary.writeGranted}/${summary.writeTotal} 件`
      );
    } else {
      Alert.alert(
        '権限が許可されませんでした',
        'AndroidのHealth Connect設定画面から権限を確認・許可してください。'
      );
    }
  };

  const handleBidirectionalSync = async () => {
    setIsSyncing(true);
    try {
      const readRes = await syncHealthData({ force: true, reason: 'manual' });
      if (readRes.data) {
        setHealthData(readRes.data);
      }

      const writeRes = await pushRecentDataToHealthConnect(7);
      setLastWriteSummary(writeRes);

      const syncSt = await getHealthSyncSettings();
      setSyncSettings(syncSt);

      const readMsg = readRes.success
        ? `歩数 ${readRes.data?.steps ?? 0}歩 / 水分取り込み ${readRes.importedHydrationCount ?? 0}件`
        : `読込スキップ: ${readRes.message || '未許可'}`;

      const writeMsg = `筋トレ ${writeRes.workouts}件 / 体組成 ${writeRes.body}件 / 食事 ${writeRes.nutrition}件 / 水分 ${writeRes.hydration}件`;

      Alert.alert('双方向同期完了', `【読み込み】\n${readMsg}\n\n【書き込み（直近7日）】\n${writeMsg}`);
    } catch (e: any) {
      Alert.alert('同期エラー', e?.message || '双方向同期中にエラーが発生しました。');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualReadOnly = async () => {
    setIsSyncing(true);
    try {
      const result = await syncHealthData({ force: true, reason: 'manual' });
      if (result.success && result.data) {
        setHealthData(result.data);
        const syncSt = await getHealthSyncSettings();
        setSyncSettings(syncSt);
        Alert.alert(
          '読み込み完了',
          `歩数: ${result.data.steps}歩\n水分取り込み: ${result.importedHydrationCount ?? 0}件`
        );
      } else {
        Alert.alert('読み込みエラー', result.message || '同期に失敗しました。');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualWriteOnly = async () => {
    setIsSyncing(true);
    try {
      const writeRes = await pushRecentDataToHealthConnect(7);
      setLastWriteSummary(writeRes);
      if (writeRes.errors.length > 0 && writeRes.workouts + writeRes.body + writeRes.nutrition + writeRes.hydration === 0) {
        Alert.alert('書き込みエラー', writeRes.errors.join('\n'));
      } else {
        Alert.alert(
          '書き込み完了（直近7日分）',
          `筋トレ: ${writeRes.workouts}件\n体組成: ${writeRes.body}件\n食事: ${writeRes.nutrition}件\n水分: ${writeRes.hydration}件`
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchAndExport = async (isMock: boolean = false) => {
    setIsSyncing(true);
    try {
      const { data, error } = await fetchTodayHealthData(isMock);

      if (error || !data) {
        Alert.alert('取得エラー', error || 'ヘルスケアデータの取得に失敗しました。');
        return;
      }

      setHealthData(data);

      const obsSettings = await getObsidianSettings();
      if (!obsSettings.enabled || !obsSettings.vaultUri) {
        Alert.alert(
          'ヘルスデータ取得成功',
          `歩数: ${data.steps}歩, 心拍: ${data.averageHeartRate}bpm を取得しました。\n※ Obsidian連携が無効またはVault未設定のためファイル出力はスキップされました。`
        );
        return;
      }

      const success = await exportHealthDataToObsidian(data);
      if (success) {
        Alert.alert(
          '連携完了',
          `Obsidian Vault のデイリーノート (${data.date}) へヘルスデータレポートを正常に書き込みました。`
        );
      } else {
        Alert.alert('エラー', 'Obsidian への書き込みに失敗しました。Vaultのアクセス権限を確認してください。');
      }
    } catch (e: any) {
      Alert.alert('エラー', `処理中にエラーが発生しました: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const renderSwitchRow = (
    title: string,
    subtext: string,
    value: boolean,
    onValueChange: (val: boolean) => void,
    withTopDivider: boolean = true
  ) => (
    <View style={[styles.settingRow, withTopDivider && styles.rowDivider]}>
      <View style={styles.settingTextCol}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtext}>{subtext}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );

  const isAndroid = Platform.OS === 'android';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Connect 連携</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* カード1: 接続ステータス ＆ 権限管理 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart-circle" size={22} color="#30d158" />
            <Text style={styles.cardTitle}>接続ステータス ＆ 権限管理</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
          ) : (
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>プラットフォーム</Text>
                <Text style={styles.statusValue}>
                  {isAndroid ? 'Android (対応)' : 'iOS / Web (非対応)'}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Health Connect SDK</Text>
                <View style={styles.badgeContainer}>
                  <Ionicons
                    name={isAvailable ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={isAvailable ? colors.success : colors.danger}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isAvailable ? colors.success : colors.danger },
                    ]}
                  >
                    {isAvailable ? '利用可能' : '利用不可 / 未インストール'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>読取権限</Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: permSummary.hasAnyRead ? colors.success : '#ff9500' },
                  ]}
                >
                  {permSummary.readGranted} / {permSummary.readTotal} 許可
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>書込権限</Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: permSummary.hasAnyWrite ? colors.success : '#ff9500' },
                  ]}
                >
                  {permSummary.writeGranted} / {permSummary.writeTotal} 許可
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Obsidian Vault</Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: obsidianConfigured ? colors.success : colors.textMuted },
                  ]}
                >
                  {obsidianConfigured ? '設定済み' : '未設定'}
                </Text>
              </View>
            </View>
          )}

          {isAndroid && (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={handleRequestPermissions}
              >
                <Ionicons name="key-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.secondaryActionText}>権限を許可・更新</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionButton, { marginTop: 8 }]}
                onPress={openSystemHealthConnectSettings}
              >
                <Ionicons name="settings-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                  AndroidのHealth Connect設定を開く
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* カード2: 双方向同期設定 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="swap-horizontal" size={22} color={colors.primary} />
            <Text style={styles.cardTitle}>双方向同期設定</Text>
          </View>

          <Text style={styles.sectionLabel}>読み込み（Google Health → TreNote）</Text>
          {renderSwitchRow(
            'アプリ起動時に自動取得',
            '起動時および復帰時に最新データを自動取得',
            syncSettings.autoSyncOnLaunch,
            (v) => updateBooleanSetting('autoSyncOnLaunch', v),
            false
          )}
          {renderSwitchRow(
            '定時にアクセス',
            '指定した間隔で自動同期を実行',
            syncSettings.autoSyncPeriodic,
            (v) => updateBooleanSetting('autoSyncPeriodic', v)
          )}

          {syncSettings.autoSyncPeriodic && (
            <View style={styles.intervalContainer}>
              <Text style={styles.settingSubtext}>定時アクセス間隔:</Text>
              <View style={styles.intervalButtonRow}>
                {INTERVAL_OPTIONS.map((item) => {
                  const active = syncSettings.periodicIntervalMinutes === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.intervalChip, active && styles.intervalChipActive]}
                      onPress={() => handleSelectInterval(item.value)}
                    >
                      <Text style={[styles.intervalChipText, active && styles.intervalChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {renderSwitchRow(
            '同期時に体組成を取り込む',
            '他アプリ由来の体重・体脂肪率・LBMを自動反映',
            syncSettings.importBodyOnSync,
            (v) => updateBooleanSetting('importBodyOnSync', v)
          )}
          {renderSwitchRow(
            '同期時に水分を取り込む',
            '他アプリ由来の水分記録を重複排除して取り込み',
            syncSettings.importHydrationOnSync,
            (v) => updateBooleanSetting('importHydrationOnSync', v)
          )}

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            書き込み（TreNote → Google Health）
          </Text>
          {renderSwitchRow(
            '記録時の自動書き込み',
            'ONにすると各記録の保存時に自動でHealth Connectへ送信',
            syncSettings.autoWriteEnabled,
            (v) => updateBooleanSetting('autoWriteEnabled', v),
            false
          )}

          {syncSettings.autoWriteEnabled && (
            <View style={styles.subToggleGroup}>
              {renderSwitchRow(
                'ワークアウト（筋トレ・有酸素）',
                '終了時にExerciseSessionと消費カロリーを送信',
                syncSettings.writeWorkouts,
                (v) => updateBooleanSetting('writeWorkouts', v),
                false
              )}
              {renderSwitchRow(
                '体組成（体重・体脂肪率・LBM）',
                '体組成ログ保存時に送信',
                syncSettings.writeBody,
                (v) => updateBooleanSetting('writeBody', v)
              )}
              {renderSwitchRow(
                '食事・栄養（カロリー・PFC・塩分）',
                '食事記録の追加・更新・削除を同期',
                syncSettings.writeNutrition,
                (v) => updateBooleanSetting('writeNutrition', v)
              )}
              {renderSwitchRow(
                '水分摂取量',
                '水分ログの追加・削除を同期',
                syncSettings.writeHydration,
                (v) => updateBooleanSetting('writeHydration', v)
              )}
            </View>
          )}

          <View style={styles.lastSyncContainer}>
            <Text style={styles.lastSyncLabel}>最終同期日時:</Text>
            <Text style={styles.lastSyncValue}>
              {syncSettings.lastSyncTimestamp > 0
                ? new Date(syncSettings.lastSyncTimestamp).toLocaleString()
                : '未実施'}
            </Text>
          </View>
        </View>

        {/* カード3: 手動同期アクション ＆ Obsidian出力 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sync-circle" size={22} color={colors.primary} />
            <Text style={styles.cardTitle}>手動同期アクション</Text>
          </View>
          <Text style={styles.description}>
            いつでも双方向同期（読込＋直近7日分の一括書込）または片方向の手動同期を実行できます。
          </Text>

          <TouchableOpacity
            style={[styles.primaryCtaButton, (isSyncing || !isAndroid) && styles.disabledButton]}
            onPress={handleBidirectionalSync}
            disabled={isSyncing || !isAndroid}
          >
            {isSyncing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="sync-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryCtaText}>今すぐ双方向同期（読込＋直近7日分書込）</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dualActionRow}>
            <TouchableOpacity
              style={[styles.halfOutlineButton, (isSyncing || !isAndroid) && styles.disabledButton]}
              onPress={handleManualReadOnly}
              disabled={isSyncing || !isAndroid}
            >
              <Ionicons name="download-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.halfOutlineText}>読み込みのみ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.halfOutlineButton, (isSyncing || !isAndroid) && styles.disabledButton]}
              onPress={handleManualWriteOnly}
              disabled={isSyncing || !isAndroid}
            >
              <Ionicons name="share-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.halfOutlineText}>直近7日分を書込</Text>
            </TouchableOpacity>
          </View>

          {lastWriteSummary && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>直近の書き込み結果</Text>
              <Text style={styles.summaryBody}>
                筋トレ: {lastWriteSummary.workouts}件 / 体組成: {lastWriteSummary.body}件 / 食事:{' '}
                {lastWriteSummary.nutrition}件 / 水分: {lastWriteSummary.hydration}件
              </Text>
              {lastWriteSummary.errors.length > 0 && (
                <Text style={styles.summaryError}>{lastWriteSummary.errors.join('\n')}</Text>
              )}
            </View>
          )}

          <View style={styles.obsidianSection}>
            <Text style={styles.sectionLabel}>Obsidian レポート連携</Text>
            <View style={styles.dualActionRow}>
              <TouchableOpacity
                style={[styles.halfOutlineButton, (isSyncing || !isAndroid) && styles.disabledButton]}
                onPress={() => handleFetchAndExport(false)}
                disabled={isSyncing || !isAndroid}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.halfOutlineText, { color: colors.text }]}>Obsidian送信</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.halfOutlineButton, isSyncing && styles.disabledButton]}
                onPress={() => handleFetchAndExport(true)}
                disabled={isSyncing}
              >
                <Ionicons name="flask-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.halfOutlineText, { color: colors.textMuted }]}>モックテスト</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* カード4: 取得データプレビュー */}
        {healthData && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics" size={22} color={colors.primary} />
              <Text style={styles.cardTitle}>取得データプレビュー ({healthData.date})</Text>
            </View>

            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>{healthData.steps.toLocaleString()}</Text>
                <Text style={styles.gridLabel}>歩数 (歩)</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>
                  {healthData.averageHeartRate} / {healthData.restingHeartRate || '-'}
                </Text>
                <Text style={styles.gridLabel}>平均 / 安静時心拍 (bpm)</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>{healthData.hrvRmssd || '-'} ms</Text>
                <Text style={styles.gridLabel}>心拍変動 (HRV)</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>
                  {Math.floor(healthData.sleepDurationMinutes / 60)}h{' '}
                  {healthData.sleepDurationMinutes % 60}m
                </Text>
                <Text style={styles.gridLabel}>
                  睡眠 (深{healthData.deepSleepMinutes}/浅{healthData.lightSleepMinutes}/REM
                  {healthData.remSleepMinutes}/覚{healthData.awakeMinutes}分)
                </Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>
                  {healthData.weight}kg / {healthData.bodyFatRate}%
                </Text>
                <Text style={styles.gridLabel}>
                  体重 / 体脂肪 (LBM {healthData.leanBodyMassKg || '-'}kg)
                </Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>
                  {healthData.activeCaloriesBurned} / {healthData.totalCaloriesBurned}
                </Text>
                <Text style={styles.gridLabel}>消費kcal (運動 / 合計)</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>
                  {Math.round(healthData.hydrationLiters * 1000)} ml
                </Text>
                <Text style={styles.gridLabel}>水分摂取量</Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={styles.gridValue}>
                  {healthData.bloodOxygenAverage}% / {healthData.vo2Max || '-'}
                </Text>
                <Text style={styles.gridLabel}>血中酸素 / VO2 Max</Text>
              </View>
            </View>

            {healthData.recentExercises && healthData.recentExercises.length > 0 && (
              <View style={styles.exerciseListContainer}>
                <Text style={styles.sectionLabel}>最近の運動セッション</Text>
                {healthData.recentExercises.slice(0, 5).map((ex, idx) => (
                  <View key={`${ex.startTime}_${idx}`} style={styles.exerciseRow}>
                    <Text style={styles.exerciseTitle} numberOfLines={1}>
                      {ex.title || `Exercise (#${ex.exerciseType})`}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {new Date(ex.startTime).toLocaleDateString()} • {ex.durationMinutes}分
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* カード5: Google Health アプリ連携ガイド（折りたたみ） */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.guideHeader}
            onPress={() => setIsGuideExpanded((prev) => !prev)}
            activeOpacity={0.7}
          >
            <View style={styles.guideTitleRow}>
              <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.cardTitle}>Google Health アプリ連携ガイド</Text>
            </View>
            <Ionicons
              name={isGuideExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {isGuideExpanded && (
            <View style={styles.guideBody}>
              <Text style={styles.guideStep}>
                1. Android端末の「設定」→「セキュリティとプライバシー」→「プライバシー管理」→「ヘルスコネクト」を開きます（上の「AndroidのHealth Connect設定を開く」ボタンからも移動できます）。
              </Text>
              <Text style={styles.guideStep}>
                2. 「アプリの権限」から「Google Health」（または Fitbit）を選択し、歩数・睡眠・心拍数・エクササイズ・体重・栄養・水分の「読み取り」と「書き込み」をオンにします。
              </Text>
              <Text style={styles.guideStep}>
                3. 同様に「TreNote」の権限ですべての項目が許可されていることを確認してください。
              </Text>
              <Text style={styles.guideNote}>
                ※ 端末内のヘルスコネクトを経由するため、Google Healthアプリ側で取り込まれたデータは数分後に反映されます。
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 54,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      minWidth: 40,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    content: { padding: 16, paddingBottom: 60 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 8,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 8,
    },
    description: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
      marginBottom: 16,
    },
    statusContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    statusLabel: { fontSize: 13, color: colors.textMuted },
    statusValue: { fontSize: 13, fontWeight: '600', color: colors.text },
    badgeContainer: { flexDirection: 'row', alignItems: 'center' },
    badgeText: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
    buttonGroup: { marginTop: 4 },
    secondaryActionButton: {
      backgroundColor: colors.background,
      borderRadius: 10,
      minHeight: 48,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryActionText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      minHeight: 56,
    },
    rowDivider: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    settingTextCol: {
      flex: 1,
      paddingRight: 12,
    },
    settingTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    settingSubtext: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 16,
    },
    subToggleGroup: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginTop: 4,
    },
    intervalContainer: {
      paddingBottom: 12,
    },
    intervalButtonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
      gap: 8,
    },
    intervalChip: {
      backgroundColor: colors.background,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    intervalChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    intervalChipText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    intervalChipTextActive: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
    lastSyncContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 12,
    },
    lastSyncLabel: { fontSize: 12, color: colors.textMuted },
    lastSyncValue: { fontSize: 12, fontWeight: '600', color: colors.primary },
    primaryCtaButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 10,
    },
    primaryCtaText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
    dualActionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    halfOutlineButton: {
      flex: 1,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      minHeight: 48,
      paddingHorizontal: 10,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    halfOutlineText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    disabledButton: { opacity: 0.5 },
    summaryBox: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    summaryTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.success,
      marginBottom: 4,
    },
    summaryBody: {
      fontSize: 12,
      color: colors.text,
      lineHeight: 18,
    },
    summaryError: {
      fontSize: 12,
      color: colors.danger,
      marginTop: 4,
    },
    obsidianSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    gridItem: {
      width: '48%',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    gridValue: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 4 },
    gridLabel: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
    exerciseListContainer: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    exerciseRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    exerciseTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginRight: 8,
    },
    exerciseMeta: {
      fontSize: 12,
      color: colors.textMuted,
    },
    guideHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 40,
    },
    guideTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    guideBody: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    guideStep: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 20,
    },
    guideNote: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
      marginTop: 4,
    },
  });
