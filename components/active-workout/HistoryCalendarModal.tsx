import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Theme } from '../../src/theme';
import { useTranslation } from 'react-i18next';

interface HistoryCalendarModalProps {
  visible: boolean;
  currentMonth: Date;
  history: any[];
  weightUnit: string;
  onClose: () => void;
  onNavigateMonth: (offset: number) => void;
  onDatePress: (dateStr: string) => void;
}

export function HistoryCalendarModal({
  visible,
  currentMonth,
  history,
  weightUnit,
  onClose,
  onNavigateMonth,
  onDatePress
}: HistoryCalendarModalProps) {
  const { t, i18n } = useTranslation();
  const isJa = i18n.language === 'ja';

  const monthYearText = isJa
    ? format(currentMonth, 'yyyy年 M月')
    : format(currentMonth, 'MMMM yyyy');

  const weekdays = isJa
    ? ['月', '火', '水', '木', '金', '土', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getMonthlyStats = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    let count = 0;
    let volume = 0;
    let set_count = 0;

    history.forEach(item => {
      const date = new Date(item.start_time);
      if (date >= monthStart && date <= monthEnd) {
        count++;
        set_count += item.sets.length;
        volume += item.sets.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0), 0);
      }
    });

    return { count, volume, set_count };
  };

  const days = getCalendarDays();
  const { count, volume, set_count } = getMonthlyStats();

  const workoutsMap: { [key: string]: boolean } = {};
  history.forEach(item => {
    const dStr = format(new Date(item.start_time), 'yyyy-MM-dd');
    workoutsMap[dStr] = true;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <View style={styles.calendarModalHeader}>
            <Text style={styles.calendarModalTitle}>
              {isJa ? 'トレーニング履歴カレンダー' : 'Training Calendar'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => onNavigateMonth(-1)}
              style={styles.monthNavButton}
            >
              <Ionicons name="chevron-back" size={22} color={Theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthYearText}</Text>
            <TouchableOpacity
              onPress={() => onNavigateMonth(1)}
              style={styles.monthNavButton}
            >
              <Ionicons name="chevron-forward" size={22} color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdaysContainer}>
            {weekdays.map((day, idx) => (
              <Text key={idx} style={styles.weekdayText}>{day}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const hasWorkout = workoutsMap[dayStr];
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.dayCell}
                  disabled={!hasWorkout}
                  onPress={() => onDatePress(dayStr)}
                >
                  <View style={[
                    styles.dayBox,
                    hasWorkout && styles.workoutDayBox
                  ]}>
                    <Text style={[
                      styles.dayText,
                      !isCurrentMonth && styles.dimmedDayText,
                      hasWorkout && styles.workoutDayText
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>
              {isJa ? '月間サマリー' : 'Monthly Summary'}
            </Text>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatBlock}>
                <Text style={styles.summaryStatLabel}>{isJa ? '実施日数' : 'Workouts'}</Text>
                <Text style={styles.summaryStatValue}>{count}{isJa ? '日' : ''}</Text>
              </View>
              <View style={styles.summaryStatBlock}>
                <Text style={styles.summaryStatLabel}>{isJa ? '総ボリューム' : 'Total Volume'}</Text>
                <Text style={styles.summaryStatValue}>
                  {volume > 0 ? `${volume.toLocaleString()} ${weightUnit}` : '-'}
                </Text>
              </View>
              <View style={styles.summaryStatBlock}>
                <Text style={styles.summaryStatLabel}>{isJa ? '総セット数' : 'Total Sets'}</Text>
                <Text style={styles.summaryStatValue}>
                  {set_count > 0 ? `${set_count}${isJa ? 'セット' : ' sets'}` : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.lg, maxHeight: '95%' },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.sm,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  monthNavButton: {
    padding: Theme.spacing.xs,
  },
  monthText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: Theme.spacing.xs,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  workoutDayBox: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
  },
  dayText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dimmedDayText: {
    color: '#444444',
  },
  workoutDayText: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  summaryContainer: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryStatBlock: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginBottom: 2,
  },
  summaryStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.text,
  }
});
