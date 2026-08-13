import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { saveSetting } from '../../src/db/database';
import { changeLanguage, getCurrentLanguage } from '../../src/i18n';
import { DisplayFieldsSection } from '../../components/profile/DisplayFieldsSection';
import { TimerSection } from '../../components/profile/TimerSection';
import { PreferenceSection } from '../../components/profile/PreferenceSection';

export default function WorkoutTimerSettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore(state => state.settings);
  const loadSettings = useSettingsStore(state => state.loadSettings);

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
  }, [settings]);

  const handleUpdateRest = async (secs: number) => {
    setDefaultRest(secs);
    loadSettings({ defaultRest: secs, autoRest, timerVibrate, weightUnit });
    await saveSetting('default_rest_timer', secs.toString());
  };

  const handleUpdateAuto = async (val: boolean) => {
    setAutoRest(val);
    loadSettings({ defaultRest, autoRest: val, timerVibrate, weightUnit });
    await saveSetting('auto_rest_timer', val ? '1' : '0');
  };

  const handleUpdateVibrate = async (val: boolean) => {
    setTimerVibrate(val);
    loadSettings({ defaultRest, autoRest, timerVibrate: val, weightUnit });
    await saveSetting('timer_vibrate', val ? '1' : '0');
  };

  const handleUpdateKeepAwake = async (val: boolean) => {
    setKeepAwake(val);
    useSettingsStore.getState().setKeepAwake(val);
    await saveSetting('keep_awake', val ? '1' : '0');
  };

  const handleUpdateUnit = async (unit: 'kg' | 'lbs') => {
    setWeightUnit(unit);
    loadSettings({ defaultRest, autoRest, timerVibrate, weightUnit: unit });
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
    useSettingsStore.getState().setCrashConsent(consent);
    await saveSetting('crash_report_consent', consent);
  };

  const handleUpdateAlwaysOneSet = async (val: boolean) => {
    setAlwaysOneSet(val);
    useSettingsStore.getState().setAlwaysOneSet(val);
    await saveSetting('always_one_set', val ? '1' : '0');
  };

  const handleUpdateBodyWeight = async (val: string) => {
    setLocalBodyWeight(val);
    if (val === '') {
      useSettingsStore.getState().setBodyWeight(null);
      await saveSetting('body_weight', '');
    } else {
      const num = parseFloat(val.replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        useSettingsStore.getState().setBodyWeight(num);
        await saveSetting('body_weight', num.toString());

        // 栄養管理目標（PFC / カロリー）の体重数値にも即時連動
        const currentGoals = useNutritionStore.getState().userNutritionGoals;
        if (currentGoals && currentGoals.weight !== num) {
          await useNutritionStore.getState().saveGoals({
            ...currentGoals,
            weight: num,
          });
        }
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
    useSettingsStore.getState().setDisplayFields({ [field]: val });
    await saveSetting(keyMap[field], val ? '1' : '0');
    await saveSetting('style_mode', 'custom');
  };

  const setBackgroundTheme = useSettingsStore(state => state.setBackgroundTheme);
  const handleUpdateBackgroundTheme = (theme: 'dark' | 'pureBlack') => {
    setBackgroundTheme(theme);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>筋トレ・タイマー・環境設定</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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

        <PreferenceSection
          weightUnit={weightUnit}
          onUpdateUnit={handleUpdateUnit}
          bodyWeight={bodyWeight}
          onUpdateBodyWeight={handleUpdateBodyWeight}
          t={t}
        />
      </ScrollView>
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
});
