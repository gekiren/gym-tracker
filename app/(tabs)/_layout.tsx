import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import AdBanner from '../../components/AdBanner';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { AI_CONFIG } from '../../src/config/aiConfig';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const aiTokensBalance = useWorkoutStore(state => state.settings.aiTokensBalance);
  const isPremium = useWorkoutStore(state => state.settings.isPremium);
  const isEarly = useWorkoutStore(state => state.settings.isEarlyAdopter);
  const isPremiumOrEarly = isPremium || isEarly;
  const maxTokens = isPremiumOrEarly ? 20 : 5;

  // Calculate tab padding and height dynamically based on safe area insets.
  // If Premium/Early, the tab bar is at the bottom of the screen.
  // If Basic plan, the tab bar sits above the AdBanner, so it doesn't need safe area bottom padding.
  const baseHeight = Platform.OS === 'ios'
    ? (isPremiumOrEarly ? 60 : 64)
    : (isPremiumOrEarly ? 52 : 60);

  const defaultPaddingBottom = Platform.OS === 'ios'
    ? (isPremiumOrEarly ? 28 : 12)
    : (isPremiumOrEarly ? 32 : 8);

  const tabPaddingBottom = isPremiumOrEarly
    ? (Platform.OS === 'android'
        ? Math.max(insets.bottom + 12, defaultPaddingBottom)
        : Math.max(insets.bottom, defaultPaddingBottom))
    : defaultPaddingBottom;

  const tabHeight = baseHeight + tabPaddingBottom;

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Theme.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: Theme.colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: Theme.colors.text,
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: Theme.colors.background,
          borderTopColor: Theme.colors.border,
          height: tabHeight,
          paddingBottom: tabPaddingBottom,
          paddingTop: 8,
          ...(Platform.OS === 'ios' ? { position: 'absolute' } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 0 : 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: t('ui.tabs.home'),
          title: t('ui.tabs.workout'),
          tabBarIcon: ({ color }) => <Ionicons name="barbell" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          headerTitle: t('ui.tabs.history'),
          title: t('ui.tabs.history'),
          tabBarIcon: ({ color }) => <Ionicons name="time" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          href: AI_CONFIG.status === 'disabled' ? null : undefined,
          headerTitle: `${t('ui.tabs.coach') || 'AIトレーナー'} (${aiTokensBalance}/${maxTokens})`,
          title: t('ui.tabs.coach') || 'AIトレーナー',
          tabBarIcon: ({ color }) => <Ionicons name="sparkles" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: t('ui.tabs.profile'),
          title: t('ui.tabs.profile'),
          tabBarIcon: ({ color }) => <Ionicons name="person" size={26} color={color} />,
        }}
      />
    </Tabs>
    {!isPremiumOrEarly && <AdBanner />}
    </View>
  );
}
