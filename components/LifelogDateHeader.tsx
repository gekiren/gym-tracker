import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { useLifelogStore } from '../src/store/lifelogStore';
import { DashboardCalendarModal } from './DashboardCalendarModal';

interface LifelogDateHeaderProps {
  style?: StyleProp<ViewStyle>;
  type?: 'workout' | 'water' | 'zikan' | 'habit' | 'routine';
}

export function LifelogDateHeader({ style, type }: LifelogDateHeaderProps) {
  const currentDate = useLifelogStore((state) => state.currentDate);
  const setCurrentDate = useLifelogStore((state) => state.setCurrentDate);
  const [isCalendarVisible, setCalendarVisible] = useState(false);

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

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
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const handlePrevDay = () => {
    const date = parseDateStr(currentDate || getTodayStr());
    date.setDate(date.getDate() - 1);
    setCurrentDate(formatDate(date));
  };

  const handleNextDay = () => {
    const date = parseDateStr(currentDate || getTodayStr());
    date.setDate(date.getDate() + 1);
    setCurrentDate(formatDate(date));
  };

  const handleGoToday = () => {
    setCurrentDate(getTodayStr());
  };

  const isToday = currentDate === getTodayStr();

  return (
    <View style={[styles.dateHeader, style]}>
      <TouchableOpacity onPress={handlePrevDay} style={styles.dateNavBtn}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      <View style={styles.dateTextContainer}>
        <TouchableOpacity 
          onPress={() => setCalendarVisible(true)} 
          style={styles.dateSelectorTrigger}
          activeOpacity={0.7}
        >
          <Text style={styles.dateText}>{currentDate || getTodayStr()}</Text>
          <Ionicons name="calendar-outline" size={16} color={Theme.colors.textMuted} />
        </TouchableOpacity>
        {!isToday && (
          <TouchableOpacity onPress={handleGoToday} style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>今日に戻る</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={handleNextDay} style={styles.dateNavBtn}>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </TouchableOpacity>

      <DashboardCalendarModal
        visible={isCalendarVisible}
        selectedDate={currentDate || getTodayStr()}
        onClose={() => setCalendarVisible(false)}
        onSelectDate={(dateStr) => setCurrentDate(dateStr)}
        type={type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  dateNavBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dateTextContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dateSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  dateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  todayBadge: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Theme.borderRadius.sm,
  },
  todayBadgeText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
