import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Theme } from '../../src/theme';
import { WebViewTab } from '../../components/WebViewTab';
import WaterHTML from '../../src/web-apps/Water';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { LifelogDateHeader } from '../../components/LifelogDateHeader';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function WaterScreen() {
  const currentDate = useLifelogStore((state) => state.currentDate);
  const loadWaterData = useLifelogStore((state) => state.loadWaterData);
  const [showHistory, setShowHistory] = useState(false);
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const targetDate = currentDate || getTodayStr();

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
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <Stack.Screen
        options={{
          title: '水分補給',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowHistory(prev => !prev)} style={{ marginRight: 16, padding: 4 }}>
              <Ionicons name={showHistory ? "list-outline" : "stats-chart-outline"} size={22} color={Theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      {showHistory ? (
        <LifelogHistoryTab type="water" t={t} />
      ) : (
        <>
          <LifelogDateHeader type="water" />
          <WebViewTab html={WaterHTML} currentDate={targetDate} />
        </>
      )}
    </View>
  );
}
