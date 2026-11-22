import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, usePathname, ErrorBoundaryProps } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef, useMemo } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Alert, AppState, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as Updates from 'expo-updates';
import mobileAds from 'react-native-google-mobile-ads';
import { initDB, getSettings, saveSetting, triggerBackgroundBackup } from '../src/db/database';
import { useAppTheme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore, FeatureId } from '../src/store/settingsStore';
import {
  parseExerciseChartMetric,
  parseExerciseChartScale,
  parseExerciseChartPreferences,
  parseExercisePrCollapsedStances,
} from '../src/utils/exerciseDetailPrefs';
import { useNutritionStore } from '../src/store/nutritionStore';
import { useOTAUpdateStore } from '../src/store/otaUpdateStore';
import '../src/i18n';
import i18n from '../src/i18n';
import { registerGlobalErrorHandler } from '../src/services/crashReporterService';
import { ReviewPromptModal } from '../components/ReviewPromptModal';
import { OTAUpdateModal } from '../components/OTAUpdateModal';
import { PointAwardToast } from '../components/PointAwardToast';
import { MedalUnlockToast } from '../components/MedalUnlockToast';
import { ClassUpModal } from '../components/ClassUpModal';
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
import { initFeatureUnlockState } from '../src/services/featureUnlockService';
import { initGamificationState } from '../src/services/gamificationService';
import { useGoogleDriveSyncStore } from '../src/store/googleDriveSyncStore';
import {
  approvePendingProposal,
  checkDriveForProposals,
  flushPendingDriveUpload,
} from '../src/services/googleDriveSyncService';

