import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
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
  onOpenMdImportModal?: () => void;
}

export default function BodySummaryCard({
  currentLog,
  latestLog,
  isHealthSyncing,
  onSyncHealthConnect,
  onOpenEditModal,
  onOpenGuideModal,
  onOpenMdImportModal,
}: BodySummaryCardProps) {
  const { colors, spacing, borderRadius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, borderRadius), [colors, spacing, borderRadius]);
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
                : currentLog?.source === 'ai_agent'
                ? 'AI同期（Googleドライブ）'
                : currentLog
                ? '手動記録'
                : '未記録'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.guideBtn}
          onPress={onOpenGuideModal}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
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
                { color: mfResult && mfResult.mfRatio >= 7.0 ? '#2dd4bf' : colors.text },
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
            {machoResult && machoResult.score >= 20.0 && (
              <View style={[styles.badgeWrap, { backgroundColor: machoResult.score >= 23.0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(232, 121, 249, 0.2)' }]}>
                <Text style={[styles.badgeText, { color: machoResult.score >= 23.0 ? '#f43f5e' : '#e879f9' }]}>
                  {machoResult.score >= 24.5 ? '超人' : machoResult.score >= 23.0 ? 'マッチョ' : machoResult.score >= 21.5 ? '筋肉質' : '細マッチョ'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.valueRow}>
            <Text
              style={[
                styles.statValueSmall,
                { color: machoResult && machoResult.score >= 21.5 ? '#f43f5e' : machoResult && machoResult.score >= 20.0 ? '#e879f9' : colors.text },
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
            {isHealthSyncing ? '取得中...' : 'Health Connect'}
          </Text>
        </TouchableOpacity>

        {onOpenMdImportModal && (
          <TouchableOpacity
            style={styles.mdImportBtn}
            onPress={onOpenMdImportModal}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={16} color="#38bdf8" style={{ marginRight: 4 }} />
            <Text style={styles.mdImportBtnText}>MD取込</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.editBtn} onPress={onOpenEditModal} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.editBtnText}>{currentLog ? '編集' : '記録'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  spacing: ReturnType<typeof useAppTheme>['spacing'],
  borderRadius: ReturnType<typeof useAppTheme>['borderRadius']
) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  guideBtn: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  statValueSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statUnit: {
    fontSize: 12,
    color: colors.textMuted,
  },
  heightHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 2,
  },
  badgeWrap: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2dd4bf',
  },
  ratioDetail: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 2,
  },
  bonusHint: {
    fontSize: 12,
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  syncBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  mdImportBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  mdImportBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  editBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
