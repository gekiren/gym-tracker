import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '../../theme';
import { useNutritionStore } from '../../store/nutritionStore';
import { HomeCard } from './HomeCard';

export const NutritionCard = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

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
    <HomeCard
      title={t('ui.home.card_nutrition') || '栄養・食事管理'}
      iconName="restaurant"
      iconColor="#10b981"
      iconBgColor="rgba(16, 185, 129, 0.15)"
      gamificationFeatureId="nutrition"
      onPress={() => router.push('/lifelog/nutrition')}
    >
      <View style={styles.statRow}>
        <Text style={[styles.statVal, { color: colors.text }]}>
          {Math.round(totalCal)}{' '}
          <Text style={[styles.statUnit, { color: colors.textMuted }]}>kcal</Text>
        </Text>
        <Text style={[styles.statGoal, { color: colors.textMuted }]}>
          / {goalCal} kcal ({logs.length}
          {t('ui.home.unit_items') || '件'})
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${calPercent}%`,
                backgroundColor: '#10b981',
              },
            ]}
          />
        </View>
        <Text style={[styles.progressPercent, { color: colors.text }]}>{calPercent}%</Text>
      </View>

      <View style={[styles.macrosRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.macroLabel, { color: colors.textMuted }]}>
          P: <Text style={styles.macroP}>{totalP.toFixed(1)}g</Text>
        </Text>
        <Text style={[styles.macroLabel, { color: colors.textMuted }]}>
          F: <Text style={styles.macroF}>{totalF.toFixed(1)}g</Text>
        </Text>
        <Text style={[styles.macroLabel, { color: colors.textMuted }]}>
          C: <Text style={styles.macroC}>{totalC.toFixed(1)}g</Text>
        </Text>
      </View>
    </HomeCard>
  );
};

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  statVal: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statUnit: {
    fontSize: 16,
  },
  statGoal: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 48,
    textAlign: 'right',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  macroLabel: {
    fontSize: 13,
  },
  macroP: {
    fontWeight: '700',
    color: '#06b6d4',
  },
  macroF: {
    fontWeight: '700',
    color: '#f59e0b',
  },
  macroC: {
    fontWeight: '700',
    color: '#a855f7',
  },
});
