import { View, Text, StyleSheet, ScrollView, Modal, Alert, UIManager, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { saveSetting, resetDatabase, getSettings, getDB, closeDB, initDB, activatePremiumFromPromo } from '../../src/db/database';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../../src/i18n';
import { checkNativeVersion, checkAndApplyOTAUpdate, verifyPromoCode } from '../../src/services/promoService';
import { initIAPConnection, setupIAPListeners, purchasePremium, restorePurchases, cleanupIAP, fetchPremiumProducts, PREMIUM_PRODUCT_ID } from '../../src/services/iapService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Updates from 'expo-updates';
import { CURRENT_OTA_CONFIG } from '../../src/config/otaUpdateConfig';
import { PaywallModal } from '../../components/active-workout/PaywallModal';

// Subcomponents
import { AccountCard } from '../../components/profile/AccountCard';
import { AiCoachSection } from '../../components/profile/AiCoachSection';
import { DisplayFieldsSection } from '../../components/profile/DisplayFieldsSection';
import { TimerSection } from '../../components/profile/TimerSection';
import { PreferenceSection } from '../../components/profile/PreferenceSection';
import { BackupSection } from '../../components/profile/BackupSection';
import { ObsidianSection } from '../../components/profile/ObsidianSection';
import { AppInfoSection } from '../../components/profile/AppInfoSection';
import { DangerZoneSection } from '../../components/profile/DangerZoneSection';
import { RestorePresetsModal } from '../../components/profile/RestorePresetsModal';
import { PromoCodeModal } from '../../components/profile/PromoCodeModal';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const settings = useWorkoutStore(state => state.settings);
  const loadSettings = useWorkoutStore(state => state.loadSettings);
  const [defaultRest, setDefaultRest] = useState(settings.defaultRest);
  const [autoRest, setAutoRest] = useState(settings.autoRest);
  const [timerVibrate, setTimerVibrate] = useState(settings.timerVibrate);
  const [weightUnit, setWeightUnit] = useState(settings.weightUnit);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [bodyWeight, setLocalBodyWeight] = useState(settings.bodyWeight ? settings.bodyWeight.toString() : '');
  const [showRpe, setShowRpe] = useState(settings.displayFields.showRpe);
  const [show1RM, setShow1RM] = useState(settings.displayFields.show1RM);
  const [showVolume, setShowVolume] = useState(settings.displayFields.showVolume);
  const [showStance, setShowStance] = useState(settings.displayFields.showStance);
  const [crashConsent, setCrashConsent] = useState(settings.crashConsent);
  const [keepAwake, setKeepAwake] = useState(settings.keepAwake);
  const [alwaysOneSet, setAlwaysOneSet] = useState(settings.alwaysOneSet);

  // Database Reset State
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [accountType, setAccountType] = useState<'basic' | 'premium' | 'premium_limited' | 'early_adopter'>('basic');
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);
  const [displayPrice, setDisplayPrice] = useState<string>('');

  // Promotion code and verification states
  const [isPromoModalVisible, setIsPromoModalVisible] = useState(false);
  const [promoInputText, setPromoInputText] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isCheckingPromoWorkflow, setIsCheckingPromoWorkflow] = useState(false);

  const isPremium = settings.premiumUntil === 'perpetual' || (settings.premiumUntil !== '' && !isNaN(Date.parse(settings.premiumUntil)) && Date.parse(settings.premiumUntil) > Date.now());
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;
  const maxTokens = (isPremium || isEarly) ? 20 : 5;

  useEffect(() => {
    const initializeIAP = async () => {
      const connected = await initIAPConnection();
      if (connected) {
        try {
          const products = await fetchPremiumProducts();
          if (products && products.length > 0) {
            const premiumProduct = products.find(p => p.id === PREMIUM_PRODUCT_ID);
            if (premiumProduct && premiumProduct.displayPrice) {
              setDisplayPrice(premiumProduct.displayPrice);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch premium product details:', e);
        }
      }
    };

    initializeIAP();

    setupIAPListeners(
      () => {
        setIsPurchasing(false);
        setIsPaywallVisible(false);
        Alert.alert('アップグレード完了', 'プレミアムプランのご購入ありがとうございます！すべての機能制限が解除されました。');
      },
      (errorMsg) => {
        setIsPurchasing(false);
        Alert.alert('エラー', errorMsg);
      }
    );

    return () => {
      cleanupIAP();
    };
  }, []);

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

  const shouldShowPaywall = useWorkoutStore(state => state.shouldShowPaywall);
  const setShouldShowPaywall = useWorkoutStore(state => state.setShouldShowPaywall);

  useEffect(() => {
    if (shouldShowPaywall) {
      setIsPaywallVisible(true);
      setShouldShowPaywall(false);
    }
  }, [shouldShowPaywall]);

  useEffect(() => {
    setDefaultRest(settings.defaultRest);
    setAutoRest(settings.autoRest);
    setTimerVibrate(settings.timerVibrate);
    setWeightUnit(settings.weightUnit);
    setLocalBodyWeight(settings.bodyWeight ? settings.bodyWeight.toString() : '');
    setShowRpe(settings.displayFields.showRpe);
    setShow1RM(settings.displayFields.show1RM);
    setShowVolume(settings.displayFields.showVolume);
    setShowStance(settings.displayFields.showStance);
    setCrashConsent(settings.crashConsent);
    setKeepAwake(settings.keepAwake);
    setAlwaysOneSet(settings.alwaysOneSet);

    const fetchAccountType = async () => {
      try {
        const stored = await getSettings();
        const isEarly = stored['is_early_adopter'] === 'true';
        const premiumUntilVal = stored['premium_until'] || '';
        const isPremiumPerpetual = premiumUntilVal === 'perpetual';
        const isPremiumLimited = premiumUntilVal !== '' && premiumUntilVal !== 'perpetual' && !isNaN(Date.parse(premiumUntilVal)) && Date.parse(premiumUntilVal) > Date.now();
        const hasExpired = premiumUntilVal !== '' && premiumUntilVal !== 'perpetual' && !isNaN(Date.parse(premiumUntilVal)) && Date.parse(premiumUntilVal) <= Date.now();

        if (hasExpired) {
          await saveSetting('premium_until', '');
          if (!isEarly) {
            await saveSetting('ai_tokens_balance', '5');
          }
          
          useWorkoutStore.getState().setPremiumUntil('');
          if (!isEarly) {
            useWorkoutStore.getState().setAITokensBalance(5);
          }
          
          Alert.alert(
            t('ui.profile.promo_expired_title') || 'プレミアム期間の終了',
            t('ui.profile.promo_expired_msg') || 'プレミアムプラン（お試し）の有効期限が終了したため、元のプランに戻りました。',
            [
              {
                text: 'OK',
                onPress: () => {
                  setIsPaywallVisible(true);
                }
              }
            ]
          );
          
          setAccountType(isEarly ? 'early_adopter' : 'basic');
        } else {
          if (isEarly) {
            setAccountType('early_adopter');
          } else if (isPremiumPerpetual) {
            setAccountType('premium');
          } else if (isPremiumLimited) {
            setAccountType('premium_limited');
          } else {
            setAccountType('basic');
          }
        }
      } catch (err) {
        console.warn('Failed to fetch account type', err);
      }
    };
    fetchAccountType();
  }, [settings]);

  const handleResetDatabase = async () => {
    if (resetConfirmText !== 'OK') {
      Alert.alert(t('ui.profile.clear_data_confirm_title'), t('ui.profile.clear_data_error_mismatch'));
      return;
    }

    setIsResetting(true);
    try {
      await resetDatabase();
      useWorkoutStore.getState().resetAllSettingsAndWorkout();

      // 現在のアプリの言語設定を再保存し、日本語の場合は重量単位を自動設定する
      const activeLang = i18n.language || 'ja';
      await saveSetting('language', activeLang);
      if (activeLang === 'ja') {
        await saveSetting('weight_unit', 'kg');
        useWorkoutStore.getState().loadSettings({
          ...useWorkoutStore.getState().settings,
          weightUnit: 'kg',
          needsUnitSelection: false
        });
      }

      setIsResetModalVisible(false);
      setResetConfirmText('');
      
      Alert.alert(
        t('ui.profile.clear_data_success_title'), 
        t('ui.profile.clear_data_success_message'),
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch (reloadErr) {
                router.replace('/(tabs)');
              }
            }
          }
        ]
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to initialize database. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdateRest = async (secs: number) => {
    setDefaultRest(secs);
    loadSettings({
      defaultRest: secs,
      autoRest,
      timerVibrate,
      weightUnit
    });
    await saveSetting('default_rest_timer', secs.toString());
  };

  const handleUpdateAuto = async (val: boolean) => {
    setAutoRest(val);
    loadSettings({
      defaultRest,
      autoRest: val,
      timerVibrate,
      weightUnit
    });
    await saveSetting('auto_rest_timer', val ? '1' : '0');
  };

  const handleUpdateVibrate = async (val: boolean) => {
    setTimerVibrate(val);
    loadSettings({
      defaultRest,
      autoRest,
      timerVibrate: val,
      weightUnit
    });
    await saveSetting('timer_vibrate', val ? '1' : '0');
  };

  const handleUpdateKeepAwake = async (val: boolean) => {
    setKeepAwake(val);
    useWorkoutStore.getState().setKeepAwake(val);
    await saveSetting('keep_awake', val ? '1' : '0');
  };

  const handleUpdateUnit = async (unit: 'kg' | 'lbs') => {
    setWeightUnit(unit);
    loadSettings({
      defaultRest,
      autoRest,
      timerVibrate,
      weightUnit: unit
    });
    await saveSetting('weight_unit', unit);
  };

  const handleChangeLanguage = async (lang: 'ja' | 'en') => {
    changeLanguage(lang);
    setCurrentLang(lang);
    await saveSetting('language', lang);
  };

  const handleUpdateCrashConsent = async (val: boolean) => {
    const consent = val ? 'agreed' : 'declined';
    setCrashConsent(consent);
    useWorkoutStore.getState().setCrashConsent(consent);
    await saveSetting('crash_report_consent', consent);
  };

  const handleUpdateAlwaysOneSet = async (val: boolean) => {
    setAlwaysOneSet(val);
    useWorkoutStore.getState().setAlwaysOneSet(val);
    await saveSetting('always_one_set', val ? '1' : '0');
  };

  const handleUpdateBodyWeight = async (val: string) => {
    setLocalBodyWeight(val);
    if (val === '') {
      useWorkoutStore.getState().setBodyWeight(null);
      await saveSetting('body_weight', '');
    } else {
      const num = parseFloat(val.replace(',', '.'));
      if (!isNaN(num)) {
        useWorkoutStore.getState().setBodyWeight(num);
        await saveSetting('body_weight', num.toString());
      }
    }
  };

  const handleToggleDisplayField = async (field: 'showRpe' | 'show1RM' | 'showVolume' | 'showStance', val: boolean) => {
    const keyMap: Record<string, string> = {
      showRpe: 'display_rpe',
      show1RM: 'display_1rm',
      showVolume: 'display_volume',
      showStance: 'display_stance',
    };
    if (field === 'showRpe') setShowRpe(val);
    else if (field === 'show1RM') setShow1RM(val);
    else if (field === 'showVolume') setShowVolume(val);
    else if (field === 'showStance') setShowStance(val);
    useWorkoutStore.getState().setDisplayFields({ [field]: val });
    await saveSetting(keyMap[field], val ? '1' : '0');
  };

  const handleExportBackup = async () => {
    try {
      const conn = getDB();
      await conn.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');

      const dbDir = FileSystem.documentDirectory + 'SQLite/';
      const dbUri = dbDir + 'gymtracker.db';

      const fileInfo = await FileSystem.getInfoAsync(dbUri);
      if (!fileInfo.exists) {
        Alert.alert(t('ui.common.error'), 'Database file not found.');
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const dateStr = `${year}${month}${date}_${hours}${minutes}${seconds}`;

      const backupUri = FileSystem.cacheDirectory + `trenote_backup_${dateStr}.db`;
      await FileSystem.copyAsync({
        from: dbUri,
        to: backupUri
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupUri, {
          mimeType: 'application/octet-stream',
          dialogTitle: t('ui.developer_menu.backup_title'),
          UTI: 'public.database'
        });
      } else {
        Alert.alert(t('ui.common.error'), 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert(t('ui.common.error'), 'Failed to create backup.');
    }
  };

  const handleImportBackup = async () => {
    setIsBackupModalVisible(false);

    Alert.alert(
      t('ui.developer_menu.restore_alert_title'),
      t('ui.developer_menu.restore_alert_message'),
      [
        { text: t('ui.common.cancel'), style: 'cancel', onPress: () => setIsBackupModalVisible(true) },
        {
          text: t('ui.developer_menu.restore_alert_confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
              });

              if (result.canceled || !result.assets || result.assets.length === 0) {
                setIsBackupModalVisible(true);
                return;
              }

              const selectedFile = result.assets[0];
              const sourceUri = selectedFile.uri;

              const fileInfo = await FileSystem.getInfoAsync(sourceUri);
              if (!fileInfo.exists || fileInfo.size === 0) {
                throw new Error(t('ui.profile.restore_empty_file_error'));
              }

              try {
                await closeDB();
              } catch (closeErr) {
                console.warn('Failed to close DB before restore:', closeErr);
              }

              await new Promise((resolve) => setTimeout(resolve, 500));

              const dbDir = FileSystem.documentDirectory + 'SQLite/';
              const dbUri = dbDir + 'gymtracker.db';
              const walUri = dbUri + '-wal';
              const shmUri = dbUri + '-shm';
              const journalUri = dbUri + '-journal';
              
              const dirInfo = await FileSystem.getInfoAsync(dbDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
              }

              // Delete old DB file to prevent lock/overwrite conflicts
              try {
                const dbInfo = await FileSystem.getInfoAsync(dbUri);
                if (dbInfo.exists) {
                  await FileSystem.deleteAsync(dbUri);
                }
              } catch (dbErr) {
                console.warn('Failed to delete old DB file:', dbErr);
              }

              // Delete old journal file if exists
              try {
                const journalInfo = await FileSystem.getInfoAsync(journalUri);
                if (journalInfo.exists) {
                  await FileSystem.deleteAsync(journalUri);
                }
              } catch (journalErr) {
                console.warn('Failed to delete journal file:', journalErr);
              }

              try {
                const walInfo = await FileSystem.getInfoAsync(walUri);
                if (walInfo.exists) {
                  await FileSystem.deleteAsync(walUri);
                }
              } catch (walErr) {
                console.warn('Failed to delete WAL file:', walErr);
              }

              try {
                const shmInfo = await FileSystem.getInfoAsync(shmUri);
                if (shmInfo.exists) {
                  await FileSystem.deleteAsync(shmUri);
                }
              } catch (shmErr) {
                console.warn('Failed to delete SHM file:', shmErr);
              }

              await FileSystem.copyAsync({
                from: sourceUri,
                to: dbUri
              });

              Alert.alert(
                t('ui.developer_menu.restore_success_title'),
                t('ui.developer_menu.restore_success_message'),
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      try {
                        await Updates.reloadAsync();
                      } catch (reloadErr) {
                        Alert.alert('Info', 'Please restart the app manually to apply changes.');
                      }
                    }
                  }
                ]
              );

            } catch (error) {
              console.error('Restore error:', error);
              setIsBackupModalVisible(true);
              Alert.alert(
                t('ui.developer_menu.restore_error_title'),
                t('ui.developer_menu.restore_error_message') + '\n\n' + (error instanceof Error ? error.message : String(error))
              );
            }
          }
        }
      ]
    );
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
      if (otaResult.isUpdateTriggered) {
        return;
      }
      if (otaResult.error) {
        console.warn('OTA Check error (non-fatal):', otaResult.error);
      }
      
      setIsPromoModalVisible(true);
    } catch (err) {
      console.error('Failed to run verification workflow:', err);
      Alert.alert(
        t('ui.common.error') || 'エラー',
        t('ui.profile.promo_error_network') || '検証中にエラーが発生しました。接続を確認してください。'
      );
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
        Alert.alert(
          t('ui.profile.promo_error_title') || '認証エラー',
          t('ui.profile.promo_error_invalid') || '無効なコードであるか、プロモーション期間外です。'
        );
        setIsApplyingPromo(false);
        return;
      }
      
      const newExpiry = await activatePremiumFromPromo();
      useWorkoutStore.getState().updatePremiumStatus(newExpiry);
      setIsPromoModalVisible(false);
      setPromoInputText('');
      
      const formattedDate = new Date(newExpiry).toLocaleDateString(
        currentLang === 'ja' ? 'ja-JP' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );
      
      Alert.alert(
        t('ui.profile.promo_success_title') || '適用完了',
        t('ui.profile.promo_success_msg', { date: formattedDate }) || `プロモーションコードが適用されました！プレミアムプランが1ヶ月間有効になりました。`
      );
      
    } catch (err) {
      console.error('Failed to apply promo code:', err);
      Alert.alert(
        t('ui.profile.promo_error_title') || '認証エラー',
        t('ui.profile.promo_error_network') || 'ネットワークエラーが発生しました。しばらくしてから再度お試しください。'
      );
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const nativeVersion = Updates.runtimeVersion || Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('ui.profile.title')}</Text>
      </View>

      {/* 1. アカウントの種類 */}
      <AccountCard
        accountType={accountType}
        premiumUntil={settings.premiumUntil}
        onPressAccountCard={() => setIsPaywallVisible(true)}
        t={t}
      />

      {/* 2. AIトレーナー設定 */}
      <AiCoachSection
        aiTokensBalance={settings.aiTokensBalance}
        maxTokens={maxTokens}
        isBasic={isBasic}
        t={t}
      />

      {/* 3. 記録項目のカスタマイズ */}
      <DisplayFieldsSection
        showRpe={showRpe}
        show1RM={show1RM}
        showVolume={showVolume}
        showStance={showStance}
        alwaysOneSet={alwaysOneSet}
        onToggleDisplayField={handleToggleDisplayField}
        onUpdateAlwaysOneSet={handleUpdateAlwaysOneSet}
        t={t}
      />

      {/* 4. タイマー設定 */}
      <TimerSection
        autoRest={autoRest}
        onUpdateAuto={handleUpdateAuto}
        timerVibrate={timerVibrate}
        onUpdateVibrate={handleUpdateVibrate}
        keepAwake={keepAwake}
        onUpdateKeepAwake={handleUpdateKeepAwake}
        defaultRest={defaultRest}
        onUpdateRest={handleUpdateRest}
        t={t}
      />

      {/* 5. 環境設定 */}
      <PreferenceSection
        weightUnit={weightUnit}
        onUpdateUnit={handleUpdateUnit}
        bodyWeight={bodyWeight}
        onUpdateBodyWeight={handleUpdateBodyWeight}
        currentLang={currentLang}
        onChangeLanguage={handleChangeLanguage}
        crashConsent={crashConsent}
        onUpdateCrashConsent={handleUpdateCrashConsent}
        t={t}
      />

      {/* 6. バックアップ・復元 */}
      <BackupSection
        isBackupModalVisible={isBackupModalVisible}
        setIsBackupModalVisible={setIsBackupModalVisible}
        isPremium={isPremium}
        isEarly={isEarly}
        onExport={handleExportBackup}
        onImport={handleImportBackup}
        onOpenPaywall={() => setIsPaywallVisible(true)}
        t={t}
      />

      {/* 7. Obsidian Vault 自動連携 */}
      <ObsidianSection t={t} />

      {/* 7. アプリ情報 */}
      <AppInfoSection
        currentOtaVersion={CURRENT_OTA_CONFIG.version}
        nativeVersion={nativeVersion}
        isCheckingPromoWorkflow={isCheckingPromoWorkflow}
        onPressPromoCode={handlePromoPress}
        t={t}
      />

      {/* 8. データ管理 */}
      <DangerZoneSection
        isResetModalVisible={isResetModalVisible}
        setIsResetModalVisible={setIsResetModalVisible}
        resetConfirmText={resetConfirmText}
        setResetConfirmText={setResetConfirmText}
        isResetting={isResetting}
        onResetDatabase={handleResetDatabase}
        onOpenRestoreModal={() => setIsRestoreModalVisible(true)}
        t={t}
      />

      {/* Restore Default Data Modal */}
      <RestorePresetsModal
        visible={isRestoreModalVisible}
        onClose={() => setIsRestoreModalVisible(false)}
        onRestore={() => {}}
        t={t}
      />

      {/* Premium Paywall Modal */}
      <Modal visible={isPaywallVisible} animationType="slide" transparent={true}>
        <PaywallModal
          isPurchasing={isPurchasing}
          isPremium={isPremium}
          isEarly={isEarly}
          onClose={() => !isPurchasing && setIsPaywallVisible(false)}
          onPurchase={handlePurchase}
          onRestore={handleRestore}
          displayPrice={displayPrice || t('ui.profile.paywall.fallback_price')}
        />
      </Modal>

      {/* Promotion Code Modal */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  header: { marginBottom: Theme.spacing.lg, marginTop: Theme.spacing.md },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.text },

});
