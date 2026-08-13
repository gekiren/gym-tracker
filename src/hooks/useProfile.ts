import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../store/workoutStore';
import { useSettingsStore } from '../store/settingsStore';
import { getSettings } from '../db/database';
import { Theme } from '../theme';
import { purchasePremium, restorePurchases } from '../services/iapService';

export type AccountType = 'basic' | 'premium' | 'premium_limited' | 'early_adopter';

export interface MenuItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  iconColor: string;
  route: string;
}

export function useProfile() {
  const { t } = useTranslation();
  const settings = useSettingsStore(state => state.settings);
  const shouldShowPaywall = useWorkoutStore(state => state.shouldShowPaywall);
  const setShouldShowPaywall = useWorkoutStore(state => state.setShouldShowPaywall);

  const [accountType, setAccountType] = useState<AccountType>('basic');
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const isPremium = settings.isPremium;
  const isEarly = settings.isEarlyAdopter;

  // Paywall display trigger
  useEffect(() => {
    if (shouldShowPaywall) {
      setIsPaywallVisible(true);
      setShouldShowPaywall(false);
    }
  }, [shouldShowPaywall, setShouldShowPaywall]);

  // Fetch account type
  useEffect(() => {
    const fetchAccountType = async () => {
      try {
        const stored = await getSettings();
        const isEarlyAdopter = stored['is_early_adopter'] === 'true';
        const premiumUntilVal = stored['premium_until'] || '';
        const isPremiumPerpetual = premiumUntilVal === 'perpetual';
        const isPremiumLimited =
          premiumUntilVal !== '' &&
          premiumUntilVal !== 'perpetual' &&
          !isNaN(Date.parse(premiumUntilVal)) &&
          Date.parse(premiumUntilVal) > Date.now();

        if (isEarlyAdopter) setAccountType('early_adopter');
        else if (isPremiumPerpetual) setAccountType('premium');
        else if (isPremiumLimited) setAccountType('premium_limited');
        else setAccountType('basic');
      } catch (err) {
        console.warn('Failed to fetch account type', err);
      }
    };
    fetchAccountType();
  }, [settings]);

  // Purchase handler
  const handlePurchase = useCallback(async () => {
    setIsPurchasing(true);
    try {
      await purchasePremium();
    } catch (e) {
      console.warn('Purchase error', e);
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  // Restore handler
  const handleRestore = useCallback(async () => {
    setIsPurchasing(true);
    try {
      await restorePurchases();
    } catch (e) {
      console.warn('Restore error', e);
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  // Dynamic menu items
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        id: 'account',
        title: 'プラン & アプリ情報',
        desc: `AI残高: ${settings.aiTokensBalance} 回 • 環境設定 • バージョン`,
        icon: 'person-circle-outline',
        iconColor: '#4facfe',
        route: '/settings/account',
      },
      {
        id: 'feature-management',
        title: '機能管理',
        desc: 'ダッシュボードの表示機能・表示順の設定',
        icon: 'options-outline',
        iconColor: '#e91e63',
        route: '/settings/feature-management',
      },
      {
        id: 'obsidian',
        title: 'データ出力 & Obsidian連携',
        desc: 'Markdown出力・共有・Obsidian自動同期',
        icon: 'journal-outline',
        iconColor: '#9c27b0',
        route: '/settings/obsidian',
      },
      {
        id: 'backup',
        title: 'バックアップ・復元',
        desc: 'SQLiteデータベースの保存と復元',
        icon: 'cloud-upload-outline',
        iconColor: '#ff9800',
        route: '/settings/backup',
      },


      {
        id: 'data-management',
        title: 'データ管理',
        desc: 'データベース初期化・デフォルトデータ復元',
        icon: 'warning-outline',
        iconColor: Theme.colors.danger,
        route: '/settings/data-management',
      },
    ],
    [accountType, settings.aiTokensBalance]
  );

  return {
    t,
    accountType,
    isPaywallVisible,
    setIsPaywallVisible,
    isPurchasing,
    isPremium,
    isEarly,
    menuItems,
    handlePurchase,
    handleRestore,
  };
}
