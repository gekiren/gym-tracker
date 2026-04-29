import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { initDB, getSettings, saveSetting } from '../src/db/database';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import '../src/i18n';
import i18n, { getCurrentLanguage } from '../src/i18n';
import * as Localization from 'expo-localization';
import { DEFAULT_STANCES } from '../src/utils/stances';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const setupDB = async () => {
    setDbReady(false);
    setDbError(null);
    try {
      await initDB();
      const storedSettings = await getSettings();
      const defaultRest = storedSettings['default_rest_timer'] ? parseInt(storedSettings['default_rest_timer'], 10) : 90;
      const autoRest = storedSettings['auto_rest_timer'] ? storedSettings['auto_rest_timer'] === '1' : true;
      
      const needsUnitSelection = !storedSettings['weight_unit'];
      const weightUnit = (storedSettings['weight_unit'] === 'lbs' ? 'lbs' : 'kg') as 'kg' | 'lbs';

      // 言語設定：保存済みならそれを使用、なければ端末言語を初回のみ検知して保存
      if (storedSettings['language']) {
        // 2回目以降：DBに保存された言語を使用
        i18n.changeLanguage(storedSettings['language']);
      } else {
        // 初回起動時のみ：端末の言語を検知して使用＆保存
        const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'ja';
        const initialLang = ['ja', 'en'].includes(deviceLocale) ? deviceLocale : 'ja';
        i18n.changeLanguage(initialLang);
        await saveSetting('language', initialLang);
      }
      
      useWorkoutStore.getState().loadSettings(defaultRest, autoRest, weightUnit, needsUnitSelection);
      
      const customStancesStr = storedSettings['custom_stances'];
      const stancesMigratedV3 = storedSettings['stances_migrated_v3'] === '1';
      
      let finalStances: string[] = [];
      if (!customStancesStr) {
        // 新規ユーザー：新デフォルト(v3)を設定
        finalStances = DEFAULT_STANCES;
        await saveSetting('custom_stances', JSON.stringify(finalStances));
        await saveSetting('stances_migrated_v3', '1');
      } else {
        try {
          let stored = JSON.parse(customStancesStr);
          if (!stancesMigratedV3) {
            // v3への移行：ユーザーのリストから不要なものを削除、新しいものを追加、リネーム
            const toDelete = ['スモウ', 'コンベンショナル', 'オルタネイトグリップ', 'サムレスグリップ', 'フックグリップ', 'ポーズ', 'デッドストップ'];
            
            // 削除
            stored = stored.filter((s: string) => !toDelete.includes(s));
            
            // リバースグリップ -> 逆手 (すでにあれば統合)
            if (stored.includes('リバースグリップ')) {
              stored = stored.map((s: string) => s === 'リバースグリップ' ? '逆手' : s);
            }
            
            // 新しいデフォルトを追加
            const toAdd = ['順手', 'パラレル'];
            finalStances = Array.from(new Set([...stored, ...DEFAULT_STANCES])); // DEFAULT_STANCESに含まれるものを確実に含める
            
            await saveSetting('custom_stances', JSON.stringify(finalStances));
            await saveSetting('stances_migrated_v3', '1');
          } else {
            finalStances = stored;
          }
        } catch(e) {
          console.warn('Failed to parse custom_stances', e);
          finalStances = DEFAULT_STANCES;
        }
      }
      useWorkoutStore.getState().loadCustomStances(finalStances);

      console.log('Database initialized successfully with settings', storedSettings);
      setDbReady(true);
    } catch (e: any) {
      console.error('Failed to initialize database', e);
      setDbError(e?.message || String(e));
    }
  };

  useEffect(() => {
    setupDB();
  }, []);

  if (dbError) {
    return (
      <View style={[styles.center, { padding: 40 }]}>
        <Text style={styles.errorTitle}>{i18n.t('ui.profile.db_error_title')}</Text>
        <Text style={styles.errorText}>{i18n.t('ui.profile.db_error_text')}</Text>
        <Text style={[styles.errorText, { color: '#ff4444', fontSize: 12 }]}>{dbError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={setupDB}>
          <Text style={styles.retryBtnText}>{i18n.t('ui.profile.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="select-exercise" options={{ presentation: 'modal', title: i18n.t('ui.profile.screen_title_select_exercise') }} />
          <Stack.Screen name="active-workout" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="exercise/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="edit-workout/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="rm-calculator" options={{ presentation: 'card' }} />
          <Stack.Screen name="privacy-policy" options={{ presentation: 'card' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorTitle: {
    color: Theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  errorText: {
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20
  },
  retryBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});
