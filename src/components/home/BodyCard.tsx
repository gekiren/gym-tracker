import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '../../theme';
import { useBodyStore } from '../../store/bodyStore';
import { analyzeMusclePotential } from '../../utils/bodyCalculators';
import { HomeCard } from './HomeCard';

export const BodyCard = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

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
  const potential =
    weight && bodyFatRate && height && wrist && ankle
      ? analyzeMusclePotential(weight, bodyFatRate, height, wrist, ankle)
      : null;

  return (
    <HomeCard
      title={t('ui.home.card_body_composition') || '体組成・筋肥大限界'}
      iconName="body"
      iconColor="#38bdf8"
      iconBgColor="rgba(56, 189, 248, 0.15)"
      gamificationFeatureId="body"
      onPress={() => router.push('/lifelog/body')}
    >
      {!weight && !bodyFatRate ? (
        <Text style={[styles.inactiveText, { color: colors.textMuted }]}>
          {t('ui.home.body_comp_empty') ||
            '体組成データが未記録です。タップして体重・体脂肪率・骨格限界モデルを診断しましょう。'}
        </Text>
      ) : (
        <>
          <View style={styles.statRow}>
            <Text style={[styles.statVal, { color: colors.text }]}>
              {weight !== null ? weight.toFixed(1) : '--'}{' '}
              <Text style={[styles.statUnit, { color: colors.textMuted }]}>kg</Text>
            </Text>
            <Text style={[styles.statGoal, { color: colors.textMuted }]}>
              / {t('ui.home.body_fat_rate') || '体脂肪率 '}{' '}
              {bodyFatRate !== null ? `${bodyFatRate.toFixed(1)}%` : '--'}
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
                        backgroundColor: '#38bdf8',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressPercent, { color: colors.text }]}>
                  {potential.reachPercentage}%
                </Text>
              </View>
              <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  {t('ui.home.limit_lbm') || '限界除脂肪: '}{' '}
                  <Text style={styles.metricLimitVal}>{potential.maxLbm}kg</Text>
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  {t('ui.home.gainable') || '増量可能: '}{' '}
                  <Text style={styles.metricGainVal}>+{potential.remainingMuscleGainKg}kg</Text>
                </Text>
                <Text style={styles.metricStatusVal}>
                  {potential.naturalStatusLabel.split(' ')[0]}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.hintRow}>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                {t('ui.home.body_comp_hint') ||
                  '※手首・足首サイズを入力すると骨格筋肥大限界モデルが自動診断されます。'}
              </Text>
            </View>
          )}
        </>
      )}
    </HomeCard>
  );
};

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
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
  inactiveText: {
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
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricLimitVal: {
    fontWeight: '700',
    color: '#a78bfa',
  },
  metricGainVal: {
    fontWeight: '700',
    color: '#4ade80',
  },
  metricStatusVal: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  hintRow: {
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
