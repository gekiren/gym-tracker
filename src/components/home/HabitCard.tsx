import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '../../theme';
import { useLifelogStore } from '../../store/lifelogStore';
import { HomeCard } from './HomeCard';

export const HabitCard = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const currentDate = useLifelogStore(state => state.currentDate);
  const daySummary = useLifelogStore(state => state.daySummary);
  const addHabitLog = useLifelogStore(state => state.addHabitLog);

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const handleIncrementHabit = (habitId: number) => {
    addHabitLog(habitId, currentDate || getTodayStr());
  };

  return (
    <HomeCard
      title={t('ui.home.card_habits') || '習慣カウンター'}
      iconName="checkmark-circle"
      iconColor="#e91e63"
      iconBgColor="rgba(233, 30, 99, 0.15)"
      gamificationFeatureId="habit"
      onHeaderPress={() => router.push('/lifelog/habit')}
    >
      {daySummary?.habits && daySummary.habits.length > 0 ? (
        <View style={styles.habitList}>
          {daySummary.habits.slice(0, 3).map((habit) => (
            <View
              key={habit.id}
              style={[styles.habitRow, { borderColor: colors.border }]}
            >
              <TouchableOpacity
                style={styles.habitMainClickArea}
                onPress={() => router.push('/lifelog/habit')}
                activeOpacity={0.7}
              >
                <View style={styles.habitInfo}>
                  <View
                    style={[
                      styles.habitColorDot,
                      { backgroundColor: habit.color || colors.text },
                    ]}
                  />
                  <Text style={[styles.habitName, { color: colors.text }]} numberOfLines={1}>
                    {habit.name}
                  </Text>
                </View>
                <Text style={[styles.habitCount, { color: colors.text }]}>
                  {habit.count} {t('ui.home.unit_times') || '回'}
                </Text>
              </TouchableOpacity>
              <View style={[styles.habitActionContainer, { borderLeftColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.habitAddBtn}
                  onPress={() => handleIncrementHabit(habit.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t('ui.home.no_habits') || '習慣が登録されていません'}
        </Text>
      )}
    </HomeCard>
  );
};

const styles = StyleSheet.create({
  habitList: {
    gap: 8,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    paddingLeft: 12,
    paddingRight: 4,
  },
  habitMainClickArea: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  habitColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  habitName: {
    fontSize: 15,
    flex: 1,
  },
  habitCount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  habitActionContainer: {
    borderLeftWidth: 1,
    paddingLeft: 4,
  },
  habitAddBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(233, 30, 99, 0.24)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
