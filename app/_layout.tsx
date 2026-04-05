import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { initDB } from '../src/db/database';
import { Theme } from '../src/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const setupDB = async () => {
      try {
        await initDB();
        console.log('Database initialized successfully');
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
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Details' }} />
        <Stack.Screen name="active-workout" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
