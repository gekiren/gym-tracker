import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Linking, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { saveSetting, resetDatabase, getSettings } from '../../src/db/database';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../../src/i18n';

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

  // Database Reset State
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [accountType, setAccountType] = useState<'basic' | 'premium' | 'early_adopter'>('basic');

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

    const fetchAccountType = async () => {
      try {
        const stored = await getSettings();
        const isEarly = stored['is_early_adopter'] === 'true';
        const isPremium = stored['premium_until'] === 'perpetual' || (stored['premium_until'] !== '' && !isNaN(Date.parse(stored['premium_until'])) && Date.parse(stored['premium_until']) > Date.now());
        
        if (isEarly) {
          setAccountType('early_adopter');
        } else if (isPremium) {
          setAccountType('premium');
        } else {
          setAccountType('basic');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('ui.profile.title')}</Text>
      </View>

      {/* Account Type Card */}
      <View style={styles.accountCard}>
        <View style={styles.accountIconContainer}>
          <Ionicons 
            name={
              accountType === 'early_adopter' ? 'ribbon-sharp' :
              accountType === 'premium' ? 'star-sharp' : 'person-sharp'
            } 
            size={22} 
            color={
              accountType === 'early_adopter' ? '#ffd700' : 
              accountType === 'premium' ? '#4facfe' : 
              Theme.colors.textMuted
            } 
          />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountLabel}>{t('ui.profile.account_type_label') || 'アカウントの種類'}</Text>
          <Text style={[
            styles.accountValue,
            accountType === 'early_adopter' && styles.accountValueEarly,
            accountType === 'premium' && styles.accountValuePremium
          ]}>
            {
              accountType === 'early_adopter' ? (t('ui.profile.account_early_adopter') || 'アーリーアダプター（無制限）') :
              accountType === 'premium' ? (t('ui.profile.account_premium') || 'プレミアムプラン') :
              (t('ui.profile.account_basic') || 'ベーシックプラン')
            }
          </Text>
        </View>
      </View>

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
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
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
          <Text style={styles.sectionTitle}>{t('ui.profile.section_ai_coach') || 'AIコーチ設定'}</Text>
        </View>
        <View style={styles.settingCard}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Text style={styles.settingLabel}>{t('ui.profile.ai_tokens_balance') || '今月の利用枠残高'}</Text>
              <Text style={{ color: settings.aiTokensBalance === 0 ? Theme.colors.danger : Theme.colors.text, fontWeight: 'bold', fontSize: 16 }}>
                {`${settings.aiTokensBalance} / 20`}
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
                      width: `${Math.min(100, Math.max(0, (settings.aiTokensBalance / 20) * 100))}%`,
                      backgroundColor: settings.aiTokensBalance === 0 ? Theme.colors.danger : Theme.colors.primary 
                    }
                  ]} 
                />
              </View>
              {settings.aiTokensBalance === 0 && (
                <Text style={styles.quotaWarning}>{t('ui.profile.quota_exhausted_alert') || '今月の利用枠が残っていません。'}</Text>
              )}
              <Text style={[styles.settingDesc, { marginTop: 6, paddingRight: 0 }]}>
                {t('ui.profile.ai_tokens_reset_desc') || '30日後に利用枠は自動的に20回にリセットされます。'}
              </Text>
            </View>
          </View>
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
            <Text style={{ color: Theme.colors.textMuted }}>{Constants.expoConfig?.version || '1.0.0'}</Text>
          </View>
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
  accountValuePremium: { color: '#4facfe' }
});
