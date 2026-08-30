import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Theme } from '../../theme';
import { useLifelogStore } from '../../store/lifelogStore';

export const WaterCard = () => {
  const { t } = useTranslation();

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
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardHeader}
        activeOpacity={0.7}
        onPress={() => router.push('/lifelog/water')}
      >
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}>
          <Ionicons name="water" size={24} color="#00d2ff" />
        </View>
        <Text style={styles.cardTitle}>{t('ui.home.card_water') || '水分補給'}</Text>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <View style={styles.cardBody}>
        <View style={styles.statRow}>
          <Text style={styles.statVal}>{daySummary?.water.amount ?? 0} <Text style={styles.statUnit}>ml</Text></Text>
          <Text style={styles.statGoal}>/ {daySummary?.water.goal ?? 2000} ml</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(100, daySummary?.water.percentage ?? 0)}%`,
                  backgroundColor: '#00d2ff' 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressPercent}>{daySummary?.water.percentage ?? 0}%</Text>
        </View>

        <View style={styles.presetsRow}>
          {waterPresets.map((preset, idx) => (
            <TouchableOpacity 
              key={idx}
              style={styles.presetBtn} 
              onPress={() => handleAddWaterAmount(preset.amount, preset.caffeine)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetBtnText}>
                {preset.caffeine > 0 ? `☕${preset.amount}ml` : `${preset.amount}ml`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  presetBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  presetBtnText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
