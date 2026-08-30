import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { useSettingsStore } from '../src/store/settingsStore';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useAppTheme } from '../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AI_CONFIG } from '../src/config/aiConfig';
import { useKeepAwake } from 'expo-keep-awake';
import { FloatingRestTimer } from '../components/active-workout/FloatingRestTimer';
import { ResumeWorkoutButton } from '../components/active-workout/ResumeWorkoutButton';
import { KeyboardAvoidingWrapper } from '../components/active-workout/KeyboardAvoidingWrapper';
import { PlateCalculatorModal } from '../components/active-workout/PlateCalculatorModal';
import { StanceModal } from '../components/active-workout/StanceModal';
import { WorkoutConfirmModal } from '../components/active-workout/WorkoutConfirmModal';
import { calculateRM } from '../src/utils/workoutStats';
import { useActiveWorkout } from '../src/hooks/useActiveWorkout';
import { ActiveWorkoutHeaderLeft, ActiveWorkoutHeaderRight } from '../components/active-workout/ActiveWorkoutHeader';
import { ActiveExerciseCard } from '../components/active-workout/ActiveExerciseCard';

function KeepAwakeController() {
  useKeepAwake();
  return null;
}

export default function ActiveWorkoutScreen() {
  const { colors } = useAppTheme();
  const {
    t,
    startTime,
    workoutNotes,
    exercises,
    settings,
    isWorkoutStarted,
    restTimerActive,
    lastRestFinishedAt,
    showWorkoutNotes,
    setShowWorkoutNotes,
    expandedExerciseNotes,
    isSaving,
    plateCalcVisible,
    setPlateCalcVisible,
    setActiveSetForCalc,
    stanceModalVisible,
    setStanceModalVisible,
    stanceModalTarget,
    setStanceModalTarget,
    pauseModalVisible,
    finishModalVisible,
    confirmLeaveWorkout,
    confirmDiscardWorkout,
    cancelPauseModal,
    confirmSaveWorkout,
    cancelFinishModal,
    presetStances,
    updateWorkoutNotes,
    updateExerciseNotes,
    addSet,
    removeSet,
    toggleSetComplete,
    updateSet,
    markWorkStart,
    beginWorkoutTimer,
    handleBack,
    handleDeleteExercise,
    handleAICoachWorkout,
    handleAICoachExercise,
    handleManualTimer,
    handleFinish,
    handleAddExercise,
    toggleExpandedExerciseNote,
    handleSelectStance,
    handleAddCustomStance,
    handleRemoveCustomStance,
    handleApplyPlateCalc,
  } = useActiveWorkout();

  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const safeBottomOffset = isAndroid ? (insets.bottom === 0 ? 48 : insets.bottom) : insets.bottom;

  const handleOpenStanceModal = useCallback(
    (target: { type: 'exercise' | 'set'; exId: string; setId?: string; currentValue: string | null }) => {
      setStanceModalTarget(target);
      setStanceModalVisible(true);
    },
    [setStanceModalTarget, setStanceModalVisible]
  );

  return (
    <View style={styles.container}>
      {settings.keepAwake && <KeepAwakeController />}
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerLeft: () => <ActiveWorkoutHeaderLeft t={t} onBack={handleBack} />,
          headerRight: () => (
            <ActiveWorkoutHeaderRight
              isWorkoutStarted={isWorkoutStarted}
              startTime={startTime}
              restTimerActive={restTimerActive}
              isSaving={isSaving}
              t={t}
              onOpenPlateCalc={() => setPlateCalcVisible(true)}
              onManualTimer={handleManualTimer}
              onFinish={handleFinish}
            />
          ),
        }}
      />

      <KeyboardAvoidingWrapper>
        {/* Workout Notes & AI Trainer Section (Fixed at Top) */}
        <View style={styles.fixedHeader}>
          <View style={styles.workoutNotesRow}>
            <TouchableOpacity
              onPress={() => setShowWorkoutNotes(!showWorkoutNotes)}
              style={[styles.workoutNotesBtn, { opacity: workoutNotes ? 1 : 0.6 }]}
            >
              <Ionicons name="document-text-outline" size={18} color={Theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.workoutNotesBtnText}>{t('ui.active_workout.workout_notes')}</Text>
              {workoutNotes ? (
                <Ionicons name="checkmark-circle" size={12} color={Theme.colors.success} style={{ marginLeft: 4 }} />
              ) : null}
            </TouchableOpacity>
            {AI_CONFIG.status === 'active' && (
              <TouchableOpacity onPress={handleAICoachWorkout} style={{ padding: 4 }}>
                <View style={styles.aiCoachBadge}>
                  <Ionicons name="sparkles" size={16} color={Theme.colors.primary} />
                  <Text style={styles.aiCoachText}>{t('ui.coach.ai_coach') || 'AIトレーナー'}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {(showWorkoutNotes || workoutNotes) && (
            <TextInput
              style={[styles.workoutNotesInput, !showWorkoutNotes && styles.workoutNotesInputHidden]}
              placeholder={t('ui.active_workout.workout_notes_placeholder')}
              placeholderTextColor={Theme.colors.textMuted}
              multiline
              value={workoutNotes}
              onChangeText={updateWorkoutNotes}
            />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={false}
        >
          {!isWorkoutStarted && (
            <TouchableOpacity style={styles.startWorkoutHeroBtn} onPress={beginWorkoutTimer}>
              <Text style={styles.startWorkoutHeroBtnText}>{t('ui.active_workout.start_training_btn')}</Text>
            </TouchableOpacity>
          )}

          {exercises.map(ex => (
            <ActiveExerciseCard
              key={ex.id}
              ex={ex}
              t={t}
              settings={settings}
              startTime={startTime}
              expandedNotes={!!expandedExerciseNotes[ex.id]}
              onToggleNotes={toggleExpandedExerciseNote}
              onUpdateNotes={updateExerciseNotes}
              onDeleteExercise={handleDeleteExercise}
              onAICoachExercise={handleAICoachExercise}
              onOpenStanceModal={handleOpenStanceModal}
              onAddSet={addSet}
              onUpdateSet={updateSet}
              onToggleSetComplete={toggleSetComplete}
              onRemoveSet={removeSet}
              onSetActiveSetForCalc={setActiveSetForCalc}
              calculateRM={calculateRM}
            />
          ))}

          <TouchableOpacity style={styles.addExerciseBtn} onPress={handleAddExercise}>
            <Text style={styles.addExerciseBtnText}>{t('ui.active_workout.add_exercise_label')}</Text>
          </TouchableOpacity>
          <View style={{ height: 220 }} />
        </ScrollView>
      </KeyboardAvoidingWrapper>

      {/* Floating Rest Timer UI */}
      <FloatingRestTimer safeBottomOffset={safeBottomOffset} />

      {/* Floating Manual Start Button (when not resting) */}
      {isWorkoutStarted && !restTimerActive && (
        <View style={[styles.manualStartOverlay, { bottom: safeBottomOffset + 20 }]}>
          <ResumeWorkoutButton
            lastRestFinishedAt={lastRestFinishedAt}
            onPress={() => {
              markWorkStart();
            }}
          />
        </View>
      )}

      {/* プレート計算機モーダル */}
      <PlateCalculatorModal
        visible={plateCalcVisible}
        onClose={() => setPlateCalcVisible(false)}
        weightUnit={settings.weightUnit}
        onApply={handleApplyPlateCalc}
      />

      {/* スタンス選択モーダル */}
      <StanceModal
        visible={stanceModalVisible}
        target={stanceModalTarget}
        onClose={() => setStanceModalVisible(false)}
        presetStances={presetStances}
        onSelectStance={handleSelectStance}
        onAddCustomStance={handleAddCustomStance}
        onRemoveCustomStance={handleRemoveCustomStance}
      />

      {/* ワークアウト中断確認モーダル */}
      <WorkoutConfirmModal
        visible={pauseModalVisible}
        type="pause"
        title={t('ui.active_workout.alert_pause_title')}
        message={t('ui.active_workout.alert_pause_message')}
        onCancel={cancelPauseModal}
        onLeave={confirmLeaveWorkout}
        onDiscard={confirmDiscardWorkout}
        leaveText={t('ui.active_workout.alert_pause_leave')}
        discardText={t('ui.active_workout.alert_pause_discard')}
        cancelText={t('ui.active_workout.alert_pause_cancel')}
      />

      {/* ワークアウト終了確認モーダル */}
      <WorkoutConfirmModal
        visible={finishModalVisible}
        type="finish"
        title={t('ui.active_workout.alert_finish_title')}
        message={t('ui.active_workout.alert_finish_message')}
        isSaving={isSaving}
        onCancel={cancelFinishModal}
        onSave={confirmSaveWorkout}
        saveText={t('ui.active_workout.alert_finish_save')}
        cancelText={t('ui.active_workout.cancel')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  fixedHeader: {
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    zIndex: 10,
  },
  workoutNotesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutNotesBtnText: {
    color: Theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  aiCoachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiCoachText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  workoutNotesInput: {
    backgroundColor: '#1a1a1a',
    color: Theme.colors.text,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333',
  },
  workoutNotesInputHidden: {
    height: 0,
    paddingVertical: 0,
    opacity: 0,
  },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  startWorkoutHeroBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startWorkoutHeroBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  addExerciseBtn: {
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    marginVertical: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  addExerciseBtnText: { color: Theme.colors.primary, fontSize: 18, fontWeight: 'bold' },
  manualStartOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, alignItems: 'center' },
});