// アプリの起動時にグローバルエラーハンドラを登録
registerGlobalErrorHandler();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const { colors } = useAppTheme();
  const navigationTheme = useMemo(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    }),
    [colors]
  );
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const pendingProposal = useGoogleDriveSyncStore((s) => s.pendingProposal);
  const promptedProposalKeyRef = useRef<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!pendingProposal) {
      promptedProposalKeyRef.current = null;
      return;
    }
    if (pathname === '/settings/google-drive-sync') {
      return;
    }
    const key = `${pendingProposal.payload.proposalId}::${pendingProposal.payload.updatedAt}`;
    if (promptedProposalKeyRef.current === key) {
      return;
    }
    promptedProposalKeyRef.current = key;

    Alert.alert(
      'AIトレーナーからの提案があります',
      `${pendingProposal.previewSummary}\n\nGoogleドライブ同期設定画面で内容を確認して反映できます。`,
      [
        { text: 'あとで確認', style: 'cancel' },
        {
          text: '詳細を見る',
          onPress: () => router.push('/settings/google-drive-sync' as any),
        },
        {
          text: '今すぐ反映',
          onPress: async () => {
            const res = await approvePendingProposal();
            if (!res.success && res.error) {
              Alert.alert('反映エラー', res.error);
            } else if (res.success) {
              Alert.alert('AI提案を反映しました', res.summary || '反映が完了しました。');
            }
          },
        },
      ]
    );
  }, [pendingProposal, pathname]);

  const setupDB = async () => {
    setDbReady(false);
    setDbError(null);
    try {
      await initDB();
      const storedSettings = await getSettings();

      // カメラ撮影中のActivity破棄からのリカバリー判定
      let shouldRecoverNutritionCamera = false;
      const pendingCameraRaw = storedSettings['pending_nutrition_camera_state'];
      if (pendingCameraRaw) {
        try {
          const parsed = JSON.parse(pendingCameraRaw);
          if (
            parsed &&
            parsed.active &&
            typeof parsed.timestamp === 'number' &&
            Date.now() - parsed.timestamp < 15 * 60 * 1000
          ) {
            useNutritionStore.getState().setPendingCameraState(parsed);
            useOTAUpdateStore.getState().suppressModal();
            shouldRecoverNutritionCamera = true;
          } else {
            await saveSetting('pending_nutrition_camera_state', '');
          }
        } catch (e) {
          console.warn('Failed to parse pending_nutrition_camera_state:', e);
          await saveSetting('pending_nutrition_camera_state', '');
        }
      }

      const defaultRest = storedSettings['default_rest_timer'] ? parseInt(storedSettings['default_rest_timer'], 10) : 90;
      const autoRest = storedSettings['auto_rest_timer'] ? storedSettings['auto_rest_timer'] === '1' : true;
      const individualRestEnabled = storedSettings['individual_rest_timer'] === '1';
      const timerVibrate = storedSettings['timer_vibrate'] ? storedSettings['timer_vibrate'] === '1' : true;
      const keepAwake = storedSettings['keep_awake'] ? storedSettings['keep_awake'] === '1' : true;
      const bodyWeight = storedSettings['body_weight'] ? parseFloat(storedSettings['body_weight']) : null;
      const alwaysOneSet = storedSettings['always_one_set'] === '1';
      let preferredAiModel: 'gemini' | 'gemma-31b' | 'gemma-26b' | 'deepseek' = 'gemini';
      const storedModel = storedSettings['preferred_ai_model'];
      if (storedModel === 'gemma-31b' || storedModel === 'gemma-26b' || storedModel === 'deepseek' || storedModel === 'gemini') {
        preferredAiModel = storedModel;
      }
      if (Updates.channel === 'production') {
        // 本番環境では安全のためデフォルトのGeminiに固定
        preferredAiModel = 'gemini';
      }
      const aiChatMode = (storedSettings['ai_chat_mode'] === 'thinking' ? 'thinking' : 'quick') as 'quick' | 'thinking';
      const backgroundTheme = (storedSettings['background_theme'] === 'pureBlack' ? 'pureBlack' : 'dark') as 'dark' | 'pureBlack';

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

      // 4.5 機能管理設定（表示順・表示ON/OFF）
      const ALL_FEATURES: FeatureId[] = ['workout', 'body', 'water', 'nutrition', 'zikan', 'routine', 'habit', 'voice_ai'];
      let featureOrder: FeatureId[] = ALL_FEATURES;
      if (storedSettings['feature_order']) {
        try {
          const parsed = JSON.parse(storedSettings['feature_order']);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((id: any) => ALL_FEATURES.includes(id as FeatureId)) as FeatureId[];
            ALL_FEATURES.forEach(id => {
              if (!valid.includes(id)) valid.push(id);
            });
            featureOrder = valid;
          }
        } catch (e) {
          console.warn('Failed to parse feature_order', e);
        }
      }

      let featureVisibility: Record<FeatureId, boolean> = { workout: true, body: true, water: true, nutrition: true, zikan: true, routine: true, habit: true, voice_ai: true };
      if (storedSettings['feature_visibility']) {
        try {
          const parsed = JSON.parse(storedSettings['feature_visibility']);
          if (parsed && typeof parsed === 'object') {
            featureVisibility = { ...featureVisibility, ...parsed };
          }
        } catch (e) {
          console.warn('Failed to parse feature_visibility', e);
        }
      }

      const timerNotification = storedSettings['timer_notification'] !== '0';
      const aiCompanionMemory = storedSettings['ai_companion_memory'] || '';
      const lastExerciseChartMetric = parseExerciseChartMetric(storedSettings['last_exercise_chart_metric']);
      const lastExerciseChartScale = parseExerciseChartScale(storedSettings['last_exercise_chart_scale']);
      const exerciseChartPreferences = parseExerciseChartPreferences(storedSettings['exercise_chart_preferences']);
      const exercisePrCollapsedStances = parseExercisePrCollapsedStances(storedSettings['exercise_pr_collapsed_stances']);
      const lastHistoryChartMetric = storedSettings['last_history_chart_metric'] as any;

      // 5. ストアへの設定ロード
      useSettingsStore.getState().loadSettings({
        defaultRest,
        autoRest,
        individualRestEnabled,
        timerNotification,
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
        backgroundTheme,
        featureOrder,
        featureVisibility,
        aiCompanionMemory,
        lastExerciseChartMetric,
        lastExerciseChartScale,
        exerciseChartPreferences,
        exercisePrCollapsedStances,
        lastHistoryChartMetric,
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

      // 6.5 機能開放＆Pポイントの初期化とレトロアクティブ計算
      await initFeatureUnlockState(storedSettings);

      // 6.55 2階層クラス・XP・実績メダルの初期化とレトロアクティブ計算
      await initGamificationState(storedSettings);

      const currentSettings = useSettingsStore.getState().settings;
      if (!currentSettings.isPremium && !currentSettings.isEarlyAdopter) {
        mobileAds()
          .initialize()
          .then((adapterStatuses) => {
            console.log('Google Mobile Ads SDK initialized successfully:', adapterStatuses);
          })
          .catch((err) => {
            console.warn('Failed to initialize Google Mobile Ads SDK:', err);
          });
      }

      // 6.6 OTA再起動フラグの判定とトップ画面（ダッシュボード）確実化
      const isOtaReload = storedSettings['ota_reload_in_progress'] === '1';
      if (isOtaReload) {
        await saveSetting('ota_reload_in_progress', '0');
        if (!shouldRecoverNutritionCamera) {
        console.log('[OTA] Detected reload after OTA update. Enforcing top-level Dashboard navigation.');
        setTimeout(() => {
          try {
            router.replace('/');
          } catch (navErr) {
            console.warn('Failed to force navigate to / after OTA reload:', navErr);
          }
        }, 150);
        }
      }

      console.log('Database initialized successfully with settings', storedSettings);
      setDbReady(true);

      if (shouldRecoverNutritionCamera) {
        console.log('[CameraRecovery] Detected pending nutrition camera state. Navigating to /lifelog/nutrition.');
        setTimeout(() => {
          try {
            if (pathnameRef.current !== '/lifelog/nutrition') {
              router.replace('/lifelog/nutrition');
            }
          } catch (navErr) {
            console.warn('Failed to navigate to /lifelog/nutrition for camera recovery:', navErr);
          }
        }, 100);
      }

      // 7. バックグラウンド同期・アラート等の起動
      initBackgroundSyncServices(expired);
    } catch (e: any) {
      console.error('Failed to initialize database', e);
      setDbError(e?.message || String(e));
    }
  };

  useEffect(() => {
    setupDB();

    // 通知アクションカテゴリ初期化＆リスナーセットアップ
    initNotificationCategories();
    const cleanupNotificationListener = setupNotificationResponseListener();

    // ヘルスコネクトの定時アクセス監視タイマー (15分ごとにチェック)
    const healthSyncInterval = setInterval(() => {
      syncHealthData({ reason: 'periodic' }).catch(console.error);
    }, 15 * 60 * 1000);

    // Google Drive AI提案の定時チェックタイマー (アクティブ時5分ごと)
    const driveSyncInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        checkDriveForProposals({ interactive: false, reason: 'periodic' }).catch((err: unknown) => {
          console.warn('Periodic Google Drive proposal check failed:', err);
        });
      }
    }, 5 * 60 * 1000);

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'background') {
        // バックグラウンド移行時の自動バックアップ（未退避変更の回収 ＆ 5分スロットル）
        triggerBackgroundBackup().catch((err) => {
          console.warn('Failed to run background backup on app background:', err);
        });
        // Google Drive AI同期の未アップロード変更を即時フラッシュ
        flushPendingDriveUpload('background').catch((err: unknown) => {
          console.warn('Failed to flush Google Drive upload on background:', err);
        });
      } else if (nextAppState === 'active') {
        // アプリフォアグラウンド復帰時にヘルスコネクトに自動アクセス
        syncHealthData({ reason: 'launch' }).catch(console.error);
        // Google Drive AI提案の自動チェック
        checkDriveForProposals({ interactive: false, reason: 'app_active' }).catch((err: unknown) => {
          console.warn('Google Drive proposal check on active failed:', err);
        });

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
      clearInterval(driveSyncInterval);
    };
  }, []);

  if (dbError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>{i18n.t('ui.profile.db_error_title')}</Text>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>{i18n.t('ui.profile.db_error_text')}</Text>
        <Text style={[styles.errorText, { color: colors.danger, fontSize: 12 }]}>{dbError}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={setupDB}>
          <Text style={styles.retryBtnText}>{i18n.t('ui.profile.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider statusBarTranslucent={true}>
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="select-exercise" options={{ presentation: 'modal', title: i18n.t('ui.profile.screen_title_select_exercise') }} />
            <Stack.Screen name="active-workout" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="workout-completion" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="build-routine" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="exercise/[id]" getId={({ params }) => String(params?.id ?? '')} options={{ presentation: 'card' }} />
            <Stack.Screen name="edit-workout/[id]" getId={({ params }) => String(params?.id ?? '')} options={{ presentation: 'card' }} />
            <Stack.Screen name="workout-details/[id]" getId={({ params }) => String(params?.id ?? '')} options={{ presentation: 'card' }} />
            <Stack.Screen name="rm-calculator" options={{ presentation: 'card' }} />
            <Stack.Screen name="privacy-policy" options={{ presentation: 'card' }} />
            <Stack.Screen name="developer-menu" options={{ presentation: 'card' }} />
            <Stack.Screen name="gamification" options={{ headerShown: false }} />
            <Stack.Screen name="lifelog/nutrition" options={{ presentation: 'card' }} />
          </Stack>
          <ReviewPromptModal />
          <OTAUpdateModal />
          <PointAwardToast />
          <MedalUnlockToast />
          <ClassUpModal />
          <StatusBar style="light" />
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20
  },
  retryBtn: {
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[errorStyles.container, { backgroundColor: colors.background }]}>
      <View style={[errorStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={errorStyles.iconOuter}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        </View>
        <Text style={[errorStyles.title, { color: colors.text }]}>問題が発生しました</Text>
        <Text style={[errorStyles.message, { color: colors.textMuted }]}>
          アプリの実行中に予期しないエラーが発生しました。お手数ですが、以下のボタンから再試行してください。
        </Text>
        <ScrollView
          style={[errorStyles.errorDetailsContainer, { borderColor: colors.border }]}
          contentContainerStyle={{ padding: 12 }}
        >
          <Text style={errorStyles.errorText}>{error.stack || error.message}</Text>
        </ScrollView>
        <TouchableOpacity
          style={[errorStyles.retryButton, { backgroundColor: colors.primary }]}
          onPress={retry}
          activeOpacity={0.8}
        >
          <Text style={errorStyles.retryButtonText}>再試行する</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorDetailsContainer: {
    width: '100%',
    maxHeight: 150,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
  },
  errorText: {
    color: '#ff6b6b',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
