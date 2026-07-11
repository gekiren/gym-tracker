import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Theme } from '../../src/theme';
import { WebViewTab } from '../../components/WebViewTab';
import HabitCounterHTML from '../../src/web-apps/HabitCounter';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { LifelogDateHeader } from '../../components/LifelogDateHeader';

export default function HabitScreen() {
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
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <Stack.Screen
        options={{
          title: '習慣カウンター',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <LifelogDateHeader type="habit" />
      <WebViewTab html={HabitCounterHTML} currentDate={targetDate} />
    </View>
  );
}
