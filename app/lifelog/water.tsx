import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAppTheme } from '../../src/theme';
import { WebViewTab, WebViewTabRef } from '../../components/WebViewTab';
import WaterHTML from '../../src/web-apps/Water';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { getLocalTodaySlash } from '../../src/utils/dateUtils';
import { LifelogDateHeader } from '../../components/LifelogDateHeader';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
import { FeatureClassBar } from '../../components/FeatureClassBar';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFeatureSwipe } from '../../src/hooks/useFeatureSwipe';

export default function WaterScreen() {
  const { colors } = useAppTheme();
  const currentDate = useLifelogStore((state) => state.currentDate);
  const loadWaterData = useLifelogStore((state) => state.loadWaterData);
  const syncTodayIfDateRolledOver = useLifelogStore((state) => state.syncTodayIfDateRolledOver);
  const [showHistory, setShowHistory] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const webViewTabRef = useRef<WebViewTabRef>(null);
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { panHandlerProps } = useFeatureSwipe('/lifelog/water');

  const targetDate = currentDate || getLocalTodaySlash();

  // フォーカス外脱時にモーダルフラグをリセット
  useEffect(() => {
    if (!isFocused) {
      setIsModalVisible(false);
    }
  }, [isFocused]);

  const handleOpenSettingsModal = () => {
    webViewTabRef.current?.injectJavaScript(
      "if (typeof openSettingsModal === 'function') openSettingsModal(); else if (typeof showSettingsModal === 'function') showSettingsModal();"
    );
  };

  const syncWaterForActiveScreen = useCallback(async () => {
    const { date, reloaded } = await syncTodayIfDateRolledOver();
    if (!reloaded && date) {
      await loadWaterData(date);
    }
  }, [syncTodayIfDateRolledOver, loadWaterData]);

  // 1. 画面フォーカス時にDBから最新データを読み直す (isFocusedガード + 初回マウント即時実行)
  useEffect(() => {
    if (!isFocused) return;
    syncWaterForActiveScreen();
    const unsubscribe = navigation.addListener('focus', () => {
      syncWaterForActiveScreen();
    });
    return unsubscribe;
  }, [navigation, isFocused, syncWaterForActiveScreen]);

  // 2. アプリがバックグラウンドから復帰した（Activeになった）時に同期 (isFocusedガード)
  useEffect(() => {
    if (!isFocused) return;
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncWaterForActiveScreen();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isFocused, syncWaterForActiveScreen]);

  return (
    <PanGestureHandler {...panHandlerProps}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen
          options={{
            title: '水分補給',
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
                  onPress={handleOpenSettingsModal}
                  style={{ minWidth: 40, minHeight: 40, padding: 8, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="settings-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        {showHistory ? (
          <LifelogHistoryTab type="water" t={t} />
        ) : (
          <>
            {!isModalVisible && (
              <>
                <LifelogDateHeader type="water" />
                <FeatureClassBar featureId="water" />
              </>
            )}
            <WebViewTab
              ref={webViewTabRef}
              html={WaterHTML}
              currentDate={targetDate}
              onModalStateChange={(visible) => setIsModalVisible(visible)}
            />
          </>
        )}
      </View>
    </PanGestureHandler>
  );
}
