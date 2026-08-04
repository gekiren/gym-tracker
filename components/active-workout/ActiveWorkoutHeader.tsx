import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { ElapsedTimerHeader } from './ElapsedTimerHeader';

interface ActiveWorkoutHeaderRightProps {
  isWorkoutStarted: boolean;
  startTime: string | null;
  restTimerActive: boolean;
  isSaving: boolean;
  t: (key: string) => string;
  onOpenPlateCalc: () => void;
  onManualTimer: () => void;
  onFinish: () => void;
}

export const ActiveWorkoutHeaderRight: React.FC<ActiveWorkoutHeaderRightProps> = React.memo(({
  isWorkoutStarted,
  startTime,
  restTimerActive,
  isSaving,
  t,
  onOpenPlateCalc,
  onManualTimer,
  onFinish,
}) => {
  return (
    <View style={styles.container}>
      {isWorkoutStarted && (
        <ElapsedTimerHeader startTime={startTime} style={styles.headerTimeText} />
      )}
      <TouchableOpacity
        onPress={() => router.push('/rm-calculator')}
        style={styles.calcBtn}
        accessibilityLabel={t('ui.accessibility.rm_calculator')}
      >
        <Ionicons name="calculator-outline" size={26} color={Theme.colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onOpenPlateCalc}
        style={styles.iconBtn}
        accessibilityLabel={t('ui.accessibility.plate_calculator')}
      >
        <Ionicons name="barbell-outline" size={26} color={Theme.colors.primary} />
      </TouchableOpacity>
      {!restTimerActive && (
        <TouchableOpacity
          onPress={onManualTimer}
          style={styles.iconBtn}
          accessibilityLabel={t('ui.accessibility.timer_setting')}
        >
          <Ionicons name="timer-outline" size={26} color={Theme.colors.primary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        disabled={isSaving}
        onPress={onFinish}
        style={[styles.finishBtn, { opacity: isSaving ? 0.5 : 1 }]}
      >
        <Text style={styles.finishBtnText}>{t('ui.active_workout.finish')}</Text>
      </TouchableOpacity>
    </View>
  );
});

interface ActiveWorkoutHeaderLeftProps {
  t: (key: string) => string;
  onBack: () => void;
}

export const ActiveWorkoutHeaderLeft: React.FC<ActiveWorkoutHeaderLeftProps> = React.memo(({ t, onBack }) => {
  return (
    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
      <Text style={styles.backBtnText}>{t('ui.common.back')}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTimeText: {
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  calcBtn: {
    marginRight: 16,
    marginLeft: 8,
  },
  iconBtn: {
    marginRight: 16,
  },
  finishBtn: {
    marginRight: 8,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  finishBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  backBtn: {
    marginLeft: 8,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
