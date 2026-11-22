import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../src/theme';
import { translateExercise } from '../../src/i18n';
import { useGamificationStore } from '../../src/store/gamificationStore';
import {
  MEDAL_RARITY_REWARDS,
  TIER_VISUAL_META,
} from '../../src/constants/gamificationConstants';

interface AchievementsSectionProps {
  workoutId?: number;
  achievements: {
    streakDays: number;
    streakWeeks: number;
    weeklyWorkoutCount: number;
    is1RMUpdated: boolean;
    updated1RMs: { name: string; oldVal: number; newVal: number }[];
    isVolumeUpdated: boolean;
    updatedVolumes: { name: string; oldVal: number; newVal: number }[];
  };
  settings: {
    weightUnit: string;
  };
  t: (key: string, options?: any) => string;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  workoutId,
  achievements,
  settings,
  t,
}) => {
  const { colors } = useAppTheme();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const lastWorkoutGamification = useGamificationStore(
    (state) => state.lastWorkoutGamification
  );
  const workoutGamification =
    lastWorkoutGamification && (!workoutId || lastWorkoutGamification.workoutId === workoutId)
      ? lastWorkoutGamification
      : null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('ui.workout_completion.subtitle')}</Text>
      
      <View style={styles.achievementGrid}>
        {/* P-Points Earned Card removed as per user request */}

        {/* Weekly Workout Count Card */}
        <View style={[styles.achievementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardIconCircle, { backgroundColor: 'rgba(255, 87, 34, 0.15)' }]}>
            <Ionicons name="flame" size={24} color="#ff5722" />
          </View>
          <Text style={[styles.cardValue, { color: colors.text }]}>
            {t('ui.workout_completion.weekly_workout_count', { count: achievements.weeklyWorkoutCount })}
          </Text>
        </View>

        {/* Streak Weeks Card */}
        <View style={[styles.achievementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardIconCircle, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.cardValue, { color: colors.text }]}>
            {t('ui.workout_completion.streak_weeks', { count: achievements.streakWeeks })}
          </Text>
        </View>
      </View>

      {/* XP & Class Progress Card */}
      {workoutGamification && (() => {
        const overallTier = TIER_VISUAL_META[workoutGamification.overallClassAfter.tier];
        const workoutTier = TIER_VISUAL_META[workoutGamification.workoutClassAfter.tier];
        return (
          <View
            style={[
              styles.gamificationCard,
              { backgroundColor: colors.card, borderColor: overallTier.borderColor },
            ]}
          >
            <View style={styles.gamificationHeader}>
              <View style={styles.gamificationTitleRow}>
                <Ionicons
                  name={overallTier.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={overallTier.color}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.gamificationTitle, { color: colors.text }]}>
                  {isEn ? 'Experience & Class' : '獲得経験値 ＆ クラス進捗'}
                </Text>
              </View>
              <View style={styles.xpEarnedPill}>
                <Text style={styles.xpEarnedText}>+{workoutGamification.xpEarned} XP</Text>
              </View>
            </View>

            <View style={styles.classChipsRow}>
              <View
                style={[
                  styles.classChip,
                  { backgroundColor: overallTier.bgColor, borderColor: overallTier.borderColor },
                ]}
              >
                <Text style={[styles.classChipText, { color: overallTier.color }]}>
                  {isEn ? 'Overall' : '総合'}:{' '}
                  {isEn
                    ? workoutGamification.overallClassAfter.nameEn
                    : workoutGamification.overallClassAfter.nameJa}
                </Text>
              </View>
              <View
                style={[
                  styles.classChip,
                  { backgroundColor: workoutTier.bgColor, borderColor: workoutTier.borderColor },
                ]}
              >
                <Text style={[styles.classChipText, { color: workoutTier.color }]}>
                  {isEn ? 'Workout' : '筋トレ'}:{' '}
                  {isEn
                    ? workoutGamification.workoutClassAfter.nameEn
                    : workoutGamification.workoutClassAfter.nameJa}
                </Text>
              </View>
            </View>

            {workoutGamification.newlyUnlockedMedals.length > 0 && (
              <View style={styles.unlockedMedalsWrap}>
                {workoutGamification.newlyUnlockedMedals.map((medal) => {
                  const rarity = MEDAL_RARITY_REWARDS[medal.rarity];
                  return (
                    <View
                      key={medal.id}
                      style={[
                        styles.medalChip,
                        { backgroundColor: rarity.bgColor, borderColor: rarity.color },
                      ]}
                    >
                      <Ionicons
                        name={medal.icon as keyof typeof Ionicons.glyphMap}
                        size={13}
                        color={rarity.color}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.medalChipText, { color: rarity.color }]}>
                        {isEn ? medal.titleEn : medal.titleJa}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })()}

      {/* 1RM Record Card */}
      {achievements.is1RMUpdated && (
        <View style={[styles.achievementCardLong, { backgroundColor: colors.card, borderColor: '#ffd700', borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="star" size={20} color="#ffd700" style={{ marginRight: 8 }} />
            <Text style={[styles.longCardHeader, { color: '#ffd700' }]}>
              {t('ui.workout_completion.rm_updated')}
            </Text>
          </View>
          {achievements.updated1RMs.map((item, idx) => (
            <View key={idx} style={styles.recordDetailRow}>
              <Text style={[styles.recordDetailName, { color: colors.text }]}>{translateExercise(item.name)}</Text>
              <Text style={[styles.recordDetailValue, { color: colors.textMuted }]}>
                {item.oldVal}{settings.weightUnit} → <Text style={{ color: '#ffd700', fontWeight: 'bold' }}>{item.newVal}{settings.weightUnit}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Volume Record Card */}
      {achievements.isVolumeUpdated && (
        <View style={[styles.achievementCardLong, { backgroundColor: colors.card, borderColor: colors.success, borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="trending-up" size={20} color={colors.success} style={{ marginRight: 8 }} />
            <Text style={[styles.longCardHeader, { color: colors.success }]}>
              {t('ui.workout_completion.volume_updated')}
            </Text>
          </View>
          {achievements.updatedVolumes.map((item, idx) => (
            <View key={idx} style={styles.recordDetailRow}>
              <Text style={[styles.recordDetailName, { color: colors.text }]}>{translateExercise(item.name)}</Text>
              <Text style={[styles.recordDetailValue, { color: colors.textMuted }]}>
                {item.oldVal}{settings.weightUnit} → <Text style={{ color: colors.success, fontWeight: 'bold' }}>{item.newVal}{settings.weightUnit}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Encouraging message if no PRs */}
      {!achievements.is1RMUpdated && !achievements.isVolumeUpdated && (
        <View style={[styles.encouragingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.encouragingHeader}>
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.encouragingText, { color: colors.textMuted }]}>
            {t('ui.workout_completion.no_achievements')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  achievementGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  achievementCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  achievementCardLong: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  longCardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  recordDetailName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1.2,
  },
  recordDetailValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  encouragingCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  encouragingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  encouragingText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  gamificationCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    gap: 10,
  },
  gamificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gamificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gamificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  xpEarnedPill: {
    backgroundColor: 'rgba(79, 172, 254, 0.18)',
    borderColor: 'rgba(79, 172, 254, 0.45)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  xpEarnedText: {
    color: '#4facfe',
    fontSize: 13,
    fontWeight: 'bold',
  },
  classChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  classChipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  unlockedMedalsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  medalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  medalChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
