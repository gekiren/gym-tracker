import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { initDB, getSettings } from '../src/db/database';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const setupDB = async () => {
      try {
        await initDB();
        const storedSettings = await getSettings();
        const defaultRest = storedSettings['default_rest_timer'] ? parseInt(storedSettings['default_rest_timer'], 10) : 90;
        const autoRest = storedSettings['auto_rest_timer'] ? storedSettings['auto_rest_timer'] === '1' : true;
        
        useWorkoutStore.getState().loadSettings(defaultRest, autoRest);
        console.log('Database initialized successfully with settings', storedSettings);
      } catch (e) {
        console.error('Failed to initialize database', e);
      } finally {
        setDbReady(true);
      }
    };
    setupDB();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: Theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  // Force dark theme for the Gym Tracker aesthetic
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="select-exercise" options={{ presentation: 'modal', title: '種目を選択' }} />
        <Stack.Screen name="active-workout" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="exercise/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="edit-workout/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="rm-calculator" options={{ presentation: 'card' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
