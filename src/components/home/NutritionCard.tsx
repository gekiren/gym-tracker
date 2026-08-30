import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Theme } from '../../theme';
import { useNutritionStore } from '../../store/nutritionStore';

export const NutritionCard = () => {
  const { t } = useTranslation();

  // Nutrition Store
  const mealLogs = useNutritionStore(state => state.mealLogs);
  const userNutritionGoals = useNutritionStore(state => state.userNutritionGoals);

  const logs = mealLogs || [];
  const goalCal = userNutritionGoals?.calories || 2000;
  const totalCal = logs.reduce((acc, curr) => acc + (curr.calories || 0), 0);
  const totalP = logs.reduce((acc, curr) => acc + (curr.protein || 0), 0);
  const totalF = logs.reduce((acc, curr) => acc + (curr.fat || 0), 0);
  const totalC = logs.reduce((acc, curr) => acc + (curr.carbs || 0), 0);
  const calPercent = Math.min(100, Math.round((totalCal / goalCal) * 100));

  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.85}
      onPress={() => router.push('/lifelog/nutrition')}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
          <Ionicons name="restaurant" size={24} color="#10b981" />
        </View>
        <Text style={styles.cardTitle}>{t('ui.home.card_nutrition') || '栄養・食事管理'}</Text>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.statRow}>
          <Text style={styles.statVal}>{Math.round(totalCal)} <Text style={styles.statUnit}>kcal</Text></Text>
          <Text style={styles.statGoal}>/ {goalCal} kcal ({logs.length}{t('ui.home.unit_items') || '件'})</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${calPercent}%`,
                  backgroundColor: '#10b981' 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressPercent}>{calPercent}%</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155' }}>
          <Text style={{ fontSize: 13, color: '#94a3b8' }}>P: <Text style={{ fontWeight: '700', color: '#06b6d4' }}>{totalP.toFixed(1)}g</Text></Text>
          <Text style={{ fontSize: 13, color: '#94a3b8' }}>F: <Text style={{ fontWeight: '700', color: '#f59e0b' }}>{totalF.toFixed(1)}g</Text></Text>
          <Text style={{ fontSize: 13, color: '#94a3b8' }}>C: <Text style={{ fontWeight: '700', color: '#a855f7' }}>{totalC.toFixed(1)}g</Text></Text>
        </View>
      </View>
    </TouchableOpacity>
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
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  statVal: {
    color: Theme.colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  statUnit: {
    fontSize: 16,
    color: Theme.colors.textMuted,
  },
  statGoal: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    marginLeft: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'right',
  },
});
