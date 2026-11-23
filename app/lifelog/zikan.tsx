import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Alert, Modal, Text, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAppTheme } from '../../src/theme';
import { WebViewTab, WebViewTabRef } from '../../components/WebViewTab';
import ZikanKanriHTML from '../../src/web-apps/ZikanKanri';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { LifelogDateHeader } from '../../components/LifelogDateHeader';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
import { FeatureClassBar } from '../../components/FeatureClassBar';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFeatureSwipe } from '../../src/hooks/useFeatureSwipe';
import {
  isCalendarAvailable,
  getCalendarSyncSettings,
  importGoogleCalendarPlans,
  exportLogsToGoogleCalendar,
  syncHolidaysFromDevice,
} from '../../src/services/calendarService';
import { getSettings } from '../../src/db/database';
import { checkDriveForProposals } from '../../src/services/googleDriveSyncService';
import { useGoogleDriveSyncStore } from '../../src/store/googleDriveSyncStore';

export default function ZikanScreen() {
  const { colors } = useAppTheme();
  const currentDate = useLifelogStore((state) => state.currentDate);
  const appliedRevision = useGoogleDriveSyncStore((state) => state.appliedRevision);
  const [showHistory, setShowHistory] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
  const webViewTabRef = useRef<WebViewTabRef>(null);
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { panHandlerProps } = useFeatureSwipe('/lifelog/zikan');

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const targetDate = currentDate || getTodayStr();

  // フォーカス時および日付変更時のカレンダー予定スマート自動取り込み
  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;
    const autoImport = async () => {
      try {
        const available = await isCalendarAvailable();
        if (!available) return;

        const settings = await getCalendarSyncSettings();
        if (settings.importHolidays !== false) {
          const holidays = await syncHolidaysFromDevice();
          if (isMounted) {
            webViewTabRef.current?.injectJavaScript(
              `if (typeof window.updateHolidaysData === 'function') {
                window.updateHolidaysData(${JSON.stringify(holidays)}, ${JSON.stringify(settings.treatHolidaysAsSunday ?? true)});
              }`
            );
          }
        }

        if (settings.enabled && settings.importEnabled && settings.importOnScreenFocus) {
          const res = await importGoogleCalendarPlans(targetDate);
          if (isMounted && res.success && res.allPlans) {
            // WebView側へ最新の予定を注入して即座に再描画
            webViewTabRef.current?.injectJavaScript(
              `if (typeof window.importGooglePlans === 'function') {
                window.importGooglePlans(${JSON.stringify(res.allPlans)});
              }`
            );
          }
        }
      } catch (err) {
        console.warn('[ZikanScreen] Auto calendar import failed:', err);
      }

      // Google Drive AI提案のチェック
      checkDriveForProposals({ interactive: false, reason: 'zikan_focus' }).catch((err) => {
        console.warn('[ZikanScreen] Drive proposal check failed:', err);
      });
    };

    // 画面マウント・フォーカス直後のわずかな猶予をおいて実行
    const timer = setTimeout(autoImport, 600);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isFocused, targetDate]);

  // Google Drive AI提案が反映されたら開いている WebView にも即座に再描画注入する
  useEffect(() => {
    if (!isFocused || appliedRevision === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const all = await getSettings();
        if (cancelled) return;
        const parseSafe = (raw?: string) => {
          if (!raw) return undefined;
          let p = JSON.parse(raw);
          if (typeof p === 'string') p = JSON.parse(p);
          return Array.isArray(p) ? p : undefined;
        };
        const payload = {
          plans: parseSafe(all['zikankanri_plans']),
          defaultSchedules: parseSafe(all['zikankanri_default_schedules']),
          templates: parseSafe(all['zikankanri_templates']),
          pieces: parseSafe(all['zikankanri_pieces']),
        };
        webViewTabRef.current?.injectJavaScript(
          `if (typeof window.refreshAiTimeManagementData === 'function') {
            window.refreshAiTimeManagementData(${JSON.stringify(payload)});
          }`
        );
      } catch (err) {
        console.warn('[ZikanScreen] Failed to refresh WebView after Drive apply:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFocused, appliedRevision]);

  // フォーカス離脱時にモーダルフラグをリセット
  useEffect(() => {
    if (!isFocused) {
      setIsModalVisible(false);
      setShowSettingsMenu(false);
    }
  }, [isFocused]);

  // 手動カレンダー同期
  const handleManualCalendarSync = useCallback(async () => {
    const available = await isCalendarAvailable();
    if (!available) {
      Alert.alert(
        'カレンダー連携',
        '端末カレンダー連携は次回のアプリ更新（AAB/APKビルド）以降に利用可能になります。設定画面を開きますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '設定を開く', onPress: () => router.push('/settings/calendar-sync') },
        ]
      );
      return;
    }

    const settings = await getCalendarSyncSettings();
    if (!settings.enabled) {
      Alert.alert(
        'カレンダー未連携',
        'Googleカレンダーとの自動連動がオフになっています。設定画面で連携をオンにしてください。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '設定を開く', onPress: () => router.push('/settings/calendar-sync') },
        ]
      );
      return;
    }

    try {
      setIsCalendarSyncing(true);
      const importRes = await importGoogleCalendarPlans(targetDate);
      const exportRes = await exportLogsToGoogleCalendar(targetDate);
      const holidays = await syncHolidaysFromDevice();

      if (importRes.success && importRes.allPlans) {
        webViewTabRef.current?.injectJavaScript(
          `if (typeof window.importGooglePlans === 'function') {
            window.importGooglePlans(${JSON.stringify(importRes.allPlans)});
          }
          if (typeof window.updateHolidaysData === 'function') {
            window.updateHolidaysData(${JSON.stringify(holidays)}, ${JSON.stringify(settings.treatHolidaysAsSunday ?? true)});
          }`
        );
      } else {
        webViewTabRef.current?.injectJavaScript(
          `if (typeof window.updateHolidaysData === 'function') {
            window.updateHolidaysData(${JSON.stringify(holidays)}, ${JSON.stringify(settings.treatHolidaysAsSunday ?? true)});
          }`
        );
      }

      const deleteMsg = exportRes.deletedCount > 0 ? `\n• 不要イベント削除: ${exportRes.deletedCount} 件` : '';
      Alert.alert(
        '同期完了',
        `Googleカレンダーと同期しました。\n\n• 予定取り込み: ${importRes.count} 件\n• 実績書き出し: ${exportRes.count} 件${deleteMsg}`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error('[ZikanScreen] Manual calendar sync failed:', e);
      Alert.alert('エラー', 'カレンダーとの同期に失敗しました。');
    } finally {
      setIsCalendarSyncing(false);
    }
  }, [targetDate]);

  const handleOpenTagEditor = () => {
    setShowSettingsMenu(false);
    webViewTabRef.current?.injectJavaScript(
      "if (typeof openTagEditor === 'function') openTagEditor();"
    );
  };

  const handleOpenCalendarSyncSettings = () => {
    setShowSettingsMenu(false);
    router.push('/settings/calendar-sync');
  };

  return (
    <PanGestureHandler {...panHandlerProps}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen
          options={{
            title: '24時間管理',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: 'bold' },
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                <TouchableOpacity
                  onPress={handleManualCalendarSync}
                  disabled={isCalendarSyncing}
                  style={{ minWidth: 40, minHeight: 40, padding: 8, marginRight: 2, alignItems: 'center', justifyContent: 'center' }}
                >
                  {isCalendarSyncing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowHistory(prev => !prev)}
                  style={{ minWidth: 40, minHeight: 40, padding: 8, marginRight: 2, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={showHistory ? "list-outline" : "stats-chart-outline"} size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowSettingsMenu(true)}
                  style={{ minWidth: 40, minHeight: 40, padding: 8, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="settings-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        {showHistory ? (
          <LifelogHistoryTab type="time" t={t} />
        ) : isFocused ? (
          <>
            {!isModalVisible && (
              <>
                <LifelogDateHeader type="zikan" />
                <FeatureClassBar featureId="zikan" />
              </>
            )}
            <WebViewTab
              ref={webViewTabRef}
              html={ZikanKanriHTML}
              currentDate={targetDate}
              onModalStateChange={(visible) => setIsModalVisible(visible)}
            />
          </>
        ) : null}

        <Modal
          visible={showSettingsMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSettingsMenu(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
            onPress={() => setShowSettingsMenu(false)}
          >
            <Pressable
              style={{
                width: '100%',
                maxWidth: 340,
                backgroundColor: colors.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                  24時間管理の設定
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleOpenCalendarSyncSettings}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  minHeight: 52,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    Googleカレンダー連携設定
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    予定取り込み・実績書き出し・2重表示防止
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOpenTagEditor}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  minHeight: 52,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Ionicons name="pricetags-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    タグ・ピース編集
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    活動タグ・タイムラインピースの追加と編集
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowSettingsMenu(false)}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 13,
                  minHeight: 48,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>
                  キャンセル
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </PanGestureHandler>
  );
}
