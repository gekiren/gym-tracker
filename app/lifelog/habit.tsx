import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAppTheme } from '../../src/theme';
import { WebViewTab, WebViewTabRef } from '../../components/WebViewTab';
import HabitCounterHTML from '../../src/web-apps/HabitCounter';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { LifelogDateHeader } from '../../components/LifelogDateHeader';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
import { FeatureClassBar } from '../../components/FeatureClassBar';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFeatureSwipe } from '../../src/hooks/useFeatureSwipe';
import { getAllHabitLogs, getHabitItems } from '../../src/db/database';
import { checkDriveForProposals } from '../../src/services/googleDriveSyncService';
import { useGoogleDriveSyncStore } from '../../src/store/googleDriveSyncStore';

export default function HabitScreen() {
  const { colors } = useAppTheme();
  const currentDate = useLifelogStore((state) => state.currentDate);
  const appliedRevision = useGoogleDriveSyncStore((state) => state.appliedRevision);
  const [showHistory, setShowHistory] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const webViewTabRef = useRef<WebViewTabRef>(null);
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { panHandlerProps } = useFeatureSwipe('/lifelog/habit');

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const targetDate = currentDate || getTodayStr();

  // フォーカス離脱時にモーダルフラグをリセット
  useEffect(() => {
    if (!isFocused) {
      setIsModalVisible(false);
      return;
    }
    const timer = setTimeout(() => {
      checkDriveForProposals({ interactive: false, reason: 'habit_focus' }).catch((err) => {
        console.warn('[HabitScreen] Drive proposal check failed:', err);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [isFocused]);

  // Google Drive AI提案が反映されたら開いている WebView にも即座に再描画注入する
  useEffect(() => {
    if (!isFocused || appliedRevision === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const [habitItemsRows, habitLogsRows] = await Promise.all([
          getHabitItems(),
          getAllHabitLogs(),
        ]);
        if (cancelled) return;
        const formattedItems = habitItemsRows.map((row) => ({
          id: String(row.id),
          name: row.name,
          color: row.color,
          createdAt: row.created_at,
          targetCount: row.target_count || 0,
          visible: row.is_hidden === 1 ? false : true,
        }));
        const formattedLogs = habitLogsRows.map((row) => ({
          itemId: String(row.habit_item_id),
          timestamp: row.timestamp,
        }));
        webViewTabRef.current?.injectJavaScript(`
          (function() {
            var storage = window.appStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
            if (storage && typeof storage.setItem === 'function') {
              window.isInitialSync = true;
              storage.setItem('habit-items', JSON.stringify(${JSON.stringify(formattedItems)}));
              storage.setItem('habit-logs', JSON.stringify(${JSON.stringify(formattedLogs)}));
              if (typeof loadData === 'function') loadData();
              if (typeof render === 'function') render();
              window.isInitialSync = false;
            }
          })();
        `);
      } catch (err) {
        console.warn('[HabitScreen] Failed to refresh WebView after Drive apply:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFocused, appliedRevision]);

  const handleOpenManageModal = () => {
    webViewTabRef.current?.injectJavaScript(
      "if (typeof showManageModal === 'function') showManageModal(); else if (typeof openManageModal === 'function') openManageModal();"
    );
  };

  return (
    <PanGestureHandler {...panHandlerProps}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen
          options={{
            title: '習慣カウンター',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: 'bold' },
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowHistory(prev => !prev)}
                  style={{ minWidth: 40, minHeight: 40, padding: 8, marginRight: 2, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={showHistory ? "list-outline" : "stats-chart-outline"} size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleOpenManageModal}
                  style={{ minWidth: 40, minHeight: 40, padding: 8, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="settings-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        {showHistory ? (
          <LifelogHistoryTab type="habit" t={t} />
        ) : isFocused ? (
          <>
            {!isModalVisible && (
              <>
                <LifelogDateHeader type="habit" />
                <FeatureClassBar featureId="habit" />
              </>
            )}
            <WebViewTab
              ref={webViewTabRef}
              html={HabitCounterHTML}
              currentDate={targetDate}
              onModalStateChange={(visible) => setIsModalVisible(visible)}
            />
          </>
        ) : null}
      </View>
    </PanGestureHandler>
  );
}
