import React from 'react';
import { Stack } from 'expo-router';
import { Theme } from '../../src/theme';
import { WebViewTab } from '../../components/WebViewTab';
import RoutineTrackerHTML from '../../src/web-apps/RoutineTracker';
import { useLifelogStore } from '../../src/store/lifelogStore';

export default function RoutineScreen() {
  const currentDate = useLifelogStore((state) => state.currentDate);

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const targetDate = currentDate || getTodayStr();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'ルーティン管理',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <WebViewTab html={RoutineTrackerHTML} currentDate={targetDate} />
    </>
  );
}
