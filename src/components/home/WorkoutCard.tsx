import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';

import { useAppTheme } from '../../theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { getLastWorkoutSummary, LastWorkoutSummary } from '../../db/database';
import { HomeCard } from './HomeCard';

export const WorkoutCard = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  // Zustand Store
  const isActive = useWorkoutStore(state => state.isActive);
  const workoutTitle = useWorkoutStore(state => state.title);

  // Local State
  const [lastWorkoutSummary, setLastWorkoutSummary] = useState<LastWorkoutSummary | null>(null);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchSummary = async () => {
        try {
          const summary = await getLastWorkoutSummary();
          if (isMounted) {
            setLastWorkoutSummary(summary);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchSummary();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  return (
    <HomeCard
      title={t('ui.home.card_workout') || '筋トレ'}
      iconName="barbell"
      iconColor={colors.primary}
      iconBgColor="rgba(79, 172, 254, 0.15)"
      gamificationFeatureId="workout"
      onPress={() => router.push('/(tabs)')}
    >
      {isActive ? (
        <View
          style={[
            styles.activeWorkoutContainer,
            { borderColor: colors.border },
          ]}
        >
          <View style={styles.statusBadge}>
            <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusBadgeText, { color: colors.success }]}>
              {t('ui.home.status_running') || '実行中'}
            </Text>
          </View>
          <Text style={[styles.workoutActiveTitle, { color: colors.text }]} numberOfLines={1}>
            {workoutTitle || t('ui.home.free_workout_title') || 'フリーワークアウト'}
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            activeOpacity={0.85}
            onPress={() => router.push('/active-workout')}
          >
            <Text style={styles.actionBtnText}>
              {t('ui.home.return_to_training') || 'トレーニングに戻る'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inactiveWorkoutContainer}>
          {lastWorkoutSummary ? (
            <>
              <View style={styles.statRow}>
                <Text style={[styles.statGoal, { color: colors.textMuted }]}>
                  {t('ui.home.recent') || '直近: '} {lastWorkoutSummary.dateStr} ({lastWorkoutSummary.title || '筋トレ'})
                </Text>
              </View>

              {lastWorkoutSummary.muscleVolumes.filter(item => item.volumeKg > 0).length > 0 ? (
                <View style={styles.muscleVolumesWrap}>
                  {lastWorkoutSummary.muscleVolumes
                    .filter(item => item.volumeKg > 0)
                    .map((item, idx) => (
                      <View
                        key={idx}
                        style={[styles.muscleVolumeBadge, { borderColor: colors.border }]}
                      >
                        <Text style={[styles.muscleVolumeText, { color: colors.textMuted }]}>
                          {item.muscle}:{' '}
                          <Text style={[styles.muscleVolumeValue, { color: colors.text }]}>
                            {item.volumeKg.toLocaleString()} kg
                          </Text>
                        </Text>
                      </View>
                    ))}
                </View>
              ) : (
                <Text style={[styles.inactiveText, { color: colors.textMuted }]}>
                  {t('ui.home.no_set_records') || 'セット記録なし'} ({lastWorkoutSummary.totalSets}セット)
                </Text>
              )}

              {Updates.channel !== 'production' && lastWorkoutSummary?.debugInfo && (
                <View style={styles.debugWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsDebugExpanded(prev => !prev)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={styles.debugToggleBtn}
                  >
                    <Ionicons name="bug-outline" size={14} color="#ffb74d" />
                    <Text style={styles.debugToggleText}>
                      {isDebugExpanded
                        ? t('ui.home.debug_close') || 'Debug 閉じる'
                        : t('ui.home.debug') || 'Debug'}
                    </Text>
                  </TouchableOpacity>

                  {isDebugExpanded && (
                    <View style={styles.debugBox}>
                      <Text style={styles.debugBoxText} numberOfLines={6}>
                        [Staging Debug] {lastWorkoutSummary.debugInfo}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <Text style={[styles.inactiveText, { color: colors.textMuted }]}>
              {t('ui.home.no_workout_records') ||
                '過去のワークアウト記録がありません。タップして筋トレを開始しましょう。'}
            </Text>
          )}
        </View>
      )}
    </HomeCard>
  );
};

const styles = StyleSheet.create({
  activeWorkoutContainer: {
    backgroundColor: 'rgba(76, 217, 100, 0.06)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 217, 100, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  workoutActiveTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionBtn: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inactiveWorkoutContainer: {
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statGoal: {
    fontSize: 14,
  },
  inactiveText: {
    fontSize: 14,
    lineHeight: 20,
  },
  muscleVolumesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  muscleVolumeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  muscleVolumeText: {
    fontSize: 12,
  },
  muscleVolumeValue: {
    fontWeight: 'bold',
  },
  debugWrapper: {
    marginTop: 8,
  },
  debugToggleBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 183, 77, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.3)',
  },
  debugToggleText: {
    color: '#ffb74d',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.2)',
  },
  debugBoxText: {
    color: '#ffb74d',
    fontSize: 12,
    lineHeight: 18,
  },
});
