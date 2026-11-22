import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '../../theme';
import { useLifelogStore } from '../../store/lifelogStore';
import { HomeCard } from './HomeCard';

export const WaterCard = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  // Lifelog Store
  const currentDate = useLifelogStore(state => state.currentDate);
  const daySummary = useLifelogStore(state => state.daySummary);
  const addWater = useLifelogStore(state => state.addWater);
  const waterPresets = useLifelogStore(state => state.waterPresets);

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const handleAddWaterAmount = (amount: number, caffeine: number = 0) => {
    addWater(amount, currentDate || getTodayStr(), caffeine);
  };

  return (
    <HomeCard
      title={t('ui.home.card_water') || '水分補給'}
      iconName="water"
      iconColor="#00d2ff"
      iconBgColor="rgba(0, 210, 255, 0.15)"
      gamificationFeatureId="water"
      onHeaderPress={() => router.push('/lifelog/water')}
    >
      <View style={styles.statRow}>
        <Text style={[styles.statVal, { color: colors.text }]}>
          {daySummary?.water.amount ?? 0}{' '}
          <Text style={[styles.statUnit, { color: colors.textMuted }]}>ml</Text>
        </Text>
        <Text style={[styles.statGoal, { color: colors.textMuted }]}>
          / {daySummary?.water.goal ?? 2000} ml
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, daySummary?.water.percentage ?? 0)}%`,
                backgroundColor: '#00d2ff',
              },
            ]}
          />
        </View>
        <Text style={[styles.progressPercent, { color: colors.text }]}>
          {daySummary?.water.percentage ?? 0}%
        </Text>
      </View>

      <View style={styles.presetsRow}>
        {waterPresets.map((preset, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.presetBtn, { borderColor: colors.border }]}
            onPress={() => handleAddWaterAmount(preset.amount, preset.caffeine)}
            activeOpacity={0.7}
          >
            <Text style={[styles.presetBtnText, { color: colors.text }]}>
              {preset.caffeine > 0 ? `☕ ${preset.amount}ml` : `${preset.amount}ml`}
            </Text>
          </TouchableOpacity>
        ))}
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
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  presetBtn: {
    minHeight: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
