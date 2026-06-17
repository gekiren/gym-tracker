import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, ErrorBoundaryProps } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Alert, AppState, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import mobileAds from 'react-native-google-mobile-ads';
import { initDB, getSettings, saveSetting, getAITokensBalance } from '../src/db/database';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import '../src/i18n';
import i18n, { getCurrentLanguage } from '../src/i18n';
import * as Localization from 'expo-localization';
import { DEFAULT_STANCES } from '../src/utils/stances';
import { registerGlobalErrorHandler, checkHasCrashLog, readCrashLog, deleteCrashLog, sendCrashReport, initializeSentry } from '../src/services/crashReporterService';
import { ReviewPromptModal } from '../components/ReviewPromptModal';
import * as Updates from 'expo-updates';
import { useOTAUpdateStore } from '../src/store/otaUpdateStore';
import { OTAUpdateModal } from '../components/OTAUpdateModal';
import { KeyboardProvider } from 'react-native-keyboard-controller';

// アプリの起動時にグローバルエラーハンドラを登録
registerGlobalErrorHandler();

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
      const timerVibrate = storedSettings['timer_vibrate'] ? storedSettings['timer_vibrate'] === '1' : true;
      const keepAwake = storedSettings['keep_awake'] ? storedSettings['keep_awake'] === '1' : true;
      
      const needsUnitSelection = !storedSettings['weight_unit'];
      const needsStyleSelection = !storedSettings['style_mode'];
      const weightUnit = (storedSettings['weight_unit'] === 'lbs' ? 'lbs' : 'kg') as 'kg' | 'lbs';

      // クラッシュレポート同意ステータスと未送信ログのチェック
      const crashConsent = (storedSettings['crash_report_consent'] ?? 'unset') as 'agreed' | 'declined' | 'unset';
      
      if (crashConsent === 'agreed') {
        initializeSentry();
      }

      const hasCrashLog = await checkHasCrashLog();
      let hasUnsentLog = false;

      if (hasCrashLog) {
        if (crashConsent === 'agreed') {
          // 同意済み：バックグラウンド送信して破棄
          const log = await readCrashLog();
          if (log) {
            sendCrashReport(log).catch(console.error);
          }
          await deleteCrashLog();
        } else if (crashConsent === 'declined') {
          // 拒否済み：破棄のみ
          await deleteCrashLog();
        } else {
          // 未設定：次回起動時の確認ポップアップ表示フラグを立てる
          hasUnsentLog = true;
        }
      }

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

      // OTAチャンネルのオーバーライド設定を読み込み・適用
      const channelOverride = storedSettings['ota_channel_override'] || '';
      if (channelOverride && Updates.isEnabled && !__DEV__) {
        try {
          await Updates.setUpdateRequestHeadersOverride({ 'expo-channel-name': channelOverride });
          console.log('Successfully applied update request headers override on startup:', channelOverride);
        } catch (e) {
          console.warn('Failed to apply update request headers override on startup:', e);
        }
      }

      // OTAアップデート後の初回起動検知
      let showOTA = false;
      const lastAckUpdateId = storedSettings['last_acknowledged_update_id'] || '';
      const simulateOta = storedSettings['simulate_ota_popup'] === '1';

      if (Updates.updateId && Updates.updateId !== lastAckUpdateId) {
        showOTA = true;
        await saveSetting('last_acknowledged_update_id', Updates.updateId);
      } else if (simulateOta) {
        showOTA = true;
        await saveSetting('simulate_ota_popup', '0');
      }

      if (showOTA) {
        setTimeout(() => {
          useOTAUpdateStore.getState().showModal();
        }, 500);
      }

      const bodyWeight = storedSettings['body_weight'] ? parseFloat(storedSettings['body_weight']) : null;
      const alwaysOneSet = storedSettings['always_one_set'] === '1';
      const tokensBalance = await getAITokensBalance();
      const premiumUntil = storedSettings['premium_until'] || '';
      const isEarlyAdopter = storedSettings['is_early_adopter'] === 'true';
      
      let finalPremiumUntil = premiumUntil;
      let finalTokensBalance = tokensBalance;
      let expired = false;

      if (premiumUntil !== '' && premiumUntil !== 'perpetual') {
        const expiry = Date.parse(premiumUntil);
        if (!isNaN(expiry) && expiry <= Date.now()) {
          expired = true;
          finalPremiumUntil = '';
          await saveSetting('premium_until', '');
          if (!isEarlyAdopter) {
            finalTokensBalance = 5;
            await saveSetting('ai_tokens_balance', '5');
          }
        }
      }

      useWorkoutStore.getState().loadSettings({
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
        alwaysOneSet
      });
      if (expired) {
        useWorkoutStore.getState().setShouldShowPaywall(true);
      }
      useWorkoutStore.getState().setHasUnsentCrashLog(hasUnsentLog);
      
      // Display fields
      const showRpe = storedSettings['display_rpe'] !== '0';
      const show1RM = storedSettings['display_1rm'] !== '0';
      const showVolume = storedSettings['display_volume'] !== '0';
      const showStance = storedSettings['display_stance'] !== '0';
      useWorkoutStore.getState().setDisplayFields({ showRpe, show1RM, showVolume, showStance });
      
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
            const toDelete = ['スモウ', 'コンベンショナル', 'オルタネイトグリップ', 'サムレスグリップ', 'フックグリップ', 'ポーズ', 'デッドストップ', 'ニュートラルグリップ'];
            
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
      if (expired) {
        setTimeout(() => {
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
        }, 100);
      }
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

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const settings = useWorkoutStore.getState().settings;
        const premiumUntil = settings.premiumUntil;
        if (premiumUntil && premiumUntil !== 'perpetual') {
          const expiry = Date.parse(premiumUntil);
          if (!isNaN(expiry) && expiry <= Date.now()) {
            await saveSetting('premium_until', '');
            const isEarly = settings.isEarlyAdopter;
            if (!isEarly) {
              await saveSetting('ai_tokens_balance', '5');
            }
            
            useWorkoutStore.getState().setPremiumUntil('');
            if (!isEarly) {
              useWorkoutStore.getState().setAITokensBalance(5);
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
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="select-exercise" options={{ presentation: 'modal', title: i18n.t('ui.profile.screen_title_select_exercise') }} />
            <Stack.Screen name="active-workout" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="workout-completion" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="build-routine" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="exercise/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="edit-workout/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="rm-calculator" options={{ presentation: 'card' }} />
            <Stack.Screen name="privacy-policy" options={{ presentation: 'card' }} />
            <Stack.Screen name="developer-menu" options={{ presentation: 'card' }} />
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
