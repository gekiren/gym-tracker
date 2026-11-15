import React, { useState, useCallback, useRef } from 'react';
import { View, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import { useAppTheme } from '../../src/theme';
import { WebViewTab, WebViewTabRef } from '../../components/WebViewTab';
import RoutineTrackerHTML from '../../src/web-apps/RoutineTracker';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { LifelogDateHeader } from '../../components/LifelogDateHeader';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFeatureSwipe } from '../../src/hooks/useFeatureSwipe';
import { getSettings } from '../../src/db/database';
import { checkDriveForProposals } from '../../src/services/googleDriveSyncService';
import { useGoogleDriveSyncStore } from '../../src/store/googleDriveSyncStore';

function KeepAwakeController() {
  useKeepAwake();
  return null;
}

export default function RoutineScreen() {
  const { colors } = useAppTheme();
  const currentDate = useLifelogStore((state) => state.currentDate);
  const isExecuting = useLifelogStore((state) => state.activeRoutineState?.isExecuting || false);
  const appliedRevision = useGoogleDriveSyncStore((state) => state.appliedRevision);
  const [showHistory, setShowHistory] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const webViewTabRef = useRef<WebViewTabRef>(null);
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { panHandlerProps } = useFeatureSwipe('/lifelog/routine');

  // フォーカス離脱時にモーダルフラグをリセット・フォーカス時にDrive提案チェック
  React.useEffect(() => {
    if (!isFocused) {
      setIsModalVisible(false);
      return;
    }
    const timer = setTimeout(() => {
      checkDriveForProposals({ interactive: false, reason: 'routine_focus' }).catch((err) => {
        console.warn('[RoutineScreen] Drive proposal check failed:', err);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [isFocused]);

  // AI提案反映時にWebView側を即時更新
  React.useEffect(() => {
    if (!isFocused || appliedRevision === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const all = await getSettings();
        if (cancelled) return;
        const raw = all['routine_tracker_data'];
        if (!raw) return;
        let parsed = JSON.parse(raw);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        if (Array.isArray(parsed)) {
          webViewTabRef.current?.injectJavaScript(
            `if (typeof window.refreshRoutinesFromHost === 'function') {
              window.refreshRoutinesFromHost(${JSON.stringify(parsed)});
            }`
          );
        }
      } catch (err) {
        console.warn('[RoutineScreen] Failed to refresh WebView routines:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFocused, appliedRevision]);

  const handleOpenManageView = () => {
    webViewTabRef.current?.injectJavaScript(
      "if (typeof showManageScreen === 'function') showManageScreen(); else if (typeof openManageScreen === 'function') openManageScreen();"
    );
  };

  const handleBack = useCallback(() => {
    if (isExecuting) {
      Alert.alert(
        t('ui.active_routine.alert_pause_title') || 'ルーティンの中断',
        t('ui.active_routine.alert_pause_message') || 'この画面を離れますか？',
        [
          {
            text: t('ui.active_routine.alert_pause_cancel') || 'キャンセル',
            style: 'cancel',
          },
          {
            text: t('ui.active_routine.alert_pause_leave') || '中断せず戻る',
            style: 'default',
            onPress: () => {
              router.back();
            }
          },
          {
            text: t('ui.active_routine.alert_pause_discard') || '中断して戻る',
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
    <PanGestureHandler {...panHandlerProps}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {isFocused && isExecuting && <KeepAwakeController />}
        <Stack.Screen
          options={{
            title: 'ルーティン管理',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: 'bold' },
            headerLeft: () => (
              <TouchableOpacity
                onPress={handleBack}
                style={{ marginLeft: 4, minWidth: 40, minHeight: 40, padding: 8, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowHistory(prev => !prev)}
                  style={{ minWidth: 40, minHeight: 40, padding: 8, marginRight: 2, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={showHistory ? "list-outline" : "stats-chart-outline"} size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleOpenManageView}
                  style={{ minWidth: 40, minHeight: 40, padding: 8, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="settings-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        {showHistory ? (
          <LifelogHistoryTab type="routine" t={t} />
        ) : isFocused ? (
          <>
            {!isModalVisible && <LifelogDateHeader type="routine" />}
            <WebViewTab 
              ref={webViewTabRef}
              html={RoutineTrackerHTML} 
              currentDate={targetDate} 
              onModalStateChange={(visible) => setIsModalVisible(visible)}
            />
          </>
        ) : null}
      </View>
    </PanGestureHandler>
  );
}
