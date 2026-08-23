import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Theme } from '../../src/theme';
import { WebViewTab, WebViewTabRef } from '../../components/WebViewTab';
import WaterHTML from '../../src/web-apps/Water';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { LifelogDateHeader } from '../../components/LifelogDateHeader';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFeatureSwipe } from '../../hooks/useFeatureSwipe';

export default function WaterScreen() {
  const currentDate = useLifelogStore((state) => state.currentDate);
  const loadWaterData = useLifelogStore((state) => state.loadWaterData);
  const [showHistory, setShowHistory] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const webViewTabRef = useRef<WebViewTabRef>(null);
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { panHandlerProps } = useFeatureSwipe('/lifelog/water');

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const targetDate = currentDate || getTodayStr();

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

  // 1. 画面フォーカス時にDBから最新データを読み直す (isFocusedガード)
  useEffect(() => {
    if (!isFocused) return;
    const unsubscribe = navigation.addListener('focus', () => {
      if (targetDate) {
        loadWaterData(targetDate);
      }
    });
    return unsubscribe;
  }, [navigation, targetDate, isFocused]);

  // 2. アプリがバックグラウンドから復帰した（Activeになった）時に同期 (isFocusedガード)
  useEffect(() => {
    if (!isFocused) return;
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && targetDate) {
        loadWaterData(targetDate);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [targetDate, isFocused]);

  return (
    <PanGestureHandler {...panHandlerProps}>
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
        <Stack.Screen
          options={{
            title: '水分補給',
            headerStyle: { backgroundColor: Theme.colors.background },
            headerTintColor: Theme.colors.text,
            headerTitleStyle: { fontWeight: 'bold' },
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                <TouchableOpacity onPress={() => setShowHistory(prev => !prev)} style={{ padding: 6, marginRight: 6 }}>
                  <Ionicons name={showHistory ? "list-outline" : "stats-chart-outline"} size={22} color={Theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenSettingsModal} style={{ padding: 6 }}>
                  <Ionicons name="settings-outline" size={22} color={Theme.colors.primary} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        {showHistory ? (
          <LifelogHistoryTab type="water" t={t} />
        ) : (
          <>
            {!isModalVisible && <LifelogDateHeader type="water" />}
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
