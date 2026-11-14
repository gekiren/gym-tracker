import { NativeModules, TurboModuleRegistry } from 'react-native';
import { getSettings, saveSetting } from '../db/database';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore, GoogleUserProfile } from '../store/authStore';

// ============================================================================
// 共通アカウント基盤設定（他の自作アプリへ流用する際は APP_ID のみ変更）
// ============================================================================
export const GOOGLE_WEB_CLIENT_ID =
  '964579885772-vj0lkavaarut3ulbli9g2m50igc8kr5c.apps.googleusercontent.com';
export const ACCOUNT_SYNC_API_URL =
  'https://gym-tracker-ai-proxy.toshi-diyil.workers.dev/api/account/sync';
export const APP_ID = 'trenote';

export interface EntitlementStatus {
  isEarlyAdopter: boolean;
  premiumUntil: string;
  aiTokensBalance: number;
}

export interface AccountSyncResult {
  success: boolean;
  user?: GoogleUserProfile;
  entitlement?: EntitlementStatus;
  isGlobalVip?: boolean;
  error?: string;
  requiresNativeUpdate?: boolean;
}

let isGoogleConfigured = false;

/**
 * ネイティブモジュール (RNGoogleSignin) が現在のバイナリに組み込まれているか安全に判定する
 * （OTAアップデート受信時の未対応バイナリでのクラッシュを完全に防止）
 */
export function getGoogleSigninModule(): any | null {
  try {
    const hasNative =
      (TurboModuleRegistry && typeof TurboModuleRegistry.get === 'function' && TurboModuleRegistry.get('RNGoogleSignin')) ||
      NativeModules?.RNGoogleSignin;

    if (!hasNative) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('@react-native-google-signin/google-signin');
    return pkg?.GoogleSignin ? pkg : null;
  } catch {
    return null;
  }
}

/**
 * Google Sign-In の初期設定を行う
 */
export function configureGoogleSignIn(): boolean {
  if (isGoogleConfigured) return true;
  const pkg = getGoogleSigninModule();
  if (!pkg?.GoogleSignin) return false;

  try {
    pkg.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    isGoogleConfigured = true;
    return true;
  } catch (err) {
    console.warn('Failed to configure GoogleSignin:', err);
    return false;
  }
}

/**
 * ステータス昇格マージ（High-Water Mark Merge）
 * ローカルとクラウド（および全アプリ共通VIPフラグ）を比較し、常に上位の権限・長い有効期限を優先する
 */
export function mergeEntitlements(
  local: EntitlementStatus,
  remote?: Partial<EntitlementStatus> | null,
  isGlobalVip: boolean = false
): EntitlementStatus {
  const isEarlyAdopter = Boolean(local.isEarlyAdopter || remote?.isEarlyAdopter);

  let premiumUntil = '';
  const localUntil = local.premiumUntil || '';
  const remoteUntil = remote?.premiumUntil || '';

  if (isGlobalVip || localUntil === 'perpetual' || remoteUntil === 'perpetual') {
    premiumUntil = 'perpetual';
  } else {
    const localTime = localUntil ? Date.parse(localUntil) : NaN;
    const remoteTime = remoteUntil ? Date.parse(remoteUntil) : NaN;
    const validLocal = !isNaN(localTime) ? localTime : 0;
    const validRemote = !isNaN(remoteTime) ? remoteTime : 0;

    if (validLocal > 0 && validLocal >= validRemote) {
      premiumUntil = localUntil;
    } else if (validRemote > 0) {
      premiumUntil = remoteUntil;
    }
  }

  const isEntitled =
    isEarlyAdopter ||
    premiumUntil === 'perpetual' ||
    (premiumUntil !== '' && !isNaN(Date.parse(premiumUntil)) && Date.parse(premiumUntil) > Date.now());

  const maxTokens = Math.max(
    Number(local.aiTokensBalance) || 0,
    Number(remote?.aiTokensBalance) || 0,
    isEntitled ? 20 : 0
  );

  return {
    isEarlyAdopter,
    premiumUntil,
    aiTokensBalance: maxTokens,
  };
}

/**
 * ローカル（SQLite & Zustand）から現在の権限状態を取得する
 */
export async function getLocalEntitlementStatus(): Promise<EntitlementStatus> {
  const stored = await getSettings();
  const stateSettings = useSettingsStore.getState().settings;

  const isEarlyAdopter =
    stored['is_early_adopter'] === 'true' || Boolean(stateSettings.isEarlyAdopter);
  const premiumUntil = stored['premium_until'] || stateSettings.premiumUntil || '';
  const storedTokens = parseInt(stored['ai_tokens_balance'] ?? '', 10);
  const aiTokensBalance = !isNaN(storedTokens)
    ? storedTokens
    : (stateSettings.aiTokensBalance ?? 20);

  return {
    isEarlyAdopter,
    premiumUntil,
    aiTokensBalance,
  };
}

