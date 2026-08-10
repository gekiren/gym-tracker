import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, ErrorBoundaryProps } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Alert, AppState, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as Updates from 'expo-updates';
import mobileAds from 'react-native-google-mobile-ads';
import { initDB, getSettings, saveSetting } from '../src/db/database';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore } from '../src/store/settingsStore';
import '../src/i18n';
import i18n from '../src/i18n';
import { registerGlobalErrorHandler } from '../src/services/crashReporterService';
import { ReviewPromptModal } from '../components/ReviewPromptModal';
import { OTAUpdateModal } from '../components/OTAUpdateModal';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { syncHealthData } from '../src/services/healthService';
import { initNotificationCategories, setupNotificationResponseListener } from '../src/services/notificationService';
import {
  initLanguageAndUnits,
  initCrashReporting,
  initOTAUpdateCheck,
  initSubscriptionAndTokens,
  initStanceSettings,
  initBackgroundSyncServices,
} from '../src/services/appInitializationService';

// アプリの起動時にグローバルエラーハンドラを登録
registerGlobalErrorHandler();

export const unstable_settings = {
  initialRouteName: 'index',
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
      const timerVibrate = storedSettings['timer_vibrate'] ? storedSettings['timer_vibrate'] === '1' : true;
      const keepAwake = storedSettings['keep_awake'] ? storedSettings['keep_awake'] === '1' : true;
      const bodyWeight = storedSettings['body_weight'] ? parseFloat(storedSettings['body_weight']) : null;
      const alwaysOneSet = storedSettings['always_one_set'] === '1';
      const preferredAiModel = (storedSettings['preferred_ai_model'] === 'deepseek' ? 'deepseek' : 'gemini') as 'gemini' | 'deepseek';
      const aiChatMode = (storedSettings['ai_chat_mode'] === 'thinking' ? 'thinking' : 'quick') as 'quick' | 'thinking';

      const isProductionChannel = Updates.channel === 'production';
      let enableAiDebugContext = !isProductionChannel;
      if (!isProductionChannel && storedSettings['enable_ai_debug_context'] === 'false') {
        enableAiDebugContext = false;
      }
      if (isProductionChannel) {
        enableAiDebugContext = false;
      }

      // 1. 言語および重量単位の設定
      const { weightUnit, needsUnitSelection, needsStyleSelection } = await initLanguageAndUnits(storedSettings);

      // 2. クラッシュレポート
      const { crashConsent, hasUnsentLog } = await initCrashReporting(storedSettings);

      // 3. OTAアップデートチェック
      const isFirstInstall = needsStyleSelection || needsUnitSelection;
      await initOTAUpdateCheck(storedSettings, isFirstInstall);

      // 4. サブスク・プレミアム＆トークン判定
      const { finalPremiumUntil, finalTokensBalance, expired, isEarlyAdopter } = await initSubscriptionAndTokens(storedSettings);

      // 5. ストアへの設定ロード
      useSettingsStore.getState().loadSettings({
        defaultRest,
        autoRest,
        timerVibrate,
        weightUnit,
        needsUnitSelection,
        bodyWeight,
        needsStyleSelection,
        aiTokensBalance: finalTokensBalance,
        crashConsent,
        premiumUntil: finalPremiumUntil,
        isEarlyAdopter,
        keepAwake,
        alwaysOneSet,
        preferredAiModel,
        aiChatMode,
        enableAiDebugContext,
      });
      if (expired) {
        useWorkoutStore.getState().setShouldShowPaywall(true);
      }
      useWorkoutStore.getState().setHasUnsentCrashLog(hasUnsentLog);

      // 表示フィールド設定
      const showRpe = storedSettings['display_rpe'] !== '0';
      const show1RM = storedSettings['display_1rm'] !== '0';
      const showVolume = storedSettings['display_volume'] !== '0';
      const showStance = storedSettings['display_stance'] !== '0';
      useSettingsStore.getState().setDisplayFields({ showRpe, show1RM, showVolume, showStance });

      // 6. スタンス設定の移行・読み込み
      const finalStances = await initStanceSettings(storedSettings);
      useSettingsStore.getState().loadCustomStances(finalStances);

      console.log('Database initialized successfully with settings', storedSettings);
      setDbReady(true);

      // 7. バックグラウンド同期・アラート等の起動
      initBackgroundSyncServices(expired);
    } catch (e: any) {
      console.error('Failed to initialize database', e);
      setDbError(e?.message || String(e));
    }
  };

  useEffect(() => {
    // Initialize Google Mobile Ads SDK on startup
    mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        console.log('Google Mobile Ads SDK initialized successfully:', adapterStatuses);
      })
      .catch((err) => {
        console.warn('Failed to initialize Google Mobile Ads SDK:', err);
      });

    setupDB();

    // 通知アクションカテゴリ初期化＆リスナーセットアップ
    initNotificationCategories();
    const cleanupNotificationListener = setupNotificationResponseListener();

    // ヘルスコネクトの定時アクセス監視タイマー (15分ごとにチェック)
    const healthSyncInterval = setInterval(() => {
      syncHealthData({ reason: 'periodic' }).catch(console.error);
    }, 15 * 60 * 1000);

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // アプリフォアグラウンド復帰時にヘルスコネクトに自動アクセス
        syncHealthData({ reason: 'launch' }).catch(console.error);

        const settings = useSettingsStore.getState().settings;
        const premiumUntil = settings.premiumUntil;
        if (premiumUntil && premiumUntil !== 'perpetual') {
          const expiry = Date.parse(premiumUntil);
          if (!isNaN(expiry) && expiry <= Date.now()) {
            await saveSetting('premium_until', '');
            const isEarly = settings.isEarlyAdopter;
            if (!isEarly) {
              await saveSetting('ai_tokens_balance', '5');
            }
            
            useSettingsStore.getState().setPremiumUntil('');
            if (!isEarly) {
              useSettingsStore.getState().setAITokensBalance(5);
            }
            useWorkoutStore.getState().setShouldShowPaywall(true);
            
            Alert.alert(
              i18n.t('ui.profile.promo_expired_title') || 'プレミアム期間の終了',
              i18n.t('ui.profile.promo_expired_msg') || 'プレミアムプラン（お試し）の有効期限が終了したため、元のプランに戻りました。',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    router.navigate('/(tabs)/profile');
                  }
                }
              ]
            );
          }
        }
      }
    });

    return () => {
      subscription.remove();
      cleanupNotificationListener();
      clearInterval(healthSyncInterval);
    };
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
      <KeyboardProvider statusBarTranslucent={true}>
        <ThemeProvider value={DarkTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="select-exercise" options={{ presentation: 'modal', title: i18n.t('ui.profile.screen_title_select_exercise') }} />
            <Stack.Screen name="active-workout" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="workout-completion" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="build-routine" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="exercise/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="edit-workout/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="rm-calculator" options={{ presentation: 'card' }} />
            <Stack.Screen name="privacy-policy" options={{ presentation: 'card' }} />
            <Stack.Screen name="developer-menu" options={{ presentation: 'card' }} />
            <Stack.Screen name="lifelog/nutrition" options={{ presentation: 'card' }} />
          </Stack>
          <ReviewPromptModal />
          <OTAUpdateModal />
          <StatusBar style="light" />
        </ThemeProvider>
      </KeyboardProvider>
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

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={errorStyles.container}>
      <View style={errorStyles.card}>
        <View style={errorStyles.iconOuter}>
          <Ionicons name="alert-circle-outline" size={48} color={Theme.colors.danger} />
        </View>
        <Text style={errorStyles.title}>問題が発生しました</Text>
        <Text style={errorStyles.message}>
          アプリの実行中に予期しないエラーが発生しました。お手数ですが、以下のボタンから再試行してください。
        </Text>
        <ScrollView style={errorStyles.errorDetailsContainer} contentContainerStyle={{ padding: 10 }}>
          <Text style={errorStyles.errorText}>{error.stack || error.message}</Text>
        </ScrollView>
        <TouchableOpacity style={errorStyles.retryButton} onPress={retry} activeOpacity={0.8}>
          <Text style={errorStyles.retryButtonText}>再試行する</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,59,48,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: Theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorDetailsContainer: {
    width: '100%',
    maxHeight: 150,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: Theme.borderRadius.sm,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  errorText: {
    color: '#ff6b6b',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: Theme.borderRadius.sm,
    width: '100%',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
