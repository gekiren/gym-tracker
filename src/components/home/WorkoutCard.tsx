import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';

import { Theme } from '../../theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { getLastWorkoutSummary, LastWorkoutSummary } from '../../db/database';

export const WorkoutCard = () => {
  const { t } = useTranslation();
  
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
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.85} 
      onPress={() => router.push('/(tabs)')}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
          <Ionicons name="barbell" size={24} color={Theme.colors.primary} />
        </View>
        <Text style={styles.cardTitle}>{t('ui.home.card_workout') || '筋トレ'}</Text>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
      </View>

      <View style={styles.cardBody}>
        {isActive ? (
          <View style={styles.activeWorkoutContainer}>
            <View style={styles.statusBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.statusBadgeText}>{t('ui.home.status_running') || '実行中'}</Text>
            </View>
            <Text style={styles.workoutActiveTitle} numberOfLines={1}>
              {workoutTitle || t('ui.home.free_workout_title') || 'フリーワークアウト'}
            </Text>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: Theme.colors.success }]}
              onPress={() => router.push('/active-workout')}
            >
              <Text style={styles.actionBtnText}>{t('ui.home.return_to_training') || 'トレーニングに戻る'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inactiveWorkoutContainer}>
            {lastWorkoutSummary ? (
              <>
                <View style={[styles.statRow, { marginBottom: 2 }]}>
                  <Text style={[styles.statGoal, { color: Theme.colors.textMuted, fontSize: 14 }]}>
                    {t('ui.home.recent') || '直近: '} <Text style={{ color: Theme.colors.textMuted, fontSize: 14 }}>{lastWorkoutSummary.dateStr}</Text> ({lastWorkoutSummary.title || '筋トレ'})
                  </Text>
                </View>

                {lastWorkoutSummary.muscleVolumes.filter(item => item.volumeKg > 0).length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                    {lastWorkoutSummary.muscleVolumes.filter(item => item.volumeKg > 0).map((item, idx) => (
                      <View key={idx} style={styles.muscleVolumeBadge}>
                        <Text style={styles.muscleVolumeText}>
                          {item.muscle}: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.volumeKg.toLocaleString()} kg</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.inactiveText}>{t('ui.home.no_set_records') || 'セット記録なし'} ({lastWorkoutSummary.totalSets}セット)</Text>
                )}

                {Updates.channel !== 'production' && lastWorkoutSummary?.debugInfo && (
                  <View style={{ marginTop: 8 }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setIsDebugExpanded(prev => !prev)}
                      style={{
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        backgroundColor: 'rgba(255, 183, 77, 0.12)',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 183, 77, 0.3)',
                      }}
                    >
                      <Ionicons name="bug-outline" size={12} color="#ffb74d" />
                      <Text style={{ color: '#ffb74d', fontSize: 10, fontWeight: 'bold' }}>
                        {isDebugExpanded ? (t('ui.home.debug_close') || 'Debug 閉じる') : (t('ui.home.debug') || 'Debug')}
                      </Text>
                    </TouchableOpacity>

                    {isDebugExpanded && (
                      <View style={{ marginTop: 6, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,183,77,0.2)' }}>
                        <Text style={{ color: '#ffb74d', fontSize: 10 }} numberOfLines={6}>
                          🔍 [Staging Debug] {lastWorkoutSummary.debugInfo}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.inactiveText}>{t('ui.home.no_workout_records') || '過去のワークアウト記録がありません。タップして筋トレを開始しましょう。'}</Text>
            )}
          </View>
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
  activeWorkoutContainer: {
    backgroundColor: 'rgba(79, 172, 254, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.2)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primary,
    marginRight: 6,
  },
  statusBadgeText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  workoutActiveTitle: {
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
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
    color: Theme.colors.text,
    fontSize: 14,
  },
  inactiveText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  muscleVolumeBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  muscleVolumeText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
  },
});
