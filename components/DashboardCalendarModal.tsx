import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, addMonths } from 'date-fns';
import { Theme } from '../src/theme';
import { useTranslation } from 'react-i18next';
import { getDB } from '../src/db/database';

interface DashboardCalendarModalProps {
  visible: boolean;
  selectedDate: string; // 'yyyy/MM/dd'
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  type?: 'workout' | 'water' | 'zikan' | 'habit' | 'routine';
}

export function DashboardCalendarModal({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
  type = 'workout',
}: DashboardCalendarModalProps) {
  const { i18n } = useTranslation();
  const isJa = i18n.language === 'ja';

  // Helper to parse 'yyyy/MM/dd'
  const parseDateStr = (dateStr: string): Date => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  };

  // State to track the currently displayed month in the calendar view
  const [currentMonth, setCurrentMonth] = useState<Date>(() => parseDateStr(selectedDate));
  const [markedDates, setMarkedDates] = useState<{ [key: string]: boolean }>({});

  // Sync displayed month to selectedDate when the modal opens
  useEffect(() => {
    if (visible) {
      setCurrentMonth(parseDateStr(selectedDate));
    }
  }, [visible, selectedDate]);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    const fetchMarkedDates = async () => {
      try {
        const db = getDB();
        const map: { [key: string]: boolean } = {};

        if (type === 'workout') {
          const rows = await db.getAllAsync<{ start_time: string }>(
            'SELECT start_time FROM workouts'
          );
          rows.forEach((row) => {
            if (row.start_time) {
              const d = new Date(row.start_time);
              if (!isNaN(d.getTime())) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dStr = String(d.getDate()).padStart(2, '0');
                map[`${y}/${m}/${dStr}`] = true;
              }
            }
          });
        } else if (type === 'water') {
          const rows = await db.getAllAsync<{ date: string }>(
            'SELECT DISTINCT date FROM water_logs WHERE amount > 0'
          );
          rows.forEach((row) => {
            if (row.date) {
              map[row.date] = true;
            }
          });
        } else if (type === 'zikan') {
          const rows = await db.getAllAsync<{ date: string }>(
            'SELECT DISTINCT date FROM time_logs'
          );
          rows.forEach((row) => {
            if (row.date) {
              map[row.date] = true;
            }
          });
        } else if (type === 'habit') {
          const rows = await db.getAllAsync<{ date: string }>(
            'SELECT DISTINCT date FROM habit_logs'
          );
          rows.forEach((row) => {
            if (row.date) {
              map[row.date] = true;
            }
          });
        } else if (type === 'routine') {
          const row = await db.getFirstAsync<{ value: string }>(
            "SELECT value FROM settings WHERE key = 'routine_tracker_data'"
          );
          if (row && row.value) {
            try {
              const routineData = JSON.parse(row.value);
              if (Array.isArray(routineData)) {
                routineData.forEach((r) => {
                  if (r.history && Array.isArray(r.history)) {
                    r.history.forEach((h: any) => {
                      if (h.timestamp) {
                        const d = new Date(h.timestamp);
                        if (!isNaN(d.getTime())) {
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, '0');
                          const dStr = String(d.getDate()).padStart(2, '0');
                          map[`${y}/${m}/${dStr}`] = true;
                        }
                      }
                    });
                  }
                });
              }
            } catch (err) {
              console.warn('Failed to parse routine tracker data JSON', err);
            }
          }
        }

        if (isMounted) {
          setMarkedDates(map);
        }
      } catch (e) {
        console.warn('Failed to fetch marked dates for calendar', e);
      }
    };

    fetchMarkedDates();

    return () => {
      isMounted = false;
    };
  }, [visible, type]);

  const monthYearText = isJa
    ? format(currentMonth, 'yyyy年 M月')
    : format(currentMonth, 'MMMM yyyy');

  const weekdays = isJa
    ? ['月', '火', '水', '木', '金', '土', '日']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    // Standard calendar starting from Monday (1)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const handleNavigateMonth = (offset: number) => {
    setCurrentMonth(prev => addMonths(prev, offset));
  };

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const todayStr = getTodayStr();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.calendarModalHeader}>
            <Text style={styles.calendarModalTitle}>
              {isJa ? '日付を選択' : 'Select Date'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => handleNavigateMonth(-1)}
              style={styles.monthNavButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color={Theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthYearText}</Text>
            <TouchableOpacity
              onPress={() => handleNavigateMonth(1)}
              style={styles.monthNavButton}
              activeOpacity={0.7}
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
              const dayStr = format(day, 'yyyy/MM/dd');
              const isSelected = dayStr === selectedDate;
              const isToday = dayStr === todayStr;
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const hasData = markedDates[dayStr];

              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.dayCell}
                  onPress={() => {
                    onSelectDate(dayStr);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.dayBox,
                    isSelected && styles.selectedDayBox,
                    isToday && !isSelected && styles.todayDayBox,
                    hasData && !isSelected && styles.workoutDayBox
                  ]}>
                    <Text style={[
                      styles.dayText,
                      !isCurrentMonth && styles.dimmedDayText,
                      isSelected && styles.selectedDayText,
                      isToday && !isSelected && styles.todayDayText,
                      hasData && !isSelected && styles.workoutDayText
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footerContainer}>
            <TouchableOpacity 
              style={styles.todayButton}
              onPress={() => {
                onSelectDate(todayStr);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.todayButtonText}>
                {isJa ? '今日を選択' : 'Select Today'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.lg, padding: Theme.spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
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
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  selectedDayBox: {
    backgroundColor: Theme.colors.primary,
  },
  todayDayBox: {
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
  selectedDayText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  footerContainer: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    alignItems: 'center',
  },
  todayButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  todayButtonText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  workoutDayBox: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  workoutDayText: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  }
});
