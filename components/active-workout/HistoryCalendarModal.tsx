import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval } from 'date-fns';
import { useAppTheme } from '../../src/theme';
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
  const { colors } = useAppTheme();
  const isJa = i18n.language === 'ja';

  const monthYearText = isJa
    ? format(currentMonth, 'yyyy年 M月')
    : format(currentMonth, 'MMMM yyyy');

  const weekdays = isJa
    ? ['月', '火', '水', '木', '金', '土', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const { count, volume, set_count } = useMemo(() => {
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
  }, [currentMonth, history]);

  const workoutsMap = useMemo(() => {
    const map: { [key: string]: boolean } = {};
    history.forEach(item => {
      const dStr = format(new Date(item.start_time), 'yyyy-MM-dd');
      map[dStr] = true;
    });
    return map;
  }, [history]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '90%' }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.calendarModalHeader}>
            <Text style={[styles.calendarModalTitle, { color: colors.text }]}>
              {isJa ? 'トレーニング履歴カレンダー' : 'Training Calendar'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => onNavigateMonth(-1)}
              style={styles.monthNavButton}
            >
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: colors.text }]}>{monthYearText}</Text>
            <TouchableOpacity
              onPress={() => onNavigateMonth(1)}
              style={styles.monthNavButton}
            >
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdaysContainer}>
            {weekdays.map((day, idx) => (
              <Text key={idx} style={[styles.weekdayText, { color: colors.textMuted }]}>{day}</Text>
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
                    hasWorkout && [styles.workoutDayBox, { borderColor: colors.primary }]
                  ]}>
                    <Text style={[
                      styles.dayText,
                      { color: colors.text },
                      !isCurrentMonth && { color: colors.textMuted, opacity: 0.45 },
                      hasWorkout && { color: colors.primary, fontWeight: 'bold' }
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.summaryContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              {isJa ? '月間サマリー' : 'Monthly Summary'}
            </Text>
            <View style={[styles.summaryStatsRow, { borderColor: colors.border }]}>
              <View style={styles.summaryStatBlock}>
                <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>{isJa ? '実施日数' : 'Workouts'}</Text>
                <Text style={[styles.summaryStatValue, { color: colors.text }]}>{count}{isJa ? '日' : ''}</Text>
              </View>
              <View style={styles.summaryStatBlock}>
                <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>{isJa ? '総ボリューム' : 'Total Volume'}</Text>
                <Text style={[styles.summaryStatValue, { color: colors.text }]}>
                  {volume > 0 ? `${volume.toLocaleString()} ${weightUnit}` : '-'}
                </Text>
              </View>
              <View style={styles.summaryStatBlock}>
                <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>{isJa ? '総セット数' : 'Total Sets'}</Text>
                <Text style={[styles.summaryStatValue, { color: colors.text }]}>
                  {set_count > 0 ? `${set_count}${isJa ? 'セット' : ' sets'}` : '-'}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, borderRadius: 16, borderWidth: 1, padding: 24, maxHeight: '95%' },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  monthNavButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 4,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
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
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  workoutDayBox: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  summaryStatBlock: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  summaryStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
  }
});
