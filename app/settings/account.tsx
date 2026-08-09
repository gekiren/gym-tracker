import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { AccountCard } from '../../components/profile/AccountCard';
import { PromoCodeModal } from '../../components/profile/PromoCodeModal';
import { PaywallModal } from '../../components/active-workout/PaywallModal';
import { AppInfoSection } from '../../components/profile/AppInfoSection';
import { getSettings, activatePremiumFromPromo } from '../../src/db/database';
import { checkNativeVersion, checkAndApplyOTAUpdate, verifyPromoCode } from '../../src/services/promoService';
import { purchasePremium, restorePurchases } from '../../src/services/iapService';
import { CURRENT_OTA_CONFIG } from '../../src/config/otaUpdateConfig';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

export default function AccountSettingsScreen() {
  const { t, i18n } = useTranslation();
  const settings = useWorkoutStore(state => state.settings);

  const [accountType, setAccountType] = useState<'basic' | 'premium' | 'premium_limited' | 'early_adopter'>('basic');
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPromoModalVisible, setIsPromoModalVisible] = useState(false);
  const [promoInputText, setPromoInputText] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isCheckingPromoWorkflow, setIsCheckingPromoWorkflow] = useState(false);

  const nativeVersion = Updates.runtimeVersion || Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';

  const isPremium = settings.isPremium;
  const isEarly = settings.isEarlyAdopter;

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

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await purchasePremium();
    } catch (e: any) {
      setIsPurchasing(false);
      if (e?.code !== 'E_USER_CANCELLED') {
        Alert.alert('エラー', '購入手続きの開始に失敗しました。');
      }
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const restored = await restorePurchases();
      setIsPurchasing(false);
      if (restored) {
        setIsPaywallVisible(false);
        Alert.alert('復元完了', 'プレミアムプランの購入履歴を復元しました！');
      } else {
        Alert.alert('情報', '復元可能な購入履歴が見つかりませんでした。');
      }
    } catch (e) {
      setIsPurchasing(false);
      Alert.alert('エラー', '購入履歴の復元中にエラーが発生しました。');
    }
  };

  const handlePromoPress = async () => {
    if (isCheckingPromoWorkflow) return;
    setIsCheckingPromoWorkflow(true);
    try {
      const versionResult = checkNativeVersion();
      if (!versionResult.isUpToDate) {
        Alert.alert(
          t('ui.profile.app_version_outdated_title') || 'アプリ更新のお願い',
          t('ui.profile.app_version_outdated_msg') || '最新バージョンが利用可能です。ストアからアプリを更新してください。'
        );
        setIsCheckingPromoWorkflow(false);
        return;
      }
      const otaResult = await checkAndApplyOTAUpdate();
      if (otaResult.isUpdateTriggered) return;
      setIsPromoModalVisible(true);
    } catch (err) {
      Alert.alert(t('ui.common.error') || 'エラー', '検証中にエラーが発生しました。');
    } finally {
      setIsCheckingPromoWorkflow(false);
    }
  };

  const handleApplyPromo = async () => {
    if (isApplyingPromo || promoInputText.trim() === '') return;
    setIsApplyingPromo(true);
    try {
      const isValid = await verifyPromoCode(promoInputText);
      if (!isValid) {
        Alert.alert('認証エラー', '無効なコードであるか、プロモーション期間外です。');
        setIsApplyingPromo(false);
        return;
      }
      const newExpiry = await activatePremiumFromPromo();
      useWorkoutStore.getState().updatePremiumStatus(newExpiry);
      setIsPromoModalVisible(false);
      setPromoInputText('');
      Alert.alert('適用完了', 'プロモーションコードが適用されました！プレミアムプランが1ヶ月間有効になりました。');
    } catch (err) {
      Alert.alert('エラー', 'プロモーションコードの適用に失敗しました。');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>アカウント & アプリ情報</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AccountCard
          accountType={accountType}
          premiumUntil={settings.premiumUntil}
          onPressAccountCard={() => setIsPaywallVisible(true)}
          t={t}
        />

        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow} onPress={handlePromoPress}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="ticket-outline" size={22} color={Theme.colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.menuTitle}>プロモーションコード入力</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} onPress={() => setIsPaywallVisible(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="ribbon-outline" size={22} color="#ffd700" style={{ marginRight: 12 }} />
              <Text style={styles.menuTitle}>プラン詳細 / アップグレード</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
        </View>

        <View style={styles.appInfoWrapper}>
          <AppInfoSection
            currentOtaVersion={CURRENT_OTA_CONFIG.version}
            nativeVersion={nativeVersion}
            t={t}
          />
        </View>
      </ScrollView>

      <Modal visible={isPaywallVisible} animationType="slide" transparent={true}>
        <PaywallModal
          isPurchasing={isPurchasing}
          isPremium={isPremium}
          isEarly={isEarly}
          onClose={() => !isPurchasing && setIsPaywallVisible(false)}
          onPurchase={handlePurchase}
          onRestore={handleRestore}
          displayPrice={t('ui.profile.paywall.fallback_price')}
        />
      </Modal>

      <PromoCodeModal
        visible={isPromoModalVisible}
        onClose={() => {
          setIsPromoModalVisible(false);
          setPromoInputText('');
        }}
        promoInputText={promoInputText}
        onChangePromoInputText={setPromoInputText}
        isApplyingPromo={isApplyingPromo}
        onApplyPromo={handleApplyPromo}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Theme.spacing.md, 
    paddingTop: 54, 
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  content: { padding: Theme.spacing.md, paddingBottom: 60 },
  card: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border, marginTop: Theme.spacing.md },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  menuTitle: { fontSize: 16, fontWeight: '600', color: Theme.colors.text },
  appInfoWrapper: { marginTop: Theme.spacing.xl },
});
