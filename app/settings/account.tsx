import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { AccountCard } from '../../components/profile/AccountCard';
import { AiCoachSection } from '../../components/profile/AiCoachSection';
import { PromoCodeModal } from '../../components/profile/PromoCodeModal';
import { PaywallModal } from '../../components/active-workout/PaywallModal';
import { AppInfoSection } from '../../components/profile/AppInfoSection';
import { getSettings, saveSetting, activatePremiumFromPromo } from '../../src/db/database';
import { changeLanguage, getCurrentLanguage } from '../../src/i18n';
import { checkNativeVersion, checkAndApplyOTAUpdate, verifyPromoCode } from '../../src/services/promoService';
import { purchasePremium, restorePurchases } from '../../src/services/iapService';
import { CURRENT_OTA_CONFIG } from '../../src/config/otaUpdateConfig';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

export default function AccountSettingsScreen() {
  const { t, i18n } = useTranslation();
  const settings = useSettingsStore(state => state.settings);
  const setBackgroundTheme = useSettingsStore(state => state.setBackgroundTheme);

  const [accountType, setAccountType] = useState<'basic' | 'premium' | 'premium_limited' | 'early_adopter'>('basic');
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPromoModalVisible, setIsPromoModalVisible] = useState(false);
  const [promoInputText, setPromoInputText] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isCheckingPromoWorkflow, setIsCheckingPromoWorkflow] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [crashConsent, setCrashConsent] = useState(settings.crashConsent);

  const nativeVersion = Updates.runtimeVersion || Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';

  const isPremium = settings.isPremium;
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;
  const maxTokens = (isPremium || isEarly) ? 20 : 5;

  useEffect(() => {
    setCrashConsent(settings.crashConsent);
  }, [settings.crashConsent]);

  const handleChangeLanguage = async (lang: 'ja' | 'en') => {
    changeLanguage(lang);
    setCurrentLang(lang);
    await saveSetting('language', lang);
  };

  const handleUpdateCrashConsent = async (val: boolean) => {
    const consent = val ? 'agreed' : 'declined';
    setCrashConsent(consent);
    useSettingsStore.getState().setCrashConsent(consent);
    await saveSetting('crash_report_consent', consent);
  };

  const handleUpdateBackgroundTheme = (theme: 'dark' | 'pureBlack') => {
    setBackgroundTheme(theme);
  };

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
      useSettingsStore.getState().updatePremiumStatus(newExpiry);
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
        <Text style={styles.headerTitle}>プラン & アプリ情報</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AccountCard
          accountType={accountType}
          premiumUntil={settings.premiumUntil}
          onPressAccountCard={() => setIsPaywallVisible(true)}
          onPressPlanDetail={() => setIsPaywallVisible(true)}
          onPressPromo={handlePromoPress}
          t={t}
        />

        <View style={{ marginTop: Theme.spacing.md }}>
          <AiCoachSection
            aiTokensBalance={settings.aiTokensBalance}
            maxTokens={maxTokens}
            isBasic={isBasic}
            t={t}
          />
        </View>

        {/* Environment & Preferences Section */}
        <View style={{ marginTop: Theme.spacing.md }}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>環境設定</Text>
          </View>
          <View style={styles.preferenceCard}>

          {/* Theme Mode */}
          <View style={styles.settingItemRow}>
            <Text style={styles.settingItemLabel}>背景テーマ (カラーモード)</Text>
            <Text style={styles.settingItemDesc}>アプリ全体の背景色テーマを選択できます。</Text>
            <View style={styles.chipContainer}>
              <TouchableOpacity
                style={[styles.langChip, settings.backgroundTheme === 'dark' && styles.chipActive]}
                onPress={() => handleUpdateBackgroundTheme('dark')}
              >
                <Text style={[styles.chipText, settings.backgroundTheme === 'dark' && styles.chipTextActive]}>🌑 ダーク</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langChip, settings.backgroundTheme === 'pureBlack' && styles.chipActive]}
                onPress={() => handleUpdateBackgroundTheme('pureBlack')}
              >
                <Text style={[styles.chipText, settings.backgroundTheme === 'pureBlack' && styles.chipTextActive]}>⬛ 純黒 / OLED</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Language */}
          <View style={styles.settingItemRow}>
            <Text style={styles.settingItemLabel}>{t('ui.profile.language_label')}</Text>
            <View style={styles.chipContainer}>
              <TouchableOpacity
                style={[styles.langChip, currentLang === 'ja' && styles.chipActive]}
                onPress={() => handleChangeLanguage('ja')}
              >
                <Text style={[styles.chipText, currentLang === 'ja' && styles.chipTextActive]}>🇯🇵 日本語</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langChip, currentLang === 'en' && styles.chipActive]}
                onPress={() => handleChangeLanguage('en')}
              >
                <Text style={[styles.chipText, currentLang === 'en' && styles.chipTextActive]}>🇺🇸 English</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Crash Report Consent */}
          <View style={[styles.settingItemRow, { borderBottomWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingItemLabel}>{t('ui.profile.crash_report_consent_label') || '匿名のクラッシュレポート自動送信'}</Text>
              <Text style={styles.settingItemDesc}>{t('ui.profile.crash_report_consent_desc') || 'アプリが異常終了した際、匿名の診断ログを自動送信して品質改善に協力します。'}</Text>
            </View>
            <Switch
              value={crashConsent === 'agreed'}
              onValueChange={handleUpdateCrashConsent}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>
        </View>
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
  preferenceCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.md },
  sectionTitle: { fontSize: 18, color: Theme.colors.text, fontWeight: 'bold' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm },
  preferenceCardTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text },
  settingItemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  settingItemLabel: { color: Theme.colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  settingItemDesc: { color: Theme.colors.textMuted, fontSize: 12, lineHeight: 16 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  langChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  appInfoWrapper: { marginTop: Theme.spacing.xl },
});
