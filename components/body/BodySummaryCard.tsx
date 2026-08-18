import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { BodyCompositionLog } from '../../src/types/bodyComposition';
import { calculateBmi, calculateFfmi, calculateMfRatio, calculateMachoScore } from '../../src/utils/bodyCalculators';

import { useBodyStore } from '../../src/store/bodyStore';

interface BodySummaryCardProps {
  currentLog: BodyCompositionLog | null;
  latestLog: BodyCompositionLog | null;
  isHealthSyncing: boolean;
  onSyncHealthConnect: () => void;
  onOpenEditModal: () => void;
  onOpenGuideModal: () => void;
}

export default function BodySummaryCard({
  currentLog,
  latestLog,
  isHealthSyncing,
  onSyncHealthConnect,
  onOpenEditModal,
  onOpenGuideModal,
}: BodySummaryCardProps) {
  const savedMeasurements = useBodyStore((state) => state.savedMeasurements);

  // 表示用データの解決（currentLog優先、なければsavedMeasurements/latestLogの身長などを使用）
  const weight = currentLog?.weight ?? null;
  const bodyFatRate = currentLog?.body_fat_rate ?? null;
  const muscleMass = currentLog?.muscle_mass ?? null;
  const height = currentLog?.height ?? savedMeasurements.height ?? latestLog?.height ?? null;

  // LBM（除脂肪体重）の算出
  const lbm =
    currentLog?.lbm ??
    (weight && bodyFatRate ? Number((weight * (1 - bodyFatRate / 100)).toFixed(1)) : null);

  // BMIの算出
  const bmi = weight && height ? calculateBmi(weight, height) : null;

  // FFMIの算出
  const ffmiResult = lbm && height ? calculateFfmi(lbm, height) : null;

  // MF比（筋肉・脂肪比）の算出
  const mfResult =
    muscleMass !== null && weight !== null && bodyFatRate !== null
      ? calculateMfRatio(muscleMass, weight, bodyFatRate)
      : null;

  // マッチョスコア（MS）の算出
  const machoResult =
    weight !== null && bodyFatRate !== null && height !== null
      ? calculateMachoScore(weight, bodyFatRate, height)
      : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBg, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <Ionicons name="body" size={22} color="#38bdf8" />
          </View>
          <View>
            <Text style={styles.cardTitle}>今日の体組成</Text>
            <Text style={styles.cardSubtitle}>
              {currentLog?.source === 'health_connect'
                ? 'Health Connect から同期済み'
                : currentLog?.source === 'navy_calc'
                ? '米海軍式より算出'
                : currentLog
                ? '手動記録'
                : '未記録'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.guideBtn} onPress={onOpenGuideModal} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={20} color={Theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Main Stats Grid */}
      <View style={styles.grid}>
        {/* 体重 */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>体重</Text>
          <View style={styles.valueRow}>
            <Text style={styles.statValue}>{weight !== null ? weight.toFixed(1) : '--'}</Text>
            <Text style={styles.statUnit}>kg</Text>
          </View>
        </View>

        {/* 体脂肪率 */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>体脂肪率</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.statValue, { color: '#fb923c' }]}>
              {bodyFatRate !== null ? bodyFatRate.toFixed(1) : '--'}
            </Text>
            <Text style={styles.statUnit}>%</Text>
          </View>
        </View>

        {/* 除脂肪体重 (LBM) */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>除脂肪体重 (LBM)</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.statValue, { color: '#38bdf8' }]}>
              {lbm !== null ? lbm.toFixed(1) : '--'}
            </Text>
            <Text style={styles.statUnit}>kg</Text>
          </View>
        </View>

        {/* 骨格筋量 / 筋肉量 */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>骨格筋量</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.statValue, { color: '#4ade80' }]}>
              {muscleMass !== null ? muscleMass.toFixed(1) : '--'}
            </Text>
            <Text style={styles.statUnit}>kg</Text>
          </View>
        </View>

        {/* BMI */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>BMI</Text>
          <View style={styles.valueRow}>
            <Text style={styles.statValueSmall}>{bmi !== null ? bmi.toFixed(1) : '--'}</Text>
            {height && <Text style={styles.heightHint}>({height}cm)</Text>}
          </View>
        </View>

        {/* FFMI */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>FFMI (除脂肪量指数)</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.statValueSmall, { color: '#a78bfa' }]}>
              {ffmiResult ? ffmiResult.normalizedFfmi.toFixed(1) : '--'}
            </Text>
            <Text style={styles.statUnit}>pt</Text>
          </View>
        </View>

        {/* 筋肉・脂肪比 (MF比) */}
        <View style={styles.statBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.statLabel}>MF比 (筋/脂比)</Text>
            {mfResult && mfResult.mfRatio >= 7.0 && (
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{mfResult.mfRatio >= 7.5 ? '維持' : '腹筋'}</Text>
              </View>
            )}
          </View>
          <View style={styles.valueRow}>
            <Text
              style={[
                styles.statValueSmall,
                { color: mfResult && mfResult.mfRatio >= 7.0 ? '#2dd4bf' : Theme.colors.text },
              ]}
            >
              {mfResult ? mfResult.mfRatio.toFixed(2) : '--'}
            </Text>
            <Text style={styles.statUnit}>比</Text>
            {mfResult && (
              <Text style={styles.ratioDetail}>({mfResult.categoryLabel.split(' ')[0]})</Text>
            )}
          </View>
        </View>

        {/* マッチョ評価スコア (MS) */}
        <View style={styles.statBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.statLabel}>マッチョスコア (MS)</Text>
            {machoResult?.is20Achieved && (
              <View style={[styles.badgeWrap, { backgroundColor: 'rgba(232, 121, 249, 0.2)' }]}>
                <Text style={[styles.badgeText, { color: '#e879f9' }]}>20突破</Text>
              </View>
            )}
          </View>
          <View style={styles.valueRow}>
            <Text
              style={[
                styles.statValueSmall,
                { color: machoResult?.is20Achieved ? '#e879f9' : '#f43f5e' },
              ]}
            >
              {machoResult ? machoResult.score.toFixed(1) : '--'}
            </Text>
            <Text style={styles.statUnit}>pt</Text>
            {machoResult && (
              <Text style={styles.bonusHint}>
                ({machoResult.fatBonus >= 0 ? `+${machoResult.fatBonus.toFixed(1)}` : machoResult.fatBonus.toFixed(1)})
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={onSyncHealthConnect}
          disabled={isHealthSyncing}
          activeOpacity={0.7}
        >
          {isHealthSyncing ? (
            <ActivityIndicator size="small" color="#38bdf8" style={{ marginRight: 6 }} />
          ) : (
            <Ionicons name="refresh" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.syncBtnText}>
            {isHealthSyncing ? '取得中...' : 'Health Connect から取得'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editBtn} onPress={onOpenEditModal} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.editBtnText}>{currentLog ? '編集' : '記録'}</Text>
        </TouchableOpacity>
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
  guideBtn: {
    padding: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  statValueSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  statUnit: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  heightHint: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginLeft: 2,
  },
  badgeWrap: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2dd4bf',
  },
  ratioDetail: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    marginLeft: 2,
  },
  bonusHint: {
    fontSize: 10,
    color: '#e879f9',
    marginLeft: 2,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  syncBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
