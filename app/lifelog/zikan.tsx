import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
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
import { useFeatureSwipe } from '../../hooks/useFeatureSwipe';

export default function ZikanScreen() {
  const currentDate = useLifelogStore((state) => state.currentDate);
  const [showHistory, setShowHistory] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
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

  // フォーカス離脱時にモーダルフラグをリセット
  useEffect(() => {
    if (!isFocused) {
      setIsModalVisible(false);
    }
  }, [isFocused]);

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
