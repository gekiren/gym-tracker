import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import SponsorBanner from '../../components/SponsorBanner';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { AI_CONFIG } from '../../src/config/aiConfig';

export default function TabLayout() {
  const { t } = useTranslation();
  const { settings } = useWorkoutStore();
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
          ...(Platform.OS === 'ios' ? { position: 'absolute' } : {}),
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
        name="exercises"
        options={{
          headerTitle: t('ui.tabs.exercises'),
          title: t('ui.tabs.exercises'),
          tabBarIcon: ({ color }) => <Ionicons name="list" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          href: AI_CONFIG.status === 'disabled' ? null : undefined,
          headerTitle: `${t('ui.tabs.coach') || 'AIコーチ'} (${settings.aiTokensBalance}/20)`,
          title: t('ui.tabs.coach') || 'AIコーチ',
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
    <SponsorBanner />
    </View>
  );
}
