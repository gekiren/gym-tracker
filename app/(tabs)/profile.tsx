import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Linking, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
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
import { initIAPConnection, setupIAPListeners, purchasePremium, restorePurchases, fetchPremiumProducts, cleanupIAP } from '../../src/services/iapService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Updates from 'expo-updates';

const REST_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300]; // in seconds

export default function ProfileScreen() {
  const { t } = useTranslation();
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

  // Database Reset State
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [accountType, setAccountType] = useState<'basic' | 'premium' | 'premium_limited' | 'early_adopter'>('basic');
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isBackupModalVisible, setIsBackupModalVisible] = useState(false);

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
    initIAPConnection();

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
            t('ui.profile.promo_expired_msg') || 'プレミアムプラン（期間限定）の有効期限が終了したため、元のプランに戻りました。',
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
      // 1. Reset SQLite Database
      await resetDatabase();
      
      // 2. Reset Zustand Memory Store
      useWorkoutStore.getState().resetAllSettingsAndWorkout();

      // 3. UI feedback & navigation
      setIsResetModalVisible(false);
      setResetConfirmText('');
      
      Alert.alert(
        t('ui.profile.clear_data_success_title'), 
        t('ui.profile.clear_data_success_message'),
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)');
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
    loadSettings(secs, autoRest, timerVibrate, weightUnit);
    await saveSetting('default_rest_timer', secs.toString());
  };

  const handleUpdateAuto = async (val: boolean) => {
    setAutoRest(val);
    loadSettings(defaultRest, val, timerVibrate, weightUnit);
    await saveSetting('auto_rest_timer', val ? '1' : '0');
  };

  const handleUpdateVibrate = async (val: boolean) => {
    setTimerVibrate(val);
    loadSettings(defaultRest, autoRest, val, weightUnit);
    await saveSetting('timer_vibrate', val ? '1' : '0');
  };

  const handleUpdateKeepAwake = async (val: boolean) => {
    setKeepAwake(val);
    useWorkoutStore.getState().setKeepAwake(val);
    await saveSetting('keep_awake', val ? '1' : '0');
  };

  const handleUpdateUnit = async (unit: 'kg' | 'lbs') => {
    setWeightUnit(unit);
    loadSettings(defaultRest, autoRest, timerVibrate, unit);
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

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}${t('ui.common.secs_unit')}`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}${t('ui.common.min_unit')}${s}${t('ui.common.secs_unit')}` : `${m}${t('ui.common.min_unit')}`;
  };

  const handleExportBackup = async () => {
    try {
      // Flush WAL to the main gymtracker.db file before copying
      const conn = getDB();
      await conn.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');

      const dbDir = FileSystem.documentDirectory + 'SQLite/';
      const dbUri = dbDir + 'gymtracker.db';

      // Check if DB file exists
      const fileInfo = await FileSystem.getInfoAsync(dbUri);
      if (!fileInfo.exists) {
        Alert.alert(t('ui.common.error'), 'Database file not found.');
        return;
      }

      // Copy to temporary cache location for sharing
      const backupUri = FileSystem.cacheDirectory + 'trenote_backup.db';
      await FileSystem.copyAsync({
        from: dbUri,
        to: backupUri
      });

      // Share the file
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
              // 1. Pick a file
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

              // Close database connection
              try {
                await closeDB();
              } catch (closeErr) {
                console.warn('Failed to close DB before restore:', closeErr);
              }

              // Wait for file lock release
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Ensure SQLite directory exists
              const dbDir = FileSystem.documentDirectory + 'SQLite/';
              const dbUri = dbDir + 'gymtracker.db';
              const walUri = dbUri + '-wal';
              const shmUri = dbUri + '-shm';
              
              const dirInfo = await FileSystem.getInfoAsync(dbDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
              }

              // Delete old WAL and SHM files to prevent conflicts
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

              // 2. Overwrite gymtracker.db with the selected file
              await FileSystem.copyAsync({
                from: sourceUri,
                to: dbUri
              });

              // Re-initialize database
              await initDB();

              // 3. Inform user and reload the app
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

  const handleBackupMenuPress = () => {
    const isPaidPremium = isPremium && !isEarly;
    if (!isPaidPremium) {
      Alert.alert(
        t('ui.profile.backup_premium_only_title'),
        t('ui.profile.backup_premium_only_desc'),
        [
          { text: t('ui.common.cancel'), style: 'cancel' },
          { 
            text: t('ui.profile.upgrade_btn'), 
            onPress: () => setIsPaywallVisible(true) 
          }
        ]
      );
      return;
    }
    setIsBackupModalVisible(true);
  };

  const getRemainingDaysText = (premiumUntil: string) => {
    if (!premiumUntil || premiumUntil === 'perpetual') return '';
    const expiry = Date.parse(premiumUntil);
    if (isNaN(expiry)) return '';
    
    const diffMs = expiry - Date.now();
    if (diffMs <= 0) return t('ui.profile.promo_expired') || '期限切れ';
    
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return t('ui.profile.promo_remaining_days', { days: diffDays }) || `残り${diffDays}日`;
  };

  const handlePromoPress = async () => {
    if (isCheckingPromoWorkflow) return;
    setIsCheckingPromoWorkflow(true);
    
    try {
      // 1. Native application version check
      const versionResult = checkNativeVersion();
      if (!versionResult.isUpToDate) {
        Alert.alert(
          t('ui.profile.app_version_outdated_title') || 'アプリ更新のお願い',
          t('ui.profile.app_version_outdated_msg') || '最新バージョンが利用可能です。ストアからアプリを更新してください。'
        );
        setIsCheckingPromoWorkflow(false);
        return;
      }
      
      // 2. OTA updates check
      const otaResult = await checkAndApplyOTAUpdate();
      if (otaResult.isUpdateTriggered) {
        // App is reloading
        return;
      }
      if (otaResult.error) {
        console.warn('OTA Check error (non-fatal):', otaResult.error);
      }
      
      // 3. Open code input screen (Modal)
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
      // Verify campaign validity and code matching
      const isValid = verifyPromoCode(promoInputText);
      if (!isValid) {
        Alert.alert(
          t('ui.profile.promo_error_title') || '認証エラー',
          t('ui.profile.promo_error_invalid') || '無効なコードであるか、プロモーション期間外です。'
        );
        setIsApplyingPromo(false);
        return;
      }
      
      // Update SQLite settings
      const newExpiry = await activatePremiumFromPromo();
      
      // Update Zustand store immediately
      useWorkoutStore.getState().updatePremiumStatus(newExpiry);
      
      // Close modal and show success feedback
      setIsPromoModalVisible(false);
      setPromoInputText('');
      
      // Localized expiry date display
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('ui.profile.title')}</Text>
      </View>

      {/* Account Type Card */}
      <TouchableOpacity 
        style={styles.accountCard} 
        onPress={() => setIsPaywallVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.accountIconContainer}>
          <Ionicons 
            name={
              accountType === 'early_adopter' ? 'ribbon-sharp' :
              accountType === 'premium' ? 'star-sharp' : 
              accountType === 'premium_limited' ? 'time-sharp' : 'person-sharp'
            } 
            size={22} 
            color={
              accountType === 'early_adopter' ? '#ffd700' : 
              accountType === 'premium' ? '#4facfe' : 
              accountType === 'premium_limited' ? '#c084fc' :
              Theme.colors.textMuted
            } 
          />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountLabel}>{t('ui.profile.account_type_label') || 'アカウントの種類'}</Text>
          <Text style={[
            styles.accountValue,
            accountType === 'early_adopter' && styles.accountValueEarly,
            accountType === 'premium' && styles.accountValuePremium,
            accountType === 'premium_limited' && styles.accountValuePremiumLimited
          ]}>
            {
              accountType === 'early_adopter' ? (t('ui.profile.account_early_adopter') || 'アーリーアダプター（無制限）') :
              accountType === 'premium' ? (t('ui.profile.account_premium') || 'プレミアムプラン') :
              accountType === 'premium_limited' ? `${t('ui.profile.account_premium_limited') || 'プレミアムプラン（期間限定）'} - ${getRemainingDaysText(settings.premiumUntil)}` :
              (t('ui.profile.account_basic') || 'ベーシックプラン（タップしてアップグレード）')
            }
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
      </TouchableOpacity>

      {/* Tools Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="construct-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_tools')}</Text>
        </View>
        
        <View style={styles.settingCard}>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/rm-calculator')}>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Ionicons name="calculator" size={22} color={Theme.colors.text} style={{ marginRight: 12 }} />
               <View>
                 <Text style={styles.settingLabel}>{t('ui.profile.rm_calculator')}</Text>
                 <Text style={[styles.settingDesc, { paddingRight: 0 }]}>{t('ui.profile.rm_calculator_desc')}</Text>
               </View>
             </View>
             <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Timer Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="timer-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_timer')}</Text>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>{t('ui.profile.auto_rest')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.auto_rest_desc')}</Text>
            </View>
            <Switch
              value={autoRest}
              onValueChange={handleUpdateAuto}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>{t('ui.profile.timer_vibrate')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.timer_vibrate_desc')}</Text>
            </View>
            <Switch
              value={timerVibrate}
              onValueChange={handleUpdateVibrate}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>{t('ui.profile.keep_awake')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.keep_awake_desc')}</Text>
            </View>
            <Switch
              value={keepAwake}
              onValueChange={handleUpdateKeepAwake}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={styles.settingLabel}>{t('ui.profile.default_rest')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.default_rest_desc')}</Text>
            
            <View style={styles.chipContainer}>
              {REST_OPTIONS.map((secs) => (
                <TouchableOpacity
                  key={secs}
                  style={[styles.chip, defaultRest === secs && styles.chipActive]}
                  onPress={() => handleUpdateRest(secs)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, defaultRest === secs && styles.chipTextActive]}>
                    {formatTime(secs)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Preference Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_preferences')}</Text>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('ui.profile.weight_unit_label')}</Text>
            <View style={[styles.chipContainer, { marginTop: 0, gap: 4 }]}>
              <TouchableOpacity
                style={[styles.langChip, { paddingVertical: 8, paddingHorizontal: 16 }, weightUnit === 'kg' && styles.chipActive]}
                onPress={() => handleUpdateUnit('kg')}
              >
                <Text style={[styles.chipText, weightUnit === 'kg' && styles.chipTextActive]}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langChip, { paddingVertical: 8, paddingHorizontal: 16 }, weightUnit === 'lbs' && styles.chipActive]}
                onPress={() => handleUpdateUnit('lbs')}
              >
                <Text style={[styles.chipText, weightUnit === 'lbs' && styles.chipTextActive]}>lbs</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={styles.settingLabel}>{t('ui.profile.body_weight_label')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.body_weight_desc')}</Text>
            <TextInput
              style={styles.weightInput}
              keyboardType="numeric"
              value={bodyWeight}
              onChangeText={handleUpdateBodyWeight}
              placeholder={`e.g. 70 (${weightUnit})`}
              placeholderTextColor={Theme.colors.textMuted}
            />
          </View>
          <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={styles.settingLabel}>{t('ui.profile.language_label')}</Text>
            <View style={[styles.chipContainer, { marginTop: 12 }]}>
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
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>{t('ui.profile.crash_report_consent_label') || '匿名のクラッシュレポート自動送信'}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.crash_report_consent_desc') || 'アプリが異常終了した際、匿名の診断ログを自動送信して品質改善に協力します。'}</Text>
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

      {/* Display Fields Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="eye-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_display_fields')}</Text>
        </View>
        <Text style={[styles.settingDesc, { marginBottom: 12, paddingRight: 0 }]}>{t('ui.profile.display_fields_desc')}</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>{t('ui.profile.display_rpe')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.display_rpe_desc')}</Text>
            </View>
            <Switch
              value={showRpe}
              onValueChange={(v) => handleToggleDisplayField('showRpe', v)}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>{t('ui.profile.display_1rm')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.display_1rm_desc')}</Text>
            </View>
            <Switch
              value={show1RM}
              onValueChange={(v) => handleToggleDisplayField('show1RM', v)}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>{t('ui.profile.display_volume')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.display_volume_desc')}</Text>
            </View>
            <Switch
              value={showVolume}
              onValueChange={(v) => handleToggleDisplayField('showVolume', v)}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>{t('ui.profile.display_stance')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.display_stance_desc')}</Text>
            </View>
            <Switch
              value={showStance}
              onValueChange={(v) => handleToggleDisplayField('showStance', v)}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>
        </View>
      </View>

      {/* AI Coach Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_ai_coach') || 'AIトレーナー設定'}</Text>
        </View>
        <View style={styles.settingCard}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Text style={styles.settingLabel}>{t('ui.profile.ai_tokens_balance') || '今月の利用枠残高'}</Text>
              <Text style={{ color: settings.aiTokensBalance === 0 ? Theme.colors.danger : Theme.colors.text, fontWeight: 'bold', fontSize: 16 }}>
                {`${settings.aiTokensBalance} / ${maxTokens}`}
              </Text>
            </View>
            <Text style={[styles.settingDesc, { paddingRight: 0 }]}>
              {t('ui.profile.ai_tokens_desc') || 'Cloudflare Worker & Gemini APIを経由した安全で高度なトレーニング指導が受けられます。'}
            </Text>
            
            <View style={styles.aiTokensContainer}>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${Math.min(100, Math.max(0, (settings.aiTokensBalance / maxTokens) * 100))}%`,
                      backgroundColor: settings.aiTokensBalance === 0 ? Theme.colors.danger : Theme.colors.primary 
                    }
                  ]} 
                />
              </View>
              {settings.aiTokensBalance === 0 && (
                <Text style={styles.quotaWarning}>{t('ui.profile.quota_exhausted_alert') || '今月の利用枠が残っていません。'}</Text>
              )}
              <Text style={[styles.settingDesc, { marginTop: 6, paddingRight: 0 }]}>
                {isBasic 
                  ? '30日後に利用枠は自動的に5回にリセットされます。' 
                  : (t('ui.profile.ai_tokens_reset_desc') || '30日後に利用枠は自動的に20回にリセットされます。')
                }
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Backup & Restore Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-upload-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_backup')}</Text>
        </View>
        <View style={styles.settingCard}>
          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomWidth: 0 }]} 
            onPress={handleBackupMenuPress}
          >
             <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
               <Ionicons name="sync-circle-outline" size={22} color={Theme.colors.text} style={{ marginRight: 12 }} />
               <View style={{ flex: 1 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Text style={styles.settingLabel}>{t('ui.profile.backup_menu_title')}</Text>
                   {!(isPremium && !isEarly) && (
                     <View style={styles.premiumBadge}>
                       <Text style={styles.premiumBadgeText}>PRO</Text>
                     </View>
                   )}
                 </View>
                 <Text style={styles.settingDesc}>{t('ui.profile.backup_menu_desc')}</Text>
               </View>
             </View>
             <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={24} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_info')}</Text>
        </View>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('ui.profile.version')}</Text>
            <Text style={{ color: Theme.colors.textMuted }}>{Constants.nativeAppVersion || Constants.expoConfig?.version || '1.0.0'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={handlePromoPress}
            disabled={isCheckingPromoWorkflow}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
              <Ionicons 
                name={isCheckingPromoWorkflow ? "sync" : "gift-outline"} 
                size={20} 
                color={Theme.colors.text} 
                style={{ marginRight: 10 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>
                  {isCheckingPromoWorkflow ? t('ui.profile.app_version_checking') : t('ui.profile.promo_code')}
                </Text>
                <Text style={[styles.settingDesc, { paddingRight: 0 }]}>
                  {t('ui.profile.promo_code_desc')}
                </Text>
              </View>
            </View>
            {isCheckingPromoWorkflow ? (
              <ActivityIndicator size="small" color={Theme.colors.textMuted} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/privacy-policy' as any)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Theme.colors.text} style={{ marginRight: 10 }} />
              <Text style={styles.settingLabel}>{t('ui.profile.privacy_policy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL('mailto:trenotesupport@gmail.com')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="mail-outline" size={20} color={Theme.colors.text} style={{ marginRight: 10 }} />
              <Text style={styles.settingLabel}>{t('ui.profile.contact')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Danger Zone Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="warning-outline" size={24} color={Theme.colors.danger} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: Theme.colors.danger }]}>{t('ui.profile.section_danger')}</Text>
        </View>
        <View style={[styles.settingCard, { borderColor: Theme.colors.danger, backgroundColor: 'rgba(239, 83, 80, 0.05)' }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, alignItems: 'center' }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={[styles.settingLabel, { color: Theme.colors.danger }]}>{t('ui.profile.clear_data')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.clear_data_desc')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.dangerButton}
              activeOpacity={0.8}
              onPress={() => setIsResetModalVisible(true)}
            >
              <Text style={styles.dangerButtonText}>{t('ui.common.delete') || '初期化'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Backup & Restore Modal */}
      <Modal visible={isBackupModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { borderColor: 'rgba(79,172,254,0.3)', padding: 24 }]}>
            <Ionicons name="cloud-upload-outline" size={56} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.profile.backup_modal_title')}</Text>
            
            <Text style={[styles.modalDesc, { marginBottom: 24 }]}>
              {t('ui.profile.backup_modal_desc')}
            </Text>

            <View style={{ width: '100%', gap: 12, marginBottom: 20 }}>
              <TouchableOpacity 
                style={styles.modalExportBtn} 
                onPress={handleExportBackup}
              >
                <Ionicons name="share-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.modalExportBtnText}>
                  {t('ui.profile.backup_export_btn')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalImportBtn} 
                onPress={handleImportBackup}
              >
                <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.modalImportBtnText}>
                  {t('ui.profile.backup_import_btn')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setIsBackupModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>{t('ui.active_workout.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Premium Paywall Modal */}
      <Modal visible={isPaywallVisible} animationType="slide" transparent={true}>
        <View style={styles.paywallBg}>
          <View style={styles.paywallCard}>
            {/* Header */}
            <View style={styles.paywallHeader}>
              <Text style={styles.paywallTitle}>👑 TreNote Premium</Text>
              <TouchableOpacity onPress={() => !isPurchasing && setIsPaywallVisible(false)} disabled={isPurchasing}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ width: '100%', marginVertical: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.paywallSubtitle}>
                プレミアムプランへアップグレードして、すべての機能制限を解除しましょう！
              </Text>

              {/* Feature 1 */}
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureIcon}>
                  <Ionicons name="sparkles" size={24} color="#4facfe" />
                </View>
                <View style={styles.paywallFeatureInfo}>
                  <Text style={styles.paywallFeatureTitle}>AIトレーナー利用枠の拡張</Text>
                  <Text style={styles.paywallFeatureDesc}>ベーシックプランの月5回制限から、月20回までに利用枠が拡張されます。</Text>
                </View>
              </View>

              {/* Feature 2 */}
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureIcon}>
                  <Ionicons name="copy" size={24} color="#4facfe" />
                </View>
                <View style={styles.paywallFeatureInfo}>
                  <Text style={styles.paywallFeatureTitle}>インポート機能の解放</Text>
                  <Text style={styles.paywallFeatureDesc}>既存のルーティンや過去のワークアウト履歴から、コピーして新しいルーティンを作成できるようになります。</Text>
                </View>
              </View>

              {/* Feature 3 */}
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureIcon}>
                  <Ionicons name="cloud-upload-outline" size={24} color="#4facfe" />
                </View>
                <View style={styles.paywallFeatureInfo}>
                  <Text style={styles.paywallFeatureTitle}>バックアップ・復元機能の解放</Text>
                  <Text style={styles.paywallFeatureDesc}>履歴や設定をファイルとして安全にエクスポート/インポートできるようになります。</Text>
                </View>
              </View>

              {/* Feature 4 */}
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureIcon}>
                  <Ionicons name="heart" size={24} color="#4facfe" />
                </View>
                <View style={styles.paywallFeatureInfo}>
                  <Text style={styles.paywallFeatureTitle}>アプリの開発支援</Text>
                  <Text style={styles.paywallFeatureDesc}>より便利な機能の追加や安定したサーバー運用のための開発継続をサポートできます。</Text>
                </View>
              </View>
            </ScrollView>

            {/* Price tag */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>プレミアムプラン (買い切り型)</Text>
              <Text style={styles.priceValue}>¥500</Text>
              <Text style={styles.priceSubtext}>※一度の購入で永久にご利用いただけます</Text>
            </View>

            {/* Actions */}
            <View style={styles.paywallBtnContainer}>
              <TouchableOpacity 
                style={[
                  styles.paywallUpgradeBtn, 
                  isPurchasing && { opacity: 0.5 },
                  (isPremium && !isEarly) && { backgroundColor: '#555', shadowColor: 'transparent', elevation: 0 }
                ]} 
                onPress={handlePurchase}
                disabled={isPurchasing || (isPremium && !isEarly)}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.paywallUpgradeBtnText}>
                    {(isPremium && !isEarly) ? 'プレミアムプラン適用済み' : 'プレミアムにアップグレードする'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.paywallRestoreBtn, isPurchasing && { opacity: 0.5 }]} 
                onPress={handleRestore}
                disabled={isPurchasing}
              >
                <Text style={styles.paywallRestoreBtnText}>購入情報を復元する (Restore)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Safeguard Initialization Modal */}
      <Modal visible={isResetModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Ionicons name="alert-circle-outline" size={56} color={Theme.colors.danger} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.profile.clear_data_confirm_title')}</Text>
            
            <ScrollView style={{ maxHeight: 150, width: '100%', marginBottom: 16 }} showsVerticalScrollIndicator={true}>
              <Text style={styles.modalDesc}>
                {t('ui.profile.clear_data_confirm_message')}
              </Text>
            </ScrollView>

            <TextInput
              style={styles.modalInput}
              value={resetConfirmText}
              onChangeText={setResetConfirmText}
              placeholder={t('ui.profile.clear_data_placeholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isResetting}
            />

            <View style={styles.modalBtnContainer}>
              <TouchableOpacity 
                style={[styles.modalCancelBtn, isResetting && { opacity: 0.5 }]} 
                onPress={() => {
                  if (isResetting) return;
                  setIsResetModalVisible(false);
                  setResetConfirmText('');
                }}
                disabled={isResetting}
              >
                <Text style={styles.modalCancelBtnText}>{t('ui.active_workout.cancel') || 'キャンセル'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalConfirmBtn, 
                  (resetConfirmText !== 'OK' || isResetting) && styles.modalConfirmBtnDisabled
                ]} 
                onPress={handleResetDatabase}
                disabled={resetConfirmText !== 'OK' || isResetting}
              >
                {isResetting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>{t('ui.profile.clear_data_confirm_btn') || '初期化する'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Promotion Code Modal */}
      <Modal visible={isPromoModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { borderColor: 'rgba(192, 132, 252, 0.3)' }]}>
            <Ionicons name="gift-outline" size={56} color="#c084fc" style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.profile.promo_modal_title')}</Text>
            
            <Text style={styles.modalDesc}>
              {t('ui.profile.promo_modal_desc')}
            </Text>

            <TextInput
              style={styles.promoInput}
              value={promoInputText}
              onChangeText={setPromoInputText}
              placeholder={t('ui.profile.promo_input_placeholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isApplyingPromo}
            />

            <View style={styles.modalBtnContainer}>
              <TouchableOpacity 
                style={[styles.modalCancelBtn, isApplyingPromo && { opacity: 0.5 }]} 
                onPress={() => {
                  if (isApplyingPromo) return;
                  setIsPromoModalVisible(false);
                  setPromoInputText('');
                }}
                disabled={isApplyingPromo}
              >
                <Text style={styles.modalCancelBtnText}>{t('ui.common.cancel') || 'キャンセル'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalConfirmBtn, 
                  { backgroundColor: '#c084fc' },
                  (promoInputText.trim() === '' || isApplyingPromo) && styles.modalConfirmBtnDisabled
                ]} 
                onPress={handleApplyPromo}
                disabled={promoInputText.trim() === '' || isApplyingPromo}
              >
                {isApplyingPromo ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>{t('ui.profile.promo_apply_btn') || '適用する'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  header: { marginBottom: Theme.spacing.lg, marginTop: Theme.spacing.md },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.text },
  section: { marginBottom: Theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.md },
  sectionTitle: { fontSize: 18, color: Theme.colors.text, fontWeight: 'bold' },
  settingCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  settingLabel: { color: Theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  settingDesc: { color: Theme.colors.textMuted, fontSize: 13, paddingRight: 40, lineHeight: 18 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  langChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  weightInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: Theme.colors.border, width: '100%', marginTop: 12 },
  
  // Danger Zone
  dangerButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(239, 83, 80, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.danger },
  dangerButtonText: { color: Theme.colors.danger, fontWeight: 'bold', fontSize: 14 },
  
  // Custom Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Theme.colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 12, textAlign: 'center' },
  modalDesc: { color: Theme.colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  modalInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: Theme.colors.border, width: '100%', marginBottom: 20, textAlign: 'center', fontWeight: 'bold', letterSpacing: 2 },
  modalBtnContainer: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center' },
  modalCancelBtnText: { color: Theme.colors.text, fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: Theme.colors.danger, alignItems: 'center', justifyContent: 'center' },
  modalConfirmBtnDisabled: { opacity: 0.3 },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // AI Coach Settings Styles
  aiTokensContainer: { marginTop: 12, width: '100%' },
  progressBarBg: { height: 8, backgroundColor: '#222', borderRadius: 4, width: '100%', overflow: 'hidden', marginTop: 12, marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  quotaWarning: { color: Theme.colors.danger, fontWeight: 'bold', fontSize: 13, marginTop: 8 },

  // Premium Account Card Styles
  accountCard: { 
    backgroundColor: Theme.colors.card, 
    borderRadius: Theme.borderRadius.md, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: Theme.colors.border, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  accountIconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#1c1c1e', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border
  },
  accountInfo: { flex: 1 },
  accountLabel: { 
    color: Theme.colors.textMuted, 
    fontSize: 12, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 2 
  },
  accountValue: { color: Theme.colors.text, fontSize: 16, fontWeight: 'bold' },
  accountValueEarly: { color: '#ffd700' },
  accountValuePremium: { color: '#4facfe' },

  // Paywall Styles
  paywallBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  paywallCard: { backgroundColor: Theme.colors.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 420, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79,172,254,0.3)', maxHeight: '90%' },
  paywallHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: 12 },
  paywallTitle: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text },
  paywallSubtitle: { fontSize: 14, color: Theme.colors.text, textAlign: 'center', lineHeight: 22, marginBottom: 20, fontWeight: '600', marginTop: 12 },
  paywallFeature: { flexDirection: 'row', marginBottom: 18, width: '100%', alignItems: 'flex-start' },
  paywallFeatureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(79,172,254,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(79,172,254,0.2)' },
  paywallFeatureInfo: { flex: 1 },
  paywallFeatureTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  paywallFeatureDesc: { fontSize: 13, color: Theme.colors.textMuted, lineHeight: 18 },
  priceContainer: { backgroundColor: '#1c1c1e', width: '100%', borderRadius: 12, padding: 16, alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: Theme.colors.border },
  priceLabel: { fontSize: 12, color: Theme.colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceValue: { fontSize: 26, fontWeight: 'bold', color: '#4facfe' },
  priceSubtext: { fontSize: 11, color: Theme.colors.textMuted, marginTop: 4 },
  paywallBtnContainer: { width: '100%', gap: 10, marginTop: 12 },
  paywallUpgradeBtn: { backgroundColor: Theme.colors.primary, width: '100%', paddingVertical: 14, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: Theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  paywallUpgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  paywallRestoreBtn: { width: '100%', paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  paywallRestoreBtnText: { color: Theme.colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
  premiumBadge: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderWidth: 1,
    borderColor: '#4facfe',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  premiumBadgeText: {
    color: '#4facfe',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalExportBtn: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
  },
  modalExportBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalImportBtn: {
    backgroundColor: '#ff4d4f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
  },
  modalImportBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: Theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  promoInput: { 
    backgroundColor: '#121212', 
    color: Theme.colors.text, 
    padding: 12, 
    borderRadius: 8, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: Theme.colors.border, 
    width: '100%', 
    marginBottom: 20, 
    textAlign: 'center', 
    fontWeight: 'bold', 
    letterSpacing: 2 
  },
  accountValuePremiumLimited: { color: '#c084fc' }
});
