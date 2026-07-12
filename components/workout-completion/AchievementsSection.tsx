import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
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
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('ui.workout_completion.subtitle')}</Text>
      
      <View style={styles.achievementGrid}>
        {/* Weekly Workout Count Card */}
        <View style={styles.achievementCard}>
          <View style={[styles.cardIconCircle, { backgroundColor: 'rgba(255, 87, 34, 0.15)' }]}>
            <Ionicons name="flame" size={24} color="#ff5722" />
          </View>
          <Text style={styles.cardValue}>
            {t('ui.workout_completion.weekly_workout_count', { count: achievements.weeklyWorkoutCount })}
          </Text>
        </View>

        {/* Streak Weeks Card */}
        <View style={styles.achievementCard}>
          <View style={[styles.cardIconCircle, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
            <Ionicons name="calendar" size={24} color={Theme.colors.primary} />
          </View>
          <Text style={styles.cardValue}>
            {t('ui.workout_completion.streak_weeks', { count: achievements.streakWeeks })}
          </Text>
        </View>
      </View>

      {/* 1RM Record Card */}
      {achievements.is1RMUpdated && (
        <View style={[styles.achievementCardLong, { borderColor: '#ffd700', borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="star" size={20} color="#ffd700" style={{ marginRight: 8 }} />
            <Text style={[styles.longCardHeader, { color: '#ffd700' }]}>
              {t('ui.workout_completion.rm_updated')}
            </Text>
          </View>
          {achievements.updated1RMs.map((item, idx) => (
            <View key={idx} style={styles.recordDetailRow}>
              <Text style={styles.recordDetailName}>{translateExercise(item.name)}</Text>
              <Text style={styles.recordDetailValue}>
                {item.oldVal}{settings.weightUnit} → <Text style={{ color: '#ffd700', fontWeight: 'bold' }}>{item.newVal}{settings.weightUnit}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Volume Record Card */}
      {achievements.isVolumeUpdated && (
        <View style={[styles.achievementCardLong, { borderColor: Theme.colors.success, borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="trending-up" size={20} color={Theme.colors.success} style={{ marginRight: 8 }} />
            <Text style={[styles.longCardHeader, { color: Theme.colors.success }]}>
              {t('ui.workout_completion.volume_updated')}
            </Text>
          </View>
          {achievements.updatedVolumes.map((item, idx) => (
            <View key={idx} style={styles.recordDetailRow}>
              <Text style={styles.recordDetailName}>{translateExercise(item.name)}</Text>
              <Text style={styles.recordDetailValue}>
                {item.oldVal}{settings.weightUnit} → <Text style={{ color: Theme.colors.success, fontWeight: 'bold' }}>{item.newVal}{settings.weightUnit}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Encouraging message if no PRs */}
      {!achievements.is1RMUpdated && !achievements.isVolumeUpdated && (
        <View style={styles.encouragingCard}>
          <View style={styles.encouragingHeader}>
            <Ionicons name="sparkles-outline" size={22} color={Theme.colors.primary} />
            {!aiComment && !loadingAI && (
              <TouchableOpacity style={styles.aiAskButton} onPress={onAskAICoach}>
                <Text style={styles.aiAskButtonText}>
                  {t('ui.workout_completion.ask_ai_coach', { balance: settings.aiTokensBalance, max: maxTokens })}
                </Text>
              </TouchableOpacity>
            )}
            {loadingAI && (
              <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginLeft: 8 }} />
            )}
          </View>
          <Text style={styles.encouragingText}>
            {aiComment ?? t('ui.workout_completion.no_achievements')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    color: Theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.md,
    letterSpacing: 0.5,
  },
  achievementGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  achievementCard: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
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
    color: '#fff',
    textAlign: 'center',
  },
  achievementCardLong: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1.2,
  },
  recordDetailValue: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  encouragingCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  encouragingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiAskButton: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  aiAskButtonText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  encouragingText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
