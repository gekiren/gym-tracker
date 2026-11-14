import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useAppTheme } from '../../src/theme';

interface FloatingRestTimerProps {
  safeBottomOffset: number;
}

export function FloatingRestTimer({ safeBottomOffset }: FloatingRestTimerProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const restTimer = useWorkoutStore(state => state.restTimer);
  const stopRestTimer = useWorkoutStore(state => state.stopRestTimer);
  const adjustRestTimer = useWorkoutStore(state => state.adjustRestTimer);
  const timerNotification = useSettingsStore(state => state.settings.timerNotification);

  if (!restTimer.isActive) return null;

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.timerOverlay, { bottom: safeBottomOffset + 24, backgroundColor: colors.primary }]}>
      <View style={styles.timerContent}>
        <View>
          <Text style={styles.timerLabel}>{t('ui.active_workout.rest_label_resting')}</Text>
          <Text style={styles.timerDigits}>{formatTime(restTimer.remaining)}</Text>
        </View>
        <View style={styles.timerActions}>
          <TouchableOpacity
            style={styles.timerBtn}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            onPress={() => adjustRestTimer(-30, timerNotification)}
          >
            <Text style={styles.timerBtnText}>-30s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timerBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            onPress={stopRestTimer}
          >
            <Text style={[styles.timerBtnText, { color: colors.text }]}>{t('ui.active_workout.skip_label')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timerBtn}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            onPress={() => adjustRestTimer(30, timerNotification)}
          >
            <Text style={styles.timerBtnText}>+30s</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6
  },
  timerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timerLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: 'bold'
  },
  timerDigits: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold'
  },
  timerActions: {
    flexDirection: 'row',
    gap: 8
  },
  timerBtn: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  timerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});
