import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { AccountCard } from '../../components/profile/AccountCard';
import { GoogleAccountSection } from '../../components/profile/GoogleAccountSection';
import { PromoCodeModal } from '../../components/profile/PromoCodeModal';
import { PaywallModal } from '../../components/active-workout/PaywallModal';
import { AppInfoSection } from '../../components/profile/AppInfoSection';
import { getSettings, saveSetting, activatePremiumFromPromo } from '../../src/db/database';
import { changeLanguage, getCurrentLanguage } from '../../src/i18n';
import { checkNativeVersion, checkAndApplyOTAUpdate, verifyPromoCode } from '../../src/services/promoService';
import { purchasePremium, restorePurchases } from '../../src/services/iapService';
import { syncAccountStatusSilently } from '../../src/services/accountSyncService';
import { CURRENT_OTA_CONFIG } from '../../src/config/otaUpdateConfig';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

export default function AccountSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  const fetchAccountType = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchAccountType();
  }, [settings, fetchAccountType]);

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
      syncAccountStatusSilently().catch((e) => console.warn('Promo cloud sync skipped:', e));
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プラン & アプリ情報</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <GoogleAccountSection
          onSyncComplete={fetchAccountType}
          t={t}
        />

        <AccountCard
          accountType={accountType}
          premiumUntil={settings.premiumUntil}
          onPressAccountCard={() => setIsPaywallVisible(true)}
          onPressPlanDetail={() => setIsPaywallVisible(true)}
          onPressPromo={handlePromoPress}
          t={t}
        />

        {/* Environment & Preferences Section */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={24} color={colors.primary} style={{ marginRight: 8 }} />
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
              trackColor={{ false: colors.border, true: colors.primary }}
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

      <Modal
        visible={isPaywallVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isPurchasing && setIsPaywallVisible(false)}
      >
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

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: 16, 
      paddingTop: 54, 
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    content: { padding: 16, paddingBottom: 60 },
    card: { backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginTop: 16 },
    menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    menuTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
    preferenceCard: { backgroundColor: colors.card, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: colors.border },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, color: colors.text, fontWeight: 'bold' },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    preferenceCardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    settingItemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    settingItemLabel: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
    settingItemDesc: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    langChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: colors.primary },
    chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: colors.primary, fontWeight: 'bold' },
    appInfoWrapper: { marginTop: 32 },
  });
