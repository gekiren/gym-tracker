import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getWorkoutsWithStats, loadFullWorkoutData, deleteWorkout, getExercises, addCustomExercise, deleteExercise, getFavoriteIds, toggleFavorite, getCustomExercisesCount, saveSetting, WorkoutWithStats, FullWorkoutData } from '../../src/db/database';
import { useAppTheme } from '../../src/theme';
import { useFocusEffect, router } from 'expo-router';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTranslation } from 'react-i18next';
import { translateExercise } from '../../src/i18n';
import WorkoutShareModal from '../../components/WorkoutShareModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

// Subcomponents
import { HistoryWorkoutsTab } from '../../components/history/HistoryWorkoutsTab';
import { HistoryExercisesTab } from '../../components/history/HistoryExercisesTab';

type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
};

export default function HistoryScreen() {
  const settings = useSettingsStore(state => state.settings);
  const isPremium = settings.isPremium;
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;

  const [workouts, setWorkouts] = useState<WorkoutWithStats[]>([]);
  const { t, i18n } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);

  const [activeTab, setActiveTab] = useState<'workouts' | 'exercises'>('workouts');
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedWorkoutForShare, setSelectedWorkoutForShare] = useState<FullWorkoutData | null>(null);

  // 統一削除確認モーダル用の状態
  const [deletingWorkout, setDeletingWorkout] = useState<{ id: number; title: string } | null>(null);
  const [deletingExerciseTarget, setDeletingExerciseTarget] = useState<Exercise | null>(null);

  // Exercises State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
      fetchExercises();
    }, [])
  );

  const fetchWorkouts = async () => {
    try {
      const data = await getWorkoutsWithStats();
      setWorkouts(data);
    } catch (e) {
      console.warn('Failed to fetch workouts', e);
    }
  };

  const fetchExercises = async () => {
    try {
      const [data, favs] = await Promise.all([
        getExercises(),
        getFavoriteIds()
      ]);
      setExercises(data as Exercise[]);
      setFavoriteIds(favs);
    } catch (e) {
      console.warn('Failed to fetch exercises', e);
    }
  };

  const handleDeleteWorkout = (id: number, title: string) => {
    setDeletingWorkout({ id, title });
  };

  const handleSNSSharePress = async (workoutId: number) => {
    const data = await loadFullWorkoutData(workoutId);
    if (data) {
      setSelectedWorkoutForShare(data);
      setShareModalVisible(true);
    }
  };

  const handleToggleFavorite = async (ex: Exercise) => {
    const isFav = favoriteIds.has(ex.id);
    await toggleFavorite(ex.id, isFav);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(ex.id);
      else next.add(ex.id);
      return next;
    });
  };

  const handleCreateExercise = async (name: string, group: string, equipment: string, unilateral: boolean, defaultStance: string | null) => {
    if (isBasic) {
      try {
        const count = await getCustomExercisesCount();
        if (count >= 20) {
          Alert.alert(
            'カスタム種目追加制限',
            'ベーシックプランでは最大20個までカスタム種目を登録できます。登録上限を増やすにはプレミアムプランへのアップグレードが必要です。',
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: 'アップグレードする', onPress: () => {
                router.push('/(tabs)/profile');
              }}
            ]
          );
          return;
        }
      } catch (e) {
        console.warn('Failed to check custom exercises count', e);
      }
    }

    try {
      if (defaultStance) {
        useSettingsStore.getState().addCustomStance(defaultStance);
        saveSetting('custom_stances', JSON.stringify(Array.from(new Set([...(settings.customStances || []), defaultStance]))));
      }
      await addCustomExercise(
        name, 
        group || 'その他', 
        equipment || 'その他',
        unilateral,
        defaultStance,
        defaultStance
      );
      fetchExercises();
    } catch (e) {
      console.error(e);
      Alert.alert(t('ui.common.error'), t('ui.exercise_library.error_add_failed'));
    }
  };

  const handleDeleteExercise = async (ex: Exercise) => {
    setDeletingExerciseTarget(ex);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Top Tab Bar */}
          <View style={[styles.tabContainer, { flex: 1 }]}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'workouts' && styles.tabButtonActive]}
              onPress={() => setActiveTab('workouts')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'workouts' && styles.tabButtonTextActive]}>
                {t('ui.tabs.workout') || 'ワークアウト'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'exercises' && styles.tabButtonActive]}
              onPress={() => setActiveTab('exercises')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'exercises' && styles.tabButtonTextActive]}>
                {t('ui.tabs.exercises') || '種目'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {activeTab === 'workouts' ? (
        <HistoryWorkoutsTab
          workouts={workouts}
          isCalendarVisible={isCalendarVisible}
          setCalendarVisible={setCalendarVisible}
          settings={settings}
          onDeleteWorkout={handleDeleteWorkout}
          onSNSShare={handleSNSSharePress}
          t={t}
          i18n={i18n}
        />
      ) : (
        <HistoryExercisesTab
          exercises={exercises}
          favoriteIds={favoriteIds}
          onToggleFavorite={handleToggleFavorite}
          onDeleteExercise={handleDeleteExercise}
          onAddCustomExercise={handleCreateExercise}
          isBasic={isBasic}
          t={t}
        />
      )}

      {/* Shared Share Modal */}
      <WorkoutShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        workout={selectedWorkoutForShare}
        settings={settings}
      />

      {/* 統一確認モーダル（ワークアウト履歴削除） */}
      <ConfirmModal
        visible={deletingWorkout !== null}
        title={t('ui.history.delete_alert_title')}
        message={deletingWorkout ? t('ui.history.delete_alert_message', { title: deletingWorkout.title }) : ''}
        confirmText={t('ui.history.delete_confirm')}
        cancelText={t('ui.common.cancel')}
        type="danger"
        onConfirm={async () => {
          if (deletingWorkout) {
            await deleteWorkout(deletingWorkout.id);
            setDeletingWorkout(null);
            fetchWorkouts();
          }
        }}
        onCancel={() => setDeletingWorkout(null)}
      />

      {/* 統一確認モーダル（カスタム種目削除） */}
      <ConfirmModal
        visible={deletingExerciseTarget !== null}
        title={t('ui.exercise_select.delete_title')}
        message={deletingExerciseTarget ? t('ui.exercise_select.delete_message', { name: translateExercise(deletingExerciseTarget.name) }) : ''}
        confirmText={t('ui.common.delete')}
        cancelText={t('ui.common.cancel')}
        type="danger"
        onConfirm={async () => {
          if (deletingExerciseTarget) {
            try {
              await deleteExercise(deletingExerciseTarget.id);
              fetchExercises();
            } catch (e) {
              Alert.alert(t('ui.common.error'), t('ui.exercise_select.delete_error'));
            } finally {
              setDeletingExerciseTarget(null);
            }
          }
        }}
        onCancel={() => setDeletingExerciseTarget(null)}
      />
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  spacing: ReturnType<typeof useAppTheme>['spacing']
) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background, paddingTop: 10, paddingBottom: 10 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: 12 },
  tabButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabButtonActive: { backgroundColor: 'rgba(79, 172, 254, 0.12)', borderColor: colors.primary },
  tabButtonText: { color: colors.textMuted, fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  tabButtonTextActive: { color: colors.primary },
});
