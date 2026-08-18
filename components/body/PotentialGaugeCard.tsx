import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { BodyCompositionLog } from '../../src/types/bodyComposition';
import { analyzeMusclePotential } from '../../src/utils/bodyCalculators';

import { useBodyStore } from '../../src/store/bodyStore';

interface PotentialGaugeCardProps {
  currentLog: BodyCompositionLog | null;
  latestLog: BodyCompositionLog | null;
}

export default function PotentialGaugeCard({
  currentLog,
  latestLog,
}: PotentialGaugeCardProps) {
  const savedMeasurements = useBodyStore((state) => state.savedMeasurements);

  const weight = currentLog?.weight ?? latestLog?.weight ?? null;
  const bodyFatRate = currentLog?.body_fat_rate ?? latestLog?.body_fat_rate ?? null;
  const height = currentLog?.height ?? savedMeasurements.height ?? latestLog?.height ?? null;
  const wrist = currentLog?.wrist ?? savedMeasurements.wrist ?? latestLog?.wrist ?? null;
  const ankle = currentLog?.ankle ?? savedMeasurements.ankle ?? latestLog?.ankle ?? null;

  const analysis =
    weight && bodyFatRate && height && wrist && ankle
      ? analyzeMusclePotential(weight, bodyFatRate, height, wrist, ankle)
      : null;

  if (!analysis) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
              <Ionicons name="speedometer" size={22} color="#4ade80" />
            </View>
            <View>
              <Text style={styles.cardTitle}>限界到達度 ＆ ポテンシャル診断</Text>
              <Text style={styles.cardSubtitle}>Muscle Potential Analysis</Text>
            </View>
          </View>
        </View>

        <View style={styles.emptyBox}>
          <Ionicons name="analytics-outline" size={24} color={Theme.colors.textMuted} style={{ marginBottom: 6 }} />
          <Text style={styles.emptyText}>
            体重・体脂肪率、および手首・足首サイズが記録されると、骨格限界に対する到達率と残存ポテンシャルが診断されます。
          </Text>
        </View>
      </View>
    );
  }

  // プログレスバーのカラー判定
  const getProgressColor = (pct: number) => {
    if (pct < 75) return '#38bdf8';
    if (pct < 88) return '#4ade80';
    if (pct < 95) return '#fbbf24';
    if (pct <= 100) return '#f97316';
    return '#ec4899';
  };

  const progressColor = getProgressColor(analysis.reachPercentage);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBg, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
            <Ionicons name="speedometer" size={22} color="#4ade80" />
          </View>
          <View>
            <Text style={styles.cardTitle}>限界到達度 ＆ ポテンシャル診断</Text>
            <Text style={styles.cardSubtitle}>Muscle Potential Analysis</Text>
          </View>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.gaugeSection}>
        <View style={styles.gaugeHeader}>
          <View>
            <Text style={styles.gaugeLabel}>骨格筋限界への到達率</Text>
            <Text style={styles.gaugeSubHint}>※ケーシー・バット骨格限界(100%)モデル基準</Text>
          </View>
          <View style={styles.reachWrap}>
            <Text style={[styles.reachValue, { color: progressColor }]}>
              {analysis.reachPercentage.toFixed(1)}
            </Text>
            <Text style={[styles.reachUnit, { color: progressColor }]}>%</Text>
          </View>
        </View>
      </View>

      {/* Key Numbers Grid */}
      <View style={styles.numbersGrid}>
        <View style={styles.numberBox}>
          <Text style={styles.numberLabel}>現在の除脂肪 (LBM)</Text>
          <Text style={styles.numberValue}>{analysis.currentLbm.toFixed(1)} <Text style={styles.numberUnit}>kg</Text></Text>
        </View>
        <View style={styles.numberBox}>
          <Text style={styles.numberLabel}>最大限界除脂肪 (LBM)</Text>
          <Text style={[styles.numberValue, { color: '#a78bfa' }]}>{analysis.maxLbm.toFixed(1)} <Text style={styles.numberUnit}>kg</Text></Text>
        </View>
        <View style={styles.numberBox}>
          <Text style={styles.numberLabel}>残存増量ポテンシャル</Text>
          <Text style={[styles.numberValue, { color: '#4ade80' }]}>+ {analysis.remainingMuscleGainKg.toFixed(1)} <Text style={styles.numberUnit}>kg</Text></Text>
        </View>
        <View style={styles.numberBox}>
          <Text style={styles.numberLabel}>現在のFFMI</Text>
          <Text style={styles.numberValue}>{analysis.currentFfmi.toFixed(1)} <Text style={styles.numberUnit}>pt</Text></Text>
        </View>
      </View>

      {/* Status & Advice Box */}
      <View style={styles.adviceBox}>
        <View style={styles.statusBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#4ade80" style={{ marginRight: 6 }} />
          <Text style={styles.statusBadgeText}>{analysis.naturalStatusLabel}</Text>
        </View>
        <Text style={styles.adviceText}>{analysis.advice}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  gaugeSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    marginBottom: 14,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeLabel: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  gaugeSubHint: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    marginTop: 2,
    opacity: 0.8,
  },
  reachWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  reachValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  reachUnit: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  numberBox: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  numberLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginBottom: 2,
  },
  numberValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  numberUnit: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontWeight: 'normal',
  },
  adviceBox: {
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  adviceText: {
    fontSize: 12,
    color: Theme.colors.text,
    lineHeight: 18,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
