import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getWorkoutsWithStats, loadFullWorkoutData, deleteWorkout, getExercises, addCustomExercise, deleteExercise, getFavoriteIds, toggleFavorite, getCustomExercisesCount, saveSetting, WorkoutWithStats } from '../../src/db/database';
import { Theme } from '../../src/theme';
import { useFocusEffect, router } from 'expo-router';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTranslation } from 'react-i18next';
import { translateExercise } from '../../src/i18n';
import WorkoutShareModal from '../../components/WorkoutShareModal';

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
  const settings = useWorkoutStore(state => state.settings);
  const isPremium = settings.isPremium;
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;

  const [workouts, setWorkouts] = useState<WorkoutWithStats[]>([]);
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<'workouts' | 'exercises'>('workouts');
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedWorkoutForShare, setSelectedWorkoutForShare] = useState<any>(null);

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
    Alert.alert(
      t('ui.history.delete_alert_title'),
      t('ui.history.delete_alert_message', { title }),
      [
        { text: t('ui.common.cancel'), style: 'cancel' },
        { 
          text: t('ui.history.delete_confirm'), 
          style: 'destructive',
          onPress: async () => {
            await deleteWorkout(id);
            fetchWorkouts();
          }
        }
      ]
    );
  };

  const handleSNSSharePress = async (workoutId: number) => {
    const data = await loadFullWorkoutData(workoutId);
    if (data) {
      setSelectedWorkoutForShare(data);
      setShareModalVisible(true);
    }
  };

  const handleAICoachHistory = async (workoutId: number, title: string) => {
    const data = await loadFullWorkoutData(workoutId);
    if (!data) return;

    let contextStr = `【過去のワークアウト履歴データ】\n`;
    const dateStr = data.start_time.split('T')[0];
    contextStr += `■ 日付: ${dateStr} | タイトル: ${data.title}\n`;
    if (data.notes) contextStr += `全体メモ: "${data.notes}"\n`;
    
    for (const ex of data.exercises) {
      contextStr += `- ${ex.exercise_name}`;
      if (ex.notes) contextStr += ` (種目メモ: "${ex.notes}")`;
      contextStr += `: `;
      
      const setDescs = ex.sets.map((s: any) => {
        let sd = `${s.weight ?? 0}${settings.weightUnit} x ${s.reps ?? 0}回`;
        if (s.side) sd = `[${s.side === 'L' ? '左' : '右'}] ` + sd;
        if (s.variation) sd += ` (${s.variation})`;
        if (s.rpe) sd += ` (RPE: ${s.rpe})`;
        return sd;
      });
      contextStr += setDescs.join(', ') + '\n';
    }

    router.push({
      pathname: '/(tabs)/coach',
      params: {
        contextPrompt: contextStr,
        prefillMessage: t('ui.coach.prefill_history_workout', { date: dateStr, title: data.title }),
        title: data.title
      }
    });
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
        useWorkoutStore.getState().addCustomStance(defaultStance);
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
    Alert.alert(
      t('ui.exercise_select.delete_title'),
      t('ui.exercise_select.delete_message', { name: translateExercise(ex.name) }),
      [
        { text: t('ui.common.cancel'), style: 'cancel' },
        { 
          text: t('ui.common.delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(ex.id);
              fetchExercises();
            } catch (e) {
              Alert.alert(t('ui.common.error'), t('ui.exercise_select.delete_error'));
            }
          }
        }
      ]
    );
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
          {activeTab === 'workouts' && (
            <TouchableOpacity 
              style={styles.calendarBtn}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={22} color={Theme.colors.primary} />
            </TouchableOpacity>
          )}
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
          onAICoachHistory={handleAICoachHistory}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { borderBottomWidth: 1, borderBottomColor: Theme.colors.border, backgroundColor: Theme.colors.background, paddingTop: 10, paddingBottom: 10 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: Theme.spacing.md, gap: 12 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'transparent' },
  tabButtonActive: { backgroundColor: 'rgba(79, 172, 254, 0.1)', borderColor: Theme.colors.primary },
  tabButtonText: { color: Theme.colors.textMuted, fontSize: 15, fontWeight: 'bold' },
  tabButtonTextActive: { color: Theme.colors.primary },
  calendarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: Theme.spacing.md },
});
