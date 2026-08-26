import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { saveSetting } from '../../src/db/database';
import { changeLanguage, getCurrentLanguage } from '../../src/i18n';
import { DisplayFieldsSection } from './DisplayFieldsSection';
import { TimerSection } from './TimerSection';
import { PreferenceSection } from './PreferenceSection';

export function WorkoutTimerSettingsContent() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state: any) => state.settings);
  const loadSettings = useSettingsStore((state: any) => state.loadSettings);

  const [defaultRest, setDefaultRest] = useState(settings.defaultRest);
  const [autoRest, setAutoRest] = useState(settings.autoRest);
  const [timerNotification, setTimerNotification] = useState(settings.timerNotification);
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
    setTimerNotification(settings.timerNotification);
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
    loadSettings({ defaultRest: secs, autoRest, timerNotification, timerVibrate, weightUnit });
    await saveSetting('default_rest_timer', secs.toString());
  };

  const handleUpdateAuto = async (val: boolean) => {
    setAutoRest(val);
    loadSettings({ defaultRest, autoRest: val, timerNotification, timerVibrate, weightUnit });
    await saveSetting('auto_rest_timer', val ? '1' : '0');
  };

  const handleUpdateNotification = async (val: boolean) => {
    setTimerNotification(val);
    useSettingsStore.getState().setTimerNotification(val);
    await saveSetting('timer_notification', val ? '1' : '0');
  };

  const handleUpdateVibrate = async (val: boolean) => {
    setTimerVibrate(val);
    loadSettings({ defaultRest, autoRest, timerNotification, timerVibrate: val, weightUnit });
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

  return (
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
        timerNotification={timerNotification}
        onUpdateNotification={handleUpdateNotification}
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
  );
}

const styles = StyleSheet.create({
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
});
