import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { translateExercise } from '../../src/i18n';

interface AchievementsSectionProps {
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
    aiTokensBalance: number;
  };
  maxTokens: number;
  aiComment: string | null;
  loadingAI: boolean;
  onAskAICoach: () => void;
  t: (key: string, options?: any) => string;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements,
  settings,
  maxTokens,
  aiComment,
  loadingAI,
  onAskAICoach,
  t,
}) => {
  const { colors } = useAppTheme();

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
            {!aiComment && !loadingAI && (
              <TouchableOpacity
                style={styles.aiAskButton}
                onPress={onAskAICoach}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.aiAskButtonText, { color: colors.primary }]}>
                  {t('ui.workout_completion.ask_ai_coach', { balance: settings.aiTokensBalance, max: maxTokens })}
                </Text>
              </TouchableOpacity>
            )}
            {loadingAI && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
            )}
          </View>
          <Text style={[styles.encouragingText, { color: colors.textMuted }]}>
            {aiComment ?? t('ui.workout_completion.no_achievements')}
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
  aiAskButton: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderRadius: 12,
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  aiAskButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  encouragingText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
