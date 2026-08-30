import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Theme } from '../../theme';
import { useBodyStore } from '../../store/bodyStore';
import { analyzeMusclePotential } from '../../utils/bodyCalculators';

export const BodyCard = () => {
  const { t } = useTranslation();

  // Body Store
  const currentBodyLog = useBodyStore(state => state.currentLog);
  const latestBodyLog = useBodyStore(state => state.latestLog);
  const savedBodyMeasurements = useBodyStore(state => state.savedMeasurements);

  const log = currentBodyLog || latestBodyLog;
  const weight = log?.weight ?? null;
  const bodyFatRate = log?.body_fat_rate ?? null;
  const height = log?.height ?? savedBodyMeasurements.height ?? 175;
  const wrist = log?.wrist ?? savedBodyMeasurements.wrist ?? null;
  const ankle = log?.ankle ?? savedBodyMeasurements.ankle ?? null;

  const lbm = weight && bodyFatRate ? Number((weight * (1 - bodyFatRate / 100)).toFixed(1)) : null;
  const potential = weight && bodyFatRate && height && wrist && ankle
    ? analyzeMusclePotential(weight, bodyFatRate, height, wrist, ankle)
    : null;

  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.85}
      onPress={() => router.push('/lifelog/body')}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
          <Ionicons name="body" size={24} color="#38bdf8" />
        </View>
        <Text style={styles.cardTitle}>{t('ui.home.card_body_composition') || '体組成・筋肥大限界'}</Text>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
      </View>

      <View style={styles.cardBody}>
        {!weight && !bodyFatRate ? (
          <Text style={styles.inactiveText}>
            {t('ui.home.body_comp_empty') || '体組成データが未記録です。タップして体重・体脂肪率・骨格限界モデルを診断しましょう。'}
          </Text>
        ) : (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statVal}>
                {weight !== null ? weight.toFixed(1) : '--'}{' '}
                <Text style={styles.statUnit}>kg</Text>
              </Text>
              <Text style={styles.statGoal}>
                / {t('ui.home.body_fat_rate') || '体脂肪率 '} {bodyFatRate !== null ? `${bodyFatRate.toFixed(1)}%` : '--'}
                {lbm !== null ? ` (LBM ${lbm}kg)` : ''}
              </Text>
            </View>

            {potential ? (
              <>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${Math.min(100, potential.reachPercentage)}%`,
                          backgroundColor: '#38bdf8' 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressPercent}>{potential.reachPercentage}%</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#334155' }}>
                  <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                    {t('ui.home.limit_lbm') || '限界除脂肪: '} <Text style={{ fontWeight: '700', color: '#a78bfa' }}>{potential.maxLbm}kg</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                    {t('ui.home.gainable') || '増量可能: '} <Text style={{ fontWeight: '700', color: '#4ade80' }}>+{potential.remainingMuscleGainKg}kg</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: '#38bdf8', fontWeight: 'bold' }}>
                    {potential.naturalStatusLabel.split(' ')[0]}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                  {t('ui.home.body_comp_hint') || '※手首・足首サイズを入力すると骨格筋肥大限界モデルが自動診断されます。'}
                </Text>
              </View>
            )}
          </>
        )}
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
  inactiveText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
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
