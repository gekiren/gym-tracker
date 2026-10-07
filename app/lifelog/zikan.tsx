import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Theme } from '../../src/theme';
import { WebViewTab, WebViewTabRef } from '../../components/WebViewTab';
import ZikanKanriHTML from '../../src/web-apps/ZikanKanri';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { LifelogDateHeader } from '../../components/LifelogDateHeader';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
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

export default function ZikanScreen() {
  const currentDate = useLifelogStore((state) => state.currentDate);
  const [showHistory, setShowHistory] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
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
    };

    // 画面マウント・フォーカス直後のわずかな猶予をおいて実行
    const timer = setTimeout(autoImport, 600);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isFocused, targetDate]);

  // フォーカス離脱時にモーダルフラグをリセット
  useEffect(() => {
    if (!isFocused) {
      setIsModalVisible(false);
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
    webViewTabRef.current?.injectJavaScript(
      "if (typeof openTagEditor === 'function') openTagEditor();"
    );
  };

  return (
    <PanGestureHandler {...panHandlerProps}>
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
        <Stack.Screen
          options={{
            title: '24時間管理',
            headerStyle: { backgroundColor: Theme.colors.background },
            headerTintColor: Theme.colors.text,
            headerTitleStyle: { fontWeight: 'bold' },
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                <TouchableOpacity
                  onPress={handleManualCalendarSync}
                  disabled={isCalendarSyncing}
                  style={{ padding: 6, marginRight: 6 }}
                >
                  {isCalendarSyncing ? (
                    <ActivityIndicator size="small" color={Theme.colors.primary} />
                  ) : (
                    <Ionicons name="calendar-outline" size={22} color={Theme.colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowHistory(prev => !prev)} style={{ padding: 6, marginRight: 6 }}>
                  <Ionicons name={showHistory ? "list-outline" : "stats-chart-outline"} size={22} color={Theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenTagEditor} style={{ padding: 6 }}>
                  <Ionicons name="settings-outline" size={22} color={Theme.colors.primary} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        {showHistory ? (
          <LifelogHistoryTab type="time" t={t} />
        ) : isFocused ? (
          <>
            {!isModalVisible && <LifelogDateHeader type="zikan" />}
            <WebViewTab
              ref={webViewTabRef}
              html={ZikanKanriHTML}
              currentDate={targetDate}
              onModalStateChange={(visible) => setIsModalVisible(visible)}
            />
          </>
        ) : null}
      </View>
    </PanGestureHandler>
  );
}
