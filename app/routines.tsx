import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, UIManager, LayoutAnimation } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../src/theme';
import { getRoutines, deleteRoutine, getPreviousWorkoutSets, getPersonalRecords, updateRoutineOrders } from '../src/db/database';
import { useWorkoutStore } from '../src/store/workoutStore';
import { translateExercise } from '../src/i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RoutinesScreen() {
  const { t } = useTranslation();
  const [routines, setRoutines] = useState<any[]>([]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const { startWorkout, addExercise, settings } = useWorkoutStore();
  const isPremium = settings.premiumUntil === 'perpetual' || (settings.premiumUntil !== '' && !isNaN(Date.parse(settings.premiumUntil)) && Date.parse(settings.premiumUntil) > Date.now());
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newRoutines = [...routines];
    const temp = newRoutines[index];
    newRoutines[index] = newRoutines[index - 1];
    newRoutines[index - 1] = temp;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRoutines(newRoutines);

    try {
      await updateRoutineOrders(newRoutines.map((r, idx) => ({ id: r.id, sort_order: idx })));
    } catch (e) {
      console.warn('Failed to update routine order', e);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === routines.length - 1) return;
    const newRoutines = [...routines];
    const temp = newRoutines[index];
    newRoutines[index] = newRoutines[index + 1];
    newRoutines[index + 1] = temp;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRoutines(newRoutines);

    try {
      await updateRoutineOrders(newRoutines.map((r, idx) => ({ id: r.id, sort_order: idx })));
    } catch (e) {
      console.warn('Failed to update routine order', e);
    }
  };

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
      console.warn(e);
    }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
      t('ui.routines.delete_title'),
      t('ui.routines.delete_message_with_title', { title }),
      [
        { text: t('ui.common.cancel'), style: 'cancel' },
        { 
          text: t('ui.common.delete'), 
          style: 'destructive',
          onPress: async () => {
            await deleteRoutine(id);
            fetchRoutines();
          }
        }
      ]
    );
  };

  const handleStartRoutine = async (routine: any) => {
    try {
      startWorkout(routine.title);
      for (const ex of routine.exercises) {
        const personalRecords = await getPersonalRecords(ex.id);
        let initialSets: any[] = [];

        if (ex.sets && ex.sets.length > 0) {
          if (ex.is_unilateral) {
            for (const s of ex.sets) {
              initialSets.push({
                weight: s.weight,
                reps: s.reps,
                rpe: s.rpe,
                side: 'L',
                variation: s.variation || null,
                stance: s.stance || null
              });
              initialSets.push({
                weight: s.weight,
                reps: s.reps,
                rpe: s.rpe,
                side: 'R',
                variation: s.variation || null,
                stance: s.stance || null
              });
            }
          } else {
            initialSets = ex.sets.map((s: any) => ({
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe,
              side: null,
              variation: s.variation || null,
              stance: s.stance || null
            }));
          }
        } else {
          initialSets = await getPreviousWorkoutSets(ex.id);
        }
 
        addExercise({ 
          id: ex.id, 
          name: ex.name, 
          previousSets: initialSets, 
          personalRecords, 
          is_unilateral: ex.is_unilateral, 
          default_variation: ex.default_variation || null,
          default_stance: ex.default_stance || null,
          equipment: ex.equipment,
          muscle_group: ex.muscle_group
        });
      }
      router.push('/active-workout');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={28} color={Theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('ui.routines.all_routines')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {routines.length > 1 && (
            <TouchableOpacity 
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsReorderMode(!isReorderMode);
              }} 
              style={styles.reorderToggleBtn}
            >
              <Ionicons 
                name={isReorderMode ? "checkmark-circle" : "swap-vertical"} 
                size={24} 
                color={Theme.colors.primary} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => {
              if (isBasic && routines.length >= 10) {
                Alert.alert(
                  'ルーティン登録制限',
                  'ベーシックプランでは最大10個までルーティンを登録できます。登録上限を増やすにはプレミアムプランへのアップグレードが必要です。',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: 'アップグレードする', onPress: () => router.push('/(tabs)/profile') }
                  ]
                );
              } else {
                router.push('/build-routine');
              }
            }}
            style={[styles.reorderToggleBtn, { marginLeft: 8 }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {routines.map((r, index) => (
          <TouchableOpacity 
            key={r.id} 
            style={[styles.routineCard, isReorderMode && styles.routineCardEditing]} 
            activeOpacity={0.7} 
            onPress={() => !isReorderMode && handleStartRoutine(r)}
            disabled={isReorderMode}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.routineTitle}>{r.title}</Text>
              <Text style={styles.routineDesc} numberOfLines={2}>
                {r.exercises?.map((e: any) => translateExercise(e.name)).join(', ') || t('ui.home.no_exercises')}
              </Text>
            </View>
            
            {isReorderMode ? (
              <View style={styles.reorderActions}>
                <TouchableOpacity 
                  onPress={() => handleMoveUp(index)} 
                  style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                  disabled={index === 0}
                >
                  <Ionicons name="arrow-up-outline" size={22} color={index === 0 ? Theme.colors.border : Theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleMoveDown(index)} 
                  style={[styles.reorderBtn, index === routines.length - 1 && styles.reorderBtnDisabled]}
                  disabled={index === routines.length - 1}
                >
                  <Ionicons name="arrow-down-outline" size={22} color={index === routines.length - 1 ? Theme.colors.border : Theme.colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => handleDelete(r.id, r.title)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={22} color={Theme.colors.danger} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}

        {routines.length === 0 && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: Theme.colors.textMuted }}>{t('ui.routines.empty')}</Text>
          </View>
        )}
      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.md, paddingTop: 50, backgroundColor: Theme.colors.card, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  title: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text },
  reorderToggleBtn: { padding: 8 },
  content: { padding: Theme.spacing.md, paddingBottom: 32 },
  routineCard: { backgroundColor: Theme.colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.lg, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  routineCardEditing: { borderStyle: 'dashed', borderColor: Theme.colors.primary },
  routineTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  routineDesc: { fontSize: 14, color: Theme.colors.textMuted },
  deleteBtn: { padding: 8, marginLeft: 8 },
  reorderActions: { flexDirection: 'row', alignItems: 'center' },
  reorderBtn: { padding: 8, marginLeft: 8 },
  reorderBtnDisabled: { opacity: 0.3 }
});
