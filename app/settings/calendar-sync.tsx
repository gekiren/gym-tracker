import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import * as Calendar from 'expo-calendar';
import {
  CalendarSyncSettings,
  DEFAULT_CALENDAR_SYNC_SETTINGS,
  getCalendarSyncSettings,
  saveCalendarSyncSettings,
  isCalendarAvailable,
  checkCalendarPermissions,
  requestCalendarPermissions,
  getDeviceCalendars,
  importGoogleCalendarPlans,
  exportLogsToGoogleCalendar,
} from '../../src/services/calendarService';

export default function CalendarSyncScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [settings, setSettings] = useState<CalendarSyncSettings>(DEFAULT_CALENDAR_SYNC_SETTINGS);
  const [deviceCalendars, setDeviceCalendars] = useState<Calendar.Calendar[]>([]);

  // 設定およびカレンダー情報の初期読み込み
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const available = await isCalendarAvailable();
      setNativeAvailable(available);

      const savedSettings = await getCalendarSyncSettings();
      setSettings(savedSettings);

      if (available) {
        const perm = await checkCalendarPermissions();
        setHasPermission(perm);
        if (perm) {
          const cals = await getDeviceCalendars();
          setDeviceCalendars(cals);
        }
      }
    } catch (e) {
      console.warn('[CalendarSyncScreen] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 設定の更新
  const updateSetting = async <K extends keyof CalendarSyncSettings>(
    key: K,
    value: CalendarSyncSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveCalendarSyncSettings(updated);
  };

  // メインスイッチの切り替え（権限リクエストを含む）
  const handleToggleMainSwitch = async (val: boolean) => {
    if (val && !hasPermission) {
      const granted = await requestCalendarPermissions();
      if (!granted) {
        Alert.alert(
          'カレンダー権限が必要です',
          'Googleカレンダーとの双方向連動を行うには、端末のカレンダーへのアクセスを許可してください。',
          [{ text: 'OK' }]
        );
        return;
      }
      setHasPermission(true);
      const cals = await getDeviceCalendars();
      setDeviceCalendars(cals);
    }
    await updateSetting('enabled', val);
  };

  // 即時手動同期の実行
  const handleRunFullSync = async () => {
    if (!nativeAvailable) {
      Alert.alert(
        'ネイティブ機能未対応',
        'カレンダー連携機能は、次回のアプリネイティブビルド（AAB/APK）更新後に有効になります。',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!hasPermission) {
      const granted = await requestCalendarPermissions();
      if (!granted) {
        Alert.alert('権限エラー', 'カレンダーへのアクセス権限がありません。');
        return;
      }
      setHasPermission(true);
    }

    try {
      setSyncing(true);
      const importRes = await importGoogleCalendarPlans();
      const exportRes = await exportLogsToGoogleCalendar();

      // 最新設定を再読み込み（最終同期日時の反映）
      const updatedSettings = await getCalendarSyncSettings();
      setSettings(updatedSettings);

      Alert.alert(
        t('ui.calendar_sync.sync_completed', '同期完了'),
        t('ui.calendar_sync.sync_result_msg', 'Googleカレンダーとの同期が完了しました。\n\n• 予定取り込み: {{importCount}} 件\n• 実績書き出し: {{exportCount}} 件', {
          importCount: importRes.count,
          exportCount: exportRes.count,
        }),
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('[CalendarSyncScreen] Full sync failed:', err);
      Alert.alert('同期エラー', 'カレンダーとの同期中にエラーが発生しました。');
    } finally {
      setSyncing(false);
    }
  };

  // 最終同期日時のフォーマット
  const formatLastSync = (ts?: number) => {
    if (!ts) return t('ui.calendar_sync.not_synced', '未同期');
    const d = new Date(ts);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ui.calendar_sync.title', 'Googleカレンダー連携')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 未ビルド環境用インジケーター */}
        {!nativeAvailable && (
          <View style={styles.warningCard}>
            <Ionicons name="information-circle-outline" size={22} color="#f59e0b" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>{t('ui.calendar_sync.native_warning_title', '次期ビルド対応機能')}</Text>
              <Text style={styles.warningDesc}>
                {t('ui.calendar_sync.native_warning_desc', '端末カレンダーとの直接連携はネイティブ拡張を利用します。次回のアプリ更新（AAB/APKビルド）以降に実機でご利用いただけます。')}
              </Text>
            </View>
          </View>
        )}

        {/* メインスイッチカード */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('ui.calendar_sync.enable_title', 'Googleカレンダー双方向連動')}</Text>
              <Text style={styles.cardDesc}>
                {t('ui.calendar_sync.enable_desc', '24時間管理の予定をカレンダーから取得し、記録した活動実績をカレンダーへ自動反映します。')}
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggleMainSwitch}
              trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {settings.enabled && (
          <>
            {/* 予定の取り込み（Import）設定 */}
            <View style={styles.sectionHeader}>
              <Ionicons name="cloud-download-outline" size={18} color={Theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>{t('ui.calendar_sync.import_section', '予定の取り込み (Google ➔ TreNote)')}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.settingLabel}>{t('ui.calendar_sync.import_enable', '予定の自動取り込み')}</Text>
                  <Text style={styles.settingSubtext}>{t('ui.calendar_sync.import_enable_desc', 'カレンダーの予定を24時間管理の予定枠へ反映します')}</Text>
                </View>
                <Switch
                  value={settings.importEnabled}
                  onValueChange={(v) => updateSetting('importEnabled', v)}
                  trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
                />
              </View>

              {settings.importEnabled && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.settingLabel}>{t('ui.calendar_sync.import_on_focus', '画面表示時に自動取得')}</Text>
                      <Text style={styles.settingSubtext}>{t('ui.calendar_sync.import_on_focus_desc', '24時間管理画面を開いた時や日付移動時に最新の予定を取り込みます')}</Text>
                    </View>
                    <Switch
                      value={settings.importOnScreenFocus}
                      onValueChange={(v) => updateSetting('importOnScreenFocus', v)}
                      trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
                    />
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.settingLabel}>{t('ui.calendar_sync.exclude_all_day', '終日予定を除外')}</Text>
                      <Text style={styles.settingSubtext}>{t('ui.calendar_sync.exclude_all_day_desc', '円グラフの圧迫を防ぐため、終日（All-day）イベントを取り込みません（推奨）')}</Text>
                    </View>
                    <Switch
                      value={settings.excludeAllDay}
                      onValueChange={(v) => updateSetting('excludeAllDay', v)}
                      trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
                    />
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.settingLabel}>{t('ui.calendar_sync.import_holidays', '日本の祝日を取り込む')}</Text>
                      <Text style={styles.settingSubtext}>{t('ui.calendar_sync.import_holidays_desc', '端末/Googleカレンダーから祝日を取得し、タイムラインに表示します')}</Text>
                    </View>
                    <Switch
                      value={settings.importHolidays ?? true}
                      onValueChange={(v) => updateSetting('importHolidays', v)}
                      trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
                    />
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.settingLabel}>{t('ui.calendar_sync.treat_holidays_as_sunday', '祝日を休日（日曜日）として扱う')}</Text>
                      <Text style={styles.settingSubtext}>{t('ui.calendar_sync.treat_holidays_as_sunday_desc', '祝日には平日ではなく日曜日（休日用デフォルトスケジュール）を自動適用します')}</Text>
                    </View>
                    <Switch
                      value={settings.treatHolidaysAsSunday ?? true}
                      onValueChange={(v) => updateSetting('treatHolidaysAsSunday', v)}
                      trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
                    />
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.settingLabel}>{t('ui.calendar_sync.import_bg_daily', '毎朝の定時バックグラウンド取得')}</Text>
                      <Text style={styles.settingSubtext}>{t('ui.calendar_sync.import_bg_daily_desc', 'アプリ未起動時でも、朝（07:00頃）に裏で予定を取り込みます')}</Text>
                    </View>
                    <Switch
                      value={settings.importBgDaily}
                      onValueChange={(v) => updateSetting('importBgDaily', v)}
                      trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
                    />
                  </View>
                </>
              )}
            </View>

            {/* 実績の書き出し（Export）設定 */}
            <View style={styles.sectionHeader}>
              <Ionicons name="cloud-upload-outline" size={18} color="#10b981" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>{t('ui.calendar_sync.export_section', '活動実績の書き出し (TreNote ➔ カレンダー)')}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.settingLabel}>{t('ui.calendar_sync.export_enable', '活動実績の自動書き出し')}</Text>
                  <Text style={styles.settingSubtext}>{t('ui.calendar_sync.export_enable_desc', '24時間管理で記録した活動実績をカレンダーへ反映します')}</Text>
                </View>
                <Switch
                  value={settings.exportEnabled}
                  onValueChange={(v) => updateSetting('exportEnabled', v)}
                  trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
                />
              </View>

              {settings.exportEnabled && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.settingLabel}>{t('ui.calendar_sync.export_on_save', '記録保存時のリアルタイム反映')}</Text>
                      <Text style={styles.settingSubtext}>{t('ui.calendar_sync.export_on_save_desc', '活動記録を追加・保存した瞬間に即座にカレンダーへ書き出します')}</Text>
                    </View>
                    <Switch
                      value={settings.exportOnSave}
                      onValueChange={(v) => updateSetting('exportOnSave', v)}
                      trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
                    />
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.settingLabel}>{t('ui.calendar_sync.export_bg_daily', '毎晩の定時バックグラウンド書き出し')}</Text>
                      <Text style={styles.settingSubtext}>{t('ui.calendar_sync.export_bg_daily_desc', '夜（23:00頃）にその日の活動実績を裏でまとめて書き出します')}</Text>
                    </View>
                    <Switch
                      value={settings.exportBgDaily}
                      onValueChange={(v) => updateSetting('exportBgDaily', v)}
                      trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
                    />
                  </View>

                  <View style={styles.divider} />
                  <View style={{ paddingVertical: 8 }}>
                    <Text style={styles.settingLabel}>{t('ui.calendar_sync.export_target_cal', '書き出し先カレンダー')}</Text>
                    <Text style={styles.settingSubtext}>
                      {settings.exportCalendarId
                        ? deviceCalendars.find((c) => c.id === settings.exportCalendarId)?.title || '指定カレンダー'
                        : t('ui.calendar_sync.export_default_cal', 'TreNote 専用カレンダー（推奨・自動生成）')}
                    </Text>
                    <Text style={styles.cardHelpText}>
                      ※個人の予定と混ざらないよう、自動生成される「TreNote」専用サブカレンダーへの書き出しを推奨しています。
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* 手動同期ボタン */}
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                onPress={handleRunFullSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="sync" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.syncButtonText}>
                  {syncing ? t('ui.calendar_sync.syncing', 'カレンダーと同期中...') : t('ui.calendar_sync.sync_now', '今すぐ全同期を実行')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.syncStatusText}>
                {t('ui.calendar_sync.last_sync', '最終同期')}: {formatLastSync(settings.lastSyncTimestamp)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
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
  content: { padding: Theme.spacing.md, paddingBottom: 60, gap: 14 },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    padding: 12,
  },
  warningTitle: { fontSize: 14, fontWeight: 'bold', color: '#b45309', marginBottom: 2 },
  warningDesc: { fontSize: 12, color: '#92400e', lineHeight: 17 },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: Theme.colors.textMuted, lineHeight: 18, paddingRight: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: Theme.colors.textMuted },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLabel: { fontSize: 14, fontWeight: '600', color: Theme.colors.text },
  settingSubtext: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 2, lineHeight: 16 },
  cardHelpText: { fontSize: 11, color: Theme.colors.textMuted, marginTop: 4, lineHeight: 15 },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: 4 },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 14,
  },
  syncButtonDisabled: { opacity: 0.6 },
  syncButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  syncStatusText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
});
