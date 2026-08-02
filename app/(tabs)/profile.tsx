import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTranslation } from 'react-i18next';
import { getSettings } from '../../src/db/database';
import { PaywallModal } from '../../components/active-workout/PaywallModal';
import { purchasePremium, restorePurchases } from '../../src/services/iapService';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const settings = useWorkoutStore(state => state.settings);
  const [accountType, setAccountType] = useState<'basic' | 'premium' | 'premium_limited' | 'early_adopter'>('basic');
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const isPremium = settings.premiumUntil === 'perpetual' || (settings.premiumUntil !== '' && !isNaN(Date.parse(settings.premiumUntil)) && Date.parse(settings.premiumUntil) > Date.now());
  const isEarly = settings.isEarlyAdopter;

  const shouldShowPaywall = useWorkoutStore(state => state.shouldShowPaywall);
  const setShouldShowPaywall = useWorkoutStore(state => state.setShouldShowPaywall);

  useEffect(() => {
    if (shouldShowPaywall) {
      setIsPaywallVisible(true);
      setShouldShowPaywall(false);
    }
  }, [shouldShowPaywall]);

  useEffect(() => {
    const fetchAccountType = async () => {
      try {
        const stored = await getSettings();
        const isEarlyAdopter = stored['is_early_adopter'] === 'true';
        const premiumUntilVal = stored['premium_until'] || '';
        const isPremiumPerpetual = premiumUntilVal === 'perpetual';
        const isPremiumLimited = premiumUntilVal !== '' && premiumUntilVal !== 'perpetual' && !isNaN(Date.parse(premiumUntilVal)) && Date.parse(premiumUntilVal) > Date.now();

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

  const menuItems = [
    {
      id: 'account',
      title: 'アカウント種類 & プラン',
      desc: accountType === 'premium' ? 'プレミアム会員（永久）' : accountType === 'early_adopter' ? 'アーリーアダプター' : 'フリープラン',
      icon: 'person-circle-outline',
      iconColor: '#4facfe',
      route: '/settings/account',
    },
    {
      id: 'gemini',
      title: 'Gemini連携 (AI Coach)',
      desc: `残高: ${settings.aiTokensBalance} 回 (Gemini 3.6 Flash)`,
      icon: 'sparkles',
      iconColor: '#ffd700',
      route: '/settings/gemini',
    },
    {
      id: 'workout-timer',
      title: '筋トレ・タイマー・環境設定',
      desc: '表示項目、インターバルタイマー、重量単位',
      icon: 'barbell-outline',
      iconColor: Theme.colors.primary,
      route: '/settings/workout-timer',
    },
    {
      id: 'export',
      title: 'データ出力 (Markdown/共有)',
      desc: '筋トレ・ライフログのサマリー・ファイル出力',
      icon: 'document-text-outline',
      iconColor: '#4caf50',
      route: '/settings/export',
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
      id: 'obsidian',
      title: 'Obsidian自動連携・蓄積',
      desc: 'Vaultへの自動同期・出力フォルダ設定',
      icon: 'journal-outline',
      iconColor: '#9c27b0',
      route: '/settings/obsidian',
    },
    {
      id: 'app-info',
      title: 'アプリ情報',
      desc: 'バージョン情報、規約、デベロッパーメニュー',
      icon: 'information-circle-outline',
      iconColor: '#00bcd4',
      route: '/settings/app-info',
    },
    {
      id: 'data-management',
      title: 'データ管理',
      desc: 'データベース初期化・デフォルトデータ復元',
      icon: 'warning-outline',
      iconColor: Theme.colors.danger,
      route: '/settings/data-management',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('ui.profile.title') || '設定'}</Text>
        <Text style={styles.subtitle}>アプリの各種設定や連携機能を管理します</Text>
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuCard}
            activeOpacity={0.7}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}15` }]}>
              <Ionicons name={item.icon as any} size={26} color={item.iconColor} />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Paywall Modal */}
      <Modal visible={isPaywallVisible} animationType="slide" transparent={true}>
        <PaywallModal
          isPurchasing={isPurchasing}
          isPremium={isPremium}
          isEarly={isEarly}
          onClose={() => !isPurchasing && setIsPaywallVisible(false)}
          onPurchase={async () => {
            setIsPurchasing(true);
            try { await purchasePremium(); } catch (e) {} finally { setIsPurchasing(false); }
          }}
          onRestore={async () => {
            setIsPurchasing(true);
            try { await restorePurchases(); } catch (e) {} finally { setIsPurchasing(false); }
          }}
          displayPrice={t('ui.profile.paywall.fallback_price')}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  header: { marginBottom: Theme.spacing.lg, marginTop: Theme.spacing.md },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Theme.colors.textMuted },
  menuGrid: { gap: Theme.spacing.md },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  cardContent: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 2 },
  cardDesc: { fontSize: 12, color: Theme.colors.textMuted, lineHeight: 16 },
});
