import { saveSetting, getAITokensBalance } from '../db/database';
import i18n from '../i18n';
import * as Localization from 'expo-localization';
import { DEFAULT_STANCES } from '../utils/stances';
import {
  initializeSentry,
  checkHasCrashLog,
  readCrashLog,
  deleteCrashLog,
  sendCrashReport,
} from './crashReporterService';
import * as Updates from 'expo-updates';
import { useOTAUpdateStore } from '../store/otaUpdateStore';
import { syncLifelogToObsidian } from './obsidianService';
import { syncHealthData } from './healthService';
import { Alert } from 'react-native';
import { router } from 'expo-router';

/**
 * 1. 言語および重量単位の初期化と設定
 */
export async function initLanguageAndUnits(storedSettings: Record<string, string>) {
  let currentLang = storedSettings['language'];
  if (storedSettings['language']) {
    // 2回目以降：DBに保存された言語を使用
    i18n.changeLanguage(storedSettings['language']);
  } else {
    // 初回起動時のみ：端末の言語を検知して使用＆保存
    const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'ja';
    const initialLang = ['ja', 'en'].includes(deviceLocale) ? deviceLocale : 'ja';
    i18n.changeLanguage(initialLang);
    await saveSetting('language', initialLang);
    currentLang = initialLang;
  }

  let needsUnitSelection = !storedSettings['weight_unit'];
  let weightUnit = (storedSettings['weight_unit'] === 'lbs' ? 'lbs' : 'kg') as 'kg' | 'lbs';

  // 既存設定（RPE, 1RM, ボリューム, スタンス, または単位設定等）が存在するか判定
  const hasExistingDisplaySettings =
    storedSettings['display_rpe'] !== undefined ||
    storedSettings['display_1rm'] !== undefined ||
    storedSettings['display_volume'] !== undefined ||
    storedSettings['display_stance'] !== undefined ||
    Boolean(storedSettings['weight_unit']);

  let needsStyleSelection = !storedSettings['style_mode'];

  if (needsStyleSelection && hasExistingDisplaySettings) {
    needsStyleSelection = false;
    saveSetting('style_mode', 'custom').catch((e) => console.warn('Failed to auto-save style_mode', e));
  }

  // 日本語話者の場合は、初回起動時に自動で kg を設定し、選択モーダルをスキップする
  if (needsUnitSelection && currentLang === 'ja') {
    await saveSetting('weight_unit', 'kg');
    weightUnit = 'kg';
    needsUnitSelection = false;
  }

  return {
    currentLang,
    weightUnit,
    needsUnitSelection,
    needsStyleSelection,
  };
}

/**
 * 2. クラッシュレポートの初期化と未送信ログ処理
 */
export async function initCrashReporting(storedSettings: Record<string, string>) {
  const crashConsent = (storedSettings['crash_report_consent'] ?? 'unset') as
    | 'agreed'
    | 'declined'
    | 'unset';

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

  return {
    crashConsent,
    hasUnsentLog,
  };
}

/**
 * 3. OTAアップデートのオーバーライドおよび通知チェック
 */
export async function initOTAUpdateCheck(
  storedSettings: Record<string, string>,
  isFirstInstall: boolean
) {
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

  if (isFirstInstall) {
    // 初インストール時はインフォメーションを非表示にし、次回起動時に備えて現在のupdateIdを承認済みにする
    if (Updates.updateId) {
      await saveSetting('last_acknowledged_update_id', Updates.updateId);
    }
  } else {
    if (Updates.updateId && Updates.updateId !== lastAckUpdateId) {
      showOTA = true;
      await saveSetting('last_acknowledged_update_id', Updates.updateId);
    } else if (simulateOta) {
      showOTA = true;
      await saveSetting('simulate_ota_popup', '0');
    }
  }

  if (showOTA) {
    setTimeout(() => {
      useOTAUpdateStore.getState().showModal();
    }, 500);
  }
}

/**
 * 4. サブスクリプションおよびAIトークンの初期化と期限判定
 */
export async function initSubscriptionAndTokens(storedSettings: Record<string, string>) {
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

  return {
    finalPremiumUntil,
    finalTokensBalance,
    expired,
    isEarlyAdopter,
  };
}

/**
 * 5. スタンス設定の読み込みと v3 移行処理
 */
export async function initStanceSettings(storedSettings: Record<string, string>) {
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
        const toDelete = [
          'スモウ',
          'コンベンショナル',
          'オルタネイトグリップ',
          'サムレスグリップ',
          'フックグリップ',
          'ポーズ',
          'デッドストップ',
          'ニュートラルグリップ',
        ];

        // 削除
        stored = stored.filter((s: string) => !toDelete.includes(s));

        // リバースグリップ -> 逆手 (すでにあれば統合)
        if (stored.includes('リバースグリップ')) {
          stored = stored.map((s: string) => (s === 'リバースグリップ' ? '逆手' : s));
        }

        finalStances = Array.from(new Set([...stored, ...DEFAULT_STANCES]));

        await saveSetting('custom_stances', JSON.stringify(finalStances));
        await saveSetting('stances_migrated_v3', '1');
      } else {
        finalStances = stored;
      }
    } catch (e) {
      console.warn('Failed to parse custom_stances', e);
      finalStances = DEFAULT_STANCES;
    }
  }

  return finalStances;
}

/**
 * 6. バックグラウンド同期サービスおよび期限切れアラートの起動
 */
export function initBackgroundSyncServices(expired: boolean) {
  // Obsidian Vault へのライフログ自動同期（起動時・定時チェック）
  syncLifelogToObsidian().catch((syncErr) => {
    console.warn('Obsidian lifelog sync failed on launch:', syncErr);
  });

  // ヘルスコネクト自動アクセス（起動時）
  syncHealthData({ reason: 'launch' }).catch((hErr) => {
    console.warn('Health Connect sync failed on launch:', hErr);
  });

  if (expired) {
    setTimeout(() => {
      Alert.alert(
        i18n.t('ui.profile.promo_expired_title') || 'プレミアム期間の終了',
        i18n.t('ui.profile.promo_expired_msg') ||
          'プレミアムプラン（お試し）の有効期限が終了したため、元のプランに戻りました。',
        [
          {
            text: 'OK',
            onPress: () => {
              router.navigate('/(tabs)/profile');
            },
          },
        ]
      );
    }, 100);
  }
}
