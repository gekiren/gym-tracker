import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '../../src/theme';
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
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      {isWorkoutStarted && (
        <ElapsedTimerHeader startTime={startTime} style={[styles.headerTimeText, { color: colors.text }]} />
      )}
      <TouchableOpacity
        onPress={() => router.push('/rm-calculator')}
        style={styles.calcBtn}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        accessibilityLabel={t('ui.accessibility.rm_calculator')}
      >
        <Ionicons name="calculator-outline" size={24} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onOpenPlateCalc}
        style={styles.iconBtn}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        accessibilityLabel={t('ui.accessibility.plate_calculator')}
      >
        <Ionicons name="barbell-outline" size={24} color={colors.primary} />
      </TouchableOpacity>
      {!restTimerActive && (
        <TouchableOpacity
          onPress={onManualTimer}
          style={styles.iconBtn}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          accessibilityLabel={t('ui.accessibility.timer_setting')}
        >
          <Ionicons name="timer-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        disabled={isSaving}
        onPress={onFinish}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
        style={[styles.finishBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.5 : 1 }]}
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
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onBack}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[styles.backBtn, { backgroundColor: colors.primary }]}
    >
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
    fontSize: 15,
    fontWeight: '600',
  },
  calcBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 4,
    borderRadius: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    borderRadius: 8,
  },
  finishBtn: {
    marginLeft: 4,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  finishBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  backBtn: {
    marginLeft: 8,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

ActiveWorkoutHeaderRight.displayName = 'ActiveWorkoutHeaderRight';
ActiveWorkoutHeaderLeft.displayName = 'ActiveWorkoutHeaderLeft';
