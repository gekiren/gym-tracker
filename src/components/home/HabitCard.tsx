import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Theme } from '../../theme';
import { useLifelogStore } from '../../store/lifelogStore';

export const HabitCard = () => {
  const { t } = useTranslation();
  
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
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardHeader}
        activeOpacity={0.7}
        onPress={() => router.push('/lifelog/habit')}
      >
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(233, 30, 99, 0.15)' }]}>
          <Ionicons name="checkmark-circle" size={24} color="#e91e63" />
        </View>
        <Text style={styles.cardTitle}>{t('ui.home.card_habits') || '習慣カウンター'}</Text>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <View style={styles.cardBody}>
        {daySummary?.habits && daySummary.habits.length > 0 ? (
          <View style={styles.habitList}>
            {daySummary.habits.slice(0, 3).map((habit) => (
              <View key={habit.id} style={styles.habitRow}>
                <TouchableOpacity
                  style={styles.habitMainClickArea}
                  onPress={() => router.push('/lifelog/habit')}
                  activeOpacity={0.7}
                >
                  <View style={styles.habitInfo}>
                    <View style={[styles.habitColorDot, { backgroundColor: habit.color || '#fff' }]} />
                    <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                  </View>
                  <Text style={styles.habitCount}>{habit.count} {t('ui.home.unit_times') || '回'}</Text>
                </TouchableOpacity>
                <View style={styles.habitActionContainer}>
                  <TouchableOpacity
                    style={styles.habitAddBtn}
                    onPress={() => handleIncrementHabit(habit.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('ui.home.no_habits') || '習慣が登録されていません'}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    color: Theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    paddingLeft: 52,
  },
  habitList: {
    gap: 8,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 8,
  },
  habitMainClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  habitColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  habitName: {
    color: Theme.colors.text,
    fontSize: 15,
    flex: 1,
  },
  habitCount: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  habitActionContainer: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    paddingLeft: 8,
  },
  habitAddBtn: {
    backgroundColor: 'rgba(233, 30, 99, 0.2)',
    padding: 6,
    borderRadius: 6,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