/**
 * 確定した権限ステータスをローカルSQLiteおよびZustandストアへ保存・反映する
 * （SQLiteデッドロック防止のためトランザクション外で逐次保存）
 */
export async function applyEntitlementToLocal(entitlement: EntitlementStatus): Promise<void> {
  await saveSetting('is_early_adopter', entitlement.isEarlyAdopter ? 'true' : 'false');
  await saveSetting('premium_until', entitlement.premiumUntil);
  await saveSetting('ai_tokens_balance', String(entitlement.aiTokensBalance));

  const store = useSettingsStore.getState();
  store.setIsEarlyAdopter(entitlement.isEarlyAdopter);
  store.updatePremiumStatus(entitlement.premiumUntil);
  store.setAITokensBalance(entitlement.aiTokensBalance);
}

/**
 * Cloudflare Worker (/api/account/sync) へIDトークンとローカル権限を送信して同期する
 */
export async function syncWithCloudWorker(
  idToken: string,
  localStatus: EntitlementStatus
): Promise<{
  success: boolean;
  user?: GoogleUserProfile;
  entitlement?: EntitlementStatus;
  isGlobalVip?: boolean;
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const proxySecret = process.env.EXPO_PUBLIC_AI_PROXY_SECRET;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (proxySecret) {
      headers['Authorization'] = `Bearer ${proxySecret}`;
    }

    const response = await fetch(ACCOUNT_SYNC_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idToken,
        appId: APP_ID,
        localStatus,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errData?.error || `Server responded with status ${response.status}`,
      };
    }

    const data = await response.json();
    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Sync failed on server',
      };
    }

    const merged = mergeEntitlements(
      localStatus,
      data.appStatus,
      Boolean(data.isGlobalVip)
    );

    return {
      success: true,
      user: data.user,
      entitlement: merged,
      isGlobalVip: Boolean(data.isGlobalVip),
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      error: err?.message || 'Network error during account sync',
    };
  }
}

/**
 * ユーザーの操作によるGoogleサインイン＆アカウント同期
 */
export async function signInWithGoogle(): Promise<AccountSyncResult> {
  const pkg = getGoogleSigninModule();
  if (!pkg?.GoogleSignin) {
    return {
      success: false,
      requiresNativeUpdate: true,
      error: 'Googleサインイン機能を利用するには、最新のアプリ本体（ネイティブビルド版）への更新が必要です。',
    };
  }

  configureGoogleSignIn();
  useAuthStore.getState().setIsSyncing(true);

  try {
    await pkg.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResponse = await pkg.GoogleSignin.signIn();

    // v13+ returns { type: 'success' | 'cancelled', data: { idToken, user } }, older versions return { idToken, user }
    if (signInResponse?.type === 'cancelled') {
      useAuthStore.getState().setIsSyncing(false);
      return { success: false, error: 'CANCELLED' };
    }

    const userData = signInResponse?.data ?? signInResponse;
    let idToken: string | null = userData?.idToken ?? null;

    if (!idToken && typeof pkg.GoogleSignin.getTokens === 'function') {
      const tokens = await pkg.GoogleSignin.getTokens();
      idToken = tokens?.idToken ?? null;
    }

    if (!idToken) {
      useAuthStore.getState().setIsSyncing(false);
      return {
        success: false,
        error: 'Google IDトークンの取得に失敗しました。クライアントIDの設定を確認してください。',
      };
    }

    const rawUser = userData?.user;
    const fallbackProfile: GoogleUserProfile = {
      id: rawUser?.id || '',
      email: rawUser?.email || '',
      name: rawUser?.name || rawUser?.givenName || null,
      photoUrl: rawUser?.photo || null,
    };

    const localStatus = await getLocalEntitlementStatus();
    const syncRes = await syncWithCloudWorker(idToken, localStatus);

    const finalProfile: GoogleUserProfile = syncRes.user?.email ? syncRes.user : fallbackProfile;
    const finalEntitlement = syncRes.entitlement || localStatus;
    const nowIso = new Date().toISOString();

    await applyEntitlementToLocal(finalEntitlement);
    await saveSetting('google_user_profile', JSON.stringify(finalProfile));
    await saveSetting('google_last_synced_at', nowIso);

    useAuthStore.getState().hydrateAuth(finalProfile, nowIso);
    useAuthStore.getState().setIsSyncing(false);

    return {
      success: true,
      user: finalProfile,
      entitlement: finalEntitlement,
      isGlobalVip: syncRes.isGlobalVip,
    };
  } catch (err: any) {
    useAuthStore.getState().setIsSyncing(false);
    const code = err?.code || '';
    if (code === pkg.statusCodes?.SIGN_IN_CANCELLED || String(err?.message).includes('cancelled')) {
      return { success: false, error: 'CANCELLED' };
    }
    console.warn('Google sign-in error:', err);
    return {
      success: false,
      error: err?.message || 'Googleサインイン中にエラーが発生しました。',
    };
  }
}

