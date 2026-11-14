import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../src/theme';

interface ResumeWorkoutButtonProps {
  lastRestFinishedAt: number | null;
  onPress: () => void;
}

export function ResumeWorkoutButton({ lastRestFinishedAt, onPress }: ResumeWorkoutButtonProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!lastRestFinishedAt) return;
    
    setElapsed(Math.floor((Date.now() - lastRestFinishedAt) / 1000));

    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - lastRestFinishedAt) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [lastRestFinishedAt]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const btnText = lastRestFinishedAt 
    ? `${t('ui.active_workout.manual_start_btn')}（${formatTime(elapsed)}）`
    : t('ui.active_workout.manual_start_btn');

  return (
    <TouchableOpacity style={[styles.manualStartBtn, { backgroundColor: colors.primary }]} onPress={onPress}>
      <Text style={styles.manualStartBtnText}>{btnText}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  manualStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  },
  manualStartBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
