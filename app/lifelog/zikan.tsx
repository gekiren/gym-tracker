import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Theme } from '../../src/theme';
import { WebViewTab } from '../../components/WebViewTab';
import ZikanKanriHTML from '../../src/web-apps/ZikanKanri';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { LifelogDateHeader } from '../../components/LifelogDateHeader';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function ZikanScreen() {
  const currentDate = useLifelogStore((state) => state.currentDate);
  const [showHistory, setShowHistory] = useState(false);
  const { t } = useTranslation();

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
          title: '24時間管理',
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
      <LifelogDateHeader type="zikan" />
      {showHistory ? (
        <LifelogHistoryTab type="time" t={t} />
      ) : (
        <WebViewTab html={ZikanKanriHTML} currentDate={targetDate} />
      )}
    </View>
  );
}
