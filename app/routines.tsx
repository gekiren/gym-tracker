import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, UIManager, LayoutAnimation } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/theme';
import { getRoutines, deleteRoutine, updateRoutineOrders } from '../src/db/database';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { translateExercise } from '../src/i18n';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { checkDriveForProposals } from '../src/services/googleDriveSyncService';
import { useGoogleDriveSyncStore } from '../src/store/googleDriveSyncStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RoutinesScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [routines, setRoutines] = useState<any[]>([]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [deletingRoutine, setDeletingRoutine] = useState<{ id: number; title: string } | null>(null);
  const isPremium = useSettingsStore(state => state.settings.isPremium);
  const isEarly = useSettingsStore(state => state.settings.isEarlyAdopter);
  const isBasic = !isPremium && !isEarly;
  const appliedRevision = useGoogleDriveSyncStore(state => state.appliedRevision);

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
      checkDriveForProposals({ interactive: false, reason: 'routines_focus' })
        .then((res) => {
          if (res.status === 'applied') {
            fetchRoutines();
          }
        })
        .catch(() => {});
    }, [appliedRevision])
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
    setDeletingRoutine({ id, title });
  };



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, flex: 1 }]}>{t('ui.routines.title')}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {routines.length > 1 && (
            <TouchableOpacity 
              onPress={() => setIsReorderMode(!isReorderMode)} 
              style={[styles.reorderToggleBtn, isReorderMode && { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderRadius: 8 }]}
            >
              <Ionicons name={isReorderMode ? "checkmark-outline" : "swap-vertical-outline"} size={22} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            onPress={() => {
              if (isBasic && routines.length >= 11) {
                Alert.alert(
                  '作成制限',
                  'ベーシックプランではルーティン作成数が上限（11個）に達しています。既存のルーティンを削除するかプレミアムプランへ登録してください。',
                  [{ text: 'OK', style: 'default' }]
                );
                return;
              }
              router.push('/build-routine');
            }} 
            style={styles.headerActionBtn}
          >
            <Ionicons name="add" size={26} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {routines.map((r, index) => (
          <TouchableOpacity 
            key={r.id} 
            style={[
              styles.routineCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              isReorderMode && { borderStyle: 'dashed', borderColor: colors.primary }
            ]} 
            activeOpacity={0.7} 
            onPress={() => {
              if (isReorderMode) return;
              if (isBasic && routines.length >= 11) {
                Alert.alert(
                  '編集制限',
                  'ベーシックプランではルーティンが11個以上ある場合、編集画面を開くことができません。ルーティンを10個以下に減らしてから操作してください。',
                  [{ text: 'OK', style: 'default' }]
                );
                return;
              }
              router.push(`/build-routine?id=${r.id}`);
            }}
            disabled={isReorderMode}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.routineTitle, { color: colors.text }]}>{r.title}</Text>
              <Text style={[styles.routineDesc, { color: colors.textMuted }]} numberOfLines={2}>
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
                  <Ionicons name="arrow-up-outline" size={22} color={index === 0 ? colors.border : colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleMoveDown(index)} 
                  style={[styles.reorderBtn, index === routines.length - 1 && styles.reorderBtnDisabled]}
                  disabled={index === routines.length - 1}
                >
                  <Ionicons name="arrow-down-outline" size={22} color={index === routines.length - 1 ? colors.border : colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => handleDelete(r.id, r.title)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}

        {routines.length === 0 && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted }}>{t('ui.routines.empty')}</Text>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={deletingRoutine !== null}
        title={t('ui.routines.delete_title')}
        message={deletingRoutine ? t('ui.routines.delete_message_with_title', { title: deletingRoutine.title }) : ''}
        confirmText={t('ui.common.delete')}
        cancelText={t('ui.common.cancel')}
        type="danger"
        onConfirm={async () => {
          if (deletingRoutine) {
            await deleteRoutine(deletingRoutine.id);
            setDeletingRoutine(null);
            fetchRoutines();
          }
        }}
        onCancel={() => setDeletingRoutine(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, borderBottomWidth: 1 },
  headerIconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4, marginLeft: -8 },
  headerActionBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold' },
  reorderToggleBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  routineCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  routineTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  routineDesc: { fontSize: 14 },
  deleteBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 4, marginRight: -8 },
  reorderActions: { flexDirection: 'row', alignItems: 'center' },
  reorderBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  reorderBtnDisabled: { opacity: 0.3 }
});
