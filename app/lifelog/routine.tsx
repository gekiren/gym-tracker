import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Theme } from '../../src/theme';
import { WebViewTab } from '../../components/WebViewTab';
import RoutineTrackerHTML from '../../src/web-apps/RoutineTracker';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function RoutineScreen() {
  const currentDate = useLifelogStore((state) => state.currentDate);
  const activeRoutineState = useLifelogStore((state) => state.activeRoutineState);
  const [showHistory, setShowHistory] = useState(false);
  const { t } = useTranslation();

  const isExecuting = activeRoutineState?.isExecuting || false;

  const handleBack = useCallback(() => {
    if (isExecuting) {
      Alert.alert(
        t('ui.active_workout.alert_pause_title') || 'ワークアウトを一時停止',
        t('ui.active_workout.alert_pause_message') || 'この画面を離れますか？',
        [
          {
            text: t('ui.active_workout.alert_pause_cancel') || 'キャンセル',
            style: 'cancel',
          },
          {
            text: t('ui.active_workout.alert_pause_leave') || '中断せず戻る',
            style: 'default',
            onPress: () => {
              router.back();
            }
          },
          {
            text: t('ui.active_workout.alert_pause_discard') || '中断して戻る',
            style: 'destructive',
            onPress: () => {
              useLifelogStore.getState().clearActiveRoutineState();
              router.back();
            }
          }
        ]
      );
      return true;
    }
    router.back();
    return true;
  }, [isExecuting, t]);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => backHandler.remove();
    }, [handleBack])
  );

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const targetDate = currentDate || getTodayStr();

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <Stack.Screen
        options={{
          title: 'ルーティン管理',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={{ marginLeft: 8, padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={Theme.colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowHistory(prev => !prev)} style={{ marginRight: 16, padding: 4 }}>
              <Ionicons name={showHistory ? "list-outline" : "stats-chart-outline"} size={22} color={Theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      {showHistory ? (
        <LifelogHistoryTab type="routine" t={t} />
      ) : (
        <WebViewTab html={RoutineTrackerHTML} currentDate={targetDate} />
      )}
    </View>
  );
}
