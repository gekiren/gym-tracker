import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { calculateShareStats } from '../../src/services/shareService';
import { translateExercise } from '../../src/i18n';
import { Theme } from '../../src/theme';

const APP_ICON = require('../../assets/images/icon.png');

interface ShareCardViewProps {
  workout: any;
  settings: {
    weightUnit: 'kg' | 'lbs';
    bodyWeight: number | null;
  };
  pattern: 'A' | 'B' | 'C';
}

export function ShareCardView({ workout, settings, pattern }: ShareCardViewProps) {
  const stats = calculateShareStats(workout, settings);
  const dateStr = new Date(workout.end_time || Date.now()).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const formattedVolume = stats.totalVolume.toLocaleString();

  const getExerciseSummary = () => {
    return workout.exercises.map((ex: any) => {
      const completedSets = ex.sets.filter((s: any) => !!s.is_completed);
      let max1RM = 0;
      completedSets.forEach((s: any) => {
        if (s.weight && s.reps) {
          const rm = s.reps === 1 ? s.weight : s.weight * (1 + (s.reps / 30));
          if (rm > max1RM) max1RM = rm;
        }
      });
      return {
        name: ex.name,
        setsCount: completedSets.length,
        max1RM: Math.round(max1RM),
        setsDetail: completedSets.map((s: any) => `${s.weight ?? 0}${stats.weightUnit}x${s.reps ?? 0}`).join(' / '),
      };
    }).filter((ex: any) => ex.setsCount > 0);
  };

  const exerciseSummaries = getExerciseSummary();

  return (
    <View style={[styles.cardCanvas, { backgroundColor: '#0F172A' }]}>
      <View style={styles.cardInner}>
        {/* Top Header */}
        <View>
          <View style={styles.cardHeaderBadge} />
          <Text style={styles.cardHeaderTitle}>
            {pattern === 'B' ? 'WORKOUT SUMMARY' : 'WORKOUT COMPLETED'}
          </Text>
          <Text style={styles.cardHeaderDate}>{dateStr}</Text>
          <Text style={styles.cardWorkoutTitle} numberOfLines={1}>{workout.title}</Text>
        </View>

        {/* Main Content Area */}
        <View style={styles.cardMainContent}>
          {pattern === 'A' && (
            <View style={{ flex: 1, justifyContent: 'center', gap: 30 }}>
              {/* Volume */}
              <View>
                <Text style={styles.cardLabel}>TOTAL VOLUME</Text>
                <Text style={styles.cardVolumeValue}>
                  {formattedVolume} <Text style={{ fontSize: 40 }}>{stats.weightUnit}</Text>
                </Text>
              </View>

              {/* Fun conversions */}
              <View style={styles.funCardsContainer}>
                <View style={styles.funCard}>
                  <Text style={styles.funCardEmoji}>🚗</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.funCardTitle}>軽自動車約 {stats.carCount} 台分！</Text>
                    <Text style={styles.funCardSub}>総ボリュームを車の重量（約800kg）に換算</Text>
                  </View>
                </View>

                {stats.totalVolumeKg >= 6000 ? (
                  <View style={styles.funCard}>
                    <Text style={styles.funCardEmoji}>🐘</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.funCardTitle}>アフリカゾウ約 {stats.elephantCount} 頭分！</Text>
                      <Text style={styles.funCardSub}>総ボリュームをゾウの重量（約6,000kg）に換算</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.funCard}>
                    <Text style={styles.funCardEmoji}>🚌</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.funCardTitle}>大型路線バス約 {stats.busCount} 台分！</Text>
                      <Text style={styles.funCardSub}>総ボリュームをバスの重量（約10,000kg）に換算</Text>
                    </View>
                  </View>
                )}

                {stats.calories > 0 && (
                  <View style={styles.funCard}>
                    <Text style={styles.funCardEmoji}>🍙</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.funCardTitle}>おにぎり約 {stats.onigiriCount} 個分 / ビール {stats.beerCount} 杯分</Text>
                      <Text style={styles.funCardSub}>消費エネルギー（{stats.calories} kcal）の食べ物換算</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {pattern === 'B' && (
            <View style={{ flex: 1, gap: 24, justifyContent: 'center' }}>
              <Text style={styles.cardLabel}>COMPLETED EXERCISES</Text>
              <View style={{ gap: 20 }}>
                {exerciseSummaries.slice(0, 6).map((ex: any, idx: number) => (
                  <View key={idx} style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Text style={styles.detailExerciseName} numberOfLines={1}>{translateExercise(ex.name)}</Text>
                      <Text style={styles.detailSetsCount}>{ex.setsCount} sets</Text>
                    </View>
                    <Text style={styles.detailSetsDetail} numberOfLines={1}>{ex.setsDetail}</Text>
                  </View>
                ))}
                {exerciseSummaries.length > 6 && (
                  <Text style={styles.plusMoreText}>+ 他 {exerciseSummaries.length - 6} 種目実施</Text>
                )}
              </View>
            </View>
          )}

          {pattern === 'C' && (
            <View style={{ flex: 1, justifyContent: 'center', gap: 30 }}>
              {/* Top - Mini Volume & Fun */}
              <View style={{ gap: 10 }}>
                <Text style={styles.cardLabel}>TOTAL VOLUME</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 24 }}>
                  <Text style={[styles.cardVolumeValue, { fontSize: 72, lineHeight: 76 }]}>
                    {formattedVolume} <Text style={{ fontSize: 32 }}>{stats.weightUnit}</Text>
                  </Text>
                  <Text style={styles.hybridFunText}>🚗 軽自動車約 {stats.carCount} 台分！</Text>
                </View>
              </View>

              {/* Bottom - Simplified Exercise List */}
              <View style={{ gap: 16 }}>
                <Text style={styles.cardLabel}>EXERCISE SUMMARY</Text>
                <View style={{ gap: 12 }}>
                  {exerciseSummaries.slice(0, 5).map((ex: any, idx: number) => (
                    <View key={idx} style={styles.hybridRow}>
                      <Text style={styles.hybridExerciseName} numberOfLines={1}>{translateExercise(ex.name)}</Text>
                      <Text style={styles.hybridStats}>
                        {ex.setsCount} sets  |  Max 1RM: <Text style={{ color: Theme.colors.primary, fontWeight: 'bold' }}>{ex.max1RM}{stats.weightUnit}</Text>
                      </Text>
                    </View>
                  ))}
                  {exerciseSummaries.length > 5 && (
                    <Text style={[styles.plusMoreText, { marginTop: 0 }]}>+ 他 {exerciseSummaries.length - 5} 種目実施</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterQuote}>POWERED BY TRENOTE</Text>
          <View style={styles.cardBranding}>
            <Image source={APP_ICON} style={styles.cardBrandingIcon} />
            <View>
              <Text style={styles.cardBrandingName}>TreNote</Text>
              <Text style={styles.cardBrandingSub}>Workout Tracker</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Share Card Canvas Styles
  cardCanvas: {
    width: 1080,
    height: 1080,
    position: 'relative',
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    padding: 60,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  cardHeaderBadge: {
    width: 80,
    height: 6,
    backgroundColor: Theme.colors.primary,
    borderRadius: 3,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Theme.colors.primary,
    letterSpacing: 2,
  },
  cardHeaderDate: {
    fontSize: 20,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  cardWorkoutTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  cardVolumeValue: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 100,
  },
  funCardsContainer: {
    gap: 20,
  },
  funCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  funCardEmoji: {
    fontSize: 40,
  },
  funCardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  funCardSub: {
    fontSize: 20,
    color: '#94A3B8',
    marginTop: 4,
  },
  cardMainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  detailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  detailCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailExerciseName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  detailSetsCount: {
    fontSize: 22,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  detailSetsDetail: {
    fontSize: 24,
    color: '#94A3B8',
  },
  plusMoreText: {
    fontSize: 24,
    color: '#64748B',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  hybridFunText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#E2E8F0',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  hybridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  hybridExerciseName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  hybridStats: {
    fontSize: 24,
    color: '#94A3B8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 28,
  },
  cardFooterQuote: {
    fontSize: 22,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 3,
  },
  cardBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardBrandingIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  cardBrandingName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardBrandingSub: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
});