/**
 * バックグラウンド（起動時・課金完了時・手動再同期時）でのサイレントステータス同期
 */
export async function syncAccountStatusSilently(): Promise<AccountSyncResult> {
  const pkg = getGoogleSigninModule();
  if (!pkg?.GoogleSignin) {
    return { success: false, error: 'Native module not available' };
  }

  configureGoogleSignIn();
  useAuthStore.getState().setIsSyncing(true);

  try {
    const silentRes = await pkg.GoogleSignin.signInSilently();
    if (silentRes?.type === 'noSavedCredentialFound') {
      useAuthStore.getState().setIsSyncing(false);
      return { success: false, error: 'Not signed in' };
    }

    const userData = silentRes?.data ?? silentRes;
    let idToken: string | null = userData?.idToken ?? null;

    if (!idToken && typeof pkg.GoogleSignin.getTokens === 'function') {
      const tokens = await pkg.GoogleSignin.getTokens();
      idToken = tokens?.idToken ?? null;
    }

    if (!idToken) {
      useAuthStore.getState().setIsSyncing(false);
      return { success: false, error: 'Failed to retrieve idToken silently' };
    }

    const localStatus = await getLocalEntitlementStatus();
    const syncRes = await syncWithCloudWorker(idToken, localStatus);

    if (syncRes.success && syncRes.entitlement) {
      const nowIso = new Date().toISOString();
      await applyEntitlementToLocal(syncRes.entitlement);
      if (syncRes.user?.email) {
        await saveSetting('google_user_profile', JSON.stringify(syncRes.user));
        useAuthStore.getState().setUser(syncRes.user);
      }
      await saveSetting('google_last_synced_at', nowIso);
      useAuthStore.getState().setLastSyncedAt(nowIso);
    }

    useAuthStore.getState().setIsSyncing(false);
    return {
      success: syncRes.success,
      user: syncRes.user,
      entitlement: syncRes.entitlement,
      isGlobalVip: syncRes.isGlobalVip,
      error: syncRes.error,
    };
  } catch (err: any) {
    useAuthStore.getState().setIsSyncing(false);
    return {
      success: false,
      error: err?.message || 'Silent sync failed',
    };
  }
}

/**
 * アプリ起動時にローカルSQLiteから保存済みGoogleプロフィールを復元し、バックグラウンド同期を開始する
 */
export async function initGoogleAuthOnStartup(storedSettings: Record<string, string>): Promise<void> {
  try {
    const rawProfile = storedSettings['google_user_profile'];
    const lastSyncedAt = storedSettings['google_last_synced_at'] || null;

    if (rawProfile) {
      const parsed: GoogleUserProfile = JSON.parse(rawProfile);
      if (parsed && parsed.email) {
        useAuthStore.getState().hydrateAuth(parsed, lastSyncedAt);
        // 非ブロッキングでクラウドと最新ステータスを照合・同期
        syncAccountStatusSilently().catch((e) =>
          console.warn('Background account sync skipped:', e)
        );
      }
    }
  } catch (err) {
    console.warn('Failed to initialize Google auth from storage:', err);
  }
}

/**
 * Googleアカウント連携の解除（サインアウト）
 * ※ローカルの筋トレ記録や現在のプラン権限は消去せず、Googleアカウントの紐付けのみ解除する
 */
export async function signOutGoogle(): Promise<void> {
  const pkg = getGoogleSigninModule();
  if (pkg?.GoogleSignin) {
    try {
      configureGoogleSignIn();
      await pkg.GoogleSignin.signOut();
    } catch (err) {
      console.warn('GoogleSignin.signOut warning:', err);
    }
  }

  await saveSetting('google_user_profile', '');
  await saveSetting('google_last_synced_at', '');
  useAuthStore.getState().clearAuth();
}
