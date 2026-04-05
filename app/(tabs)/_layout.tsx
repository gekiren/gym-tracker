import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

export default function TabLayout() {
  return (
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
          headerTitle: 'ホーム',
          title: 'ワークアウト',
          tabBarIcon: ({ color }) => <Ionicons name="barbell" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          headerTitle: '履歴',
          title: '履歴',
          tabBarIcon: ({ color }) => <Ionicons name="time" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          headerTitle: '種目',
          title: '種目',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: 'プロフィール',
          title: 'プロフィール',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
