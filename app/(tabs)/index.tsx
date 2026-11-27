import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { getRoutines, getPreviousWorkoutSets, getPersonalRecords, getExerciseMax1RM } from '../../src/db/database';
import { translateExercise } from '../../src/i18n';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFeatureSwipe } from '../../src/hooks/useFeatureSwipe';
import { OnboardingModals } from '../../components/OnboardingModals';
import { FeatureClassBar } from '../../components/FeatureClassBar';

export default function WorkoutHomeScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const startWorkout = useWorkoutStore(state => state.startWorkout);
  const endWorkout = useWorkoutStore(state => state.endWorkout);
  const addExercise = useWorkoutStore(state => state.addExercise);
  const alwaysOneSet = useSettingsStore(state => state.settings.alwaysOneSet);
  const isActive = useWorkoutStore(state => state.isActive);
  const title = useWorkoutStore(state => state.title);
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Configure navigation header dynamics (Dashboard Back Button)
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.navigate('/');
            }
          }}
          style={styles.headerBackBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors]);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const fetchRoutines = async () => {
    try {
      const data = await getRoutines();
      setRoutines(data);
    } catch (e) {
      console.error('Failed to fetch routines', e);
    }
  };

  const handleStartEmpty = () => {
    const proceedWithEmpty = () => {
      if (isActive) {
        endWorkout();
      }
      startWorkout(t('ui.home.free_workout_title'));
      router.push('/active-workout');
    };

    if (isActive) {
      Alert.alert(
        t('ui.routines.confirm_start_during_workout_title'),
        t('ui.routines.confirm_start_during_workout_message'),
        [
          { text: t('ui.common.cancel'), style: 'cancel' },
          {
            text: t('ui.common.ok'),
            style: 'destructive',
            onPress: proceedWithEmpty,
          },
        ]
      );
    } else {
      proceedWithEmpty();
    }
  };

  const handleStartRoutine = async (routine: any) => {
    if (isLoading) return;

    const proceedWithRoutine = async () => {
      setIsLoading(true);
      try {
        if (isActive) {
          endWorkout();
        }
        startWorkout(routine.title);
        for (const ex of routine.exercises) {
          const [prevSets, personalRecords, max1RM] = await Promise.all([
            getPreviousWorkoutSets(ex.id),
            getPersonalRecords(ex.id),
            getExerciseMax1RM(ex.id),
          ]);
          addExercise({
            id: ex.id,
            name: ex.name,
            previousSets: prevSets,
            personalRecords,
            equipment: ex.equipment,
            muscle_group: ex.muscle_group,
            is_unilateral: ex.is_unilateral,
            default_variation: ex.default_variation,
            default_stance: ex.default_stance,
            weight_step: ex.weight_step,
            rest_seconds: ex.rest_seconds,
            max_1rm: max1RM,
            warmup_threshold_percent: ex.warmup_threshold_percent ?? null,
            routineSets: ex.sets,
          }, alwaysOneSet);
        }
        router.push('/active-workout');
      } catch (e) {
        console.error('Failed to start routine', e);
      } finally {
        setIsLoading(false);
      }
    };

    if (isActive) {
      Alert.alert(
        t('ui.routines.confirm_start_during_workout_title'),
        t('ui.routines.confirm_start_during_workout_message'),
        [
          { text: t('ui.common.cancel'), style: 'cancel' },
          {
            text: t('ui.common.ok'),
            style: 'destructive',
            onPress: proceedWithRoutine,
          },
        ]
      );
    } else {
      await proceedWithRoutine();
    }
  };

  const { panHandlerProps } = useFeatureSwipe('/(tabs)');

  return (
    <PanGestureHandler {...panHandlerProps}>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <FeatureClassBar featureId="workout" />
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
        >
          {isActive ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.success }]}
              activeOpacity={0.85}
              onPress={() => router.push('/active-workout')}
            >
              <View style={styles.primaryButtonRow}>
                <Ionicons name="play" size={22} color="#ffffff" />
                <Text style={styles.primaryButtonText}>{t('ui.home.return_to_active')}</Text>
              </View>
              {!!title && (
                <Text style={styles.primaryButtonSubtext} numberOfLines={1}>
                  {title}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={handleStartEmpty}
            >
              <View style={styles.primaryButtonRow}>
                <Ionicons name="play-circle" size={22} color="#ffffff" />
                <Text style={styles.primaryButtonText}>{t('ui.home.start_free_workout')}</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('ui.home.my_routines')}
              </Text>
              <TouchableOpacity
                style={styles.viewAllBtn}
                activeOpacity={0.7}
                onPress={() => router.push('/routines')}
              >
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  {t('ui.home.view_all')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {routines.length > 0 ? (
              <View style={styles.routineListContainer}>
                {routines.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.routineCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: isLoading ? 0.6 : 1,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleStartRoutine(r)}
                    disabled={isLoading}
                  >
                    <View style={styles.routineInfo}>
                      <Text style={[styles.routineTitle, { color: colors.text }]} numberOfLines={1}>
                        {r.title}
                      </Text>
                      <Text
                        style={[styles.routineDesc, { color: colors.textMuted }]}
                        numberOfLines={2}
                      >
                        {r.exercises?.map((e: any) => translateExercise(e.name)).join(', ') ||
                          t('ui.home.no_exercises')}
                      </Text>
                    </View>
                    <Ionicons
                      name="play-circle"
                      size={32}
                      color={colors.primary}
                      style={styles.routinePlayIcon}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="barbell-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t('ui.home.no_routines')}
                </Text>
                <TouchableOpacity
                  style={[styles.createRoutineBtn, { borderColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => router.push('/build-routine')}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={[styles.createRoutineBtnText, { color: colors.primary }]}>
                    {t('ui.routines.create') || 'ルーティンを作成'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        <OnboardingModals />
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBackBtn: {
    minWidth: 44,
    minHeight: 44,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 104 : 32,
  },
  primaryButton: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  primaryButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  primaryButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  routineListContainer: {
    gap: 12,
  },
  routineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  routineInfo: {
    flex: 1,
    marginRight: 16,
  },
  routineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  routineDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  routinePlayIcon: {
    marginLeft: 4,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  createRoutineBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    marginTop: 4,
  },
  createRoutineBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
