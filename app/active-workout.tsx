import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { ScrollView, TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { useSettingsStore } from '../src/store/settingsStore';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../src/theme';
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {settings.keepAwake && <KeepAwakeController />}
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
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
        <View style={[styles.fixedHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={styles.workoutNotesRow}>
            <TouchableOpacity
              onPress={() => setShowWorkoutNotes(!showWorkoutNotes)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[styles.workoutNotesBtn, { opacity: workoutNotes ? 1 : 0.7 }]}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.workoutNotesBtnText, { color: colors.primary }]}>{t('ui.active_workout.workout_notes')}</Text>
              {workoutNotes ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginLeft: 4 }} />
              ) : null}
            </TouchableOpacity>
            {AI_CONFIG.status === 'active' && (
              <TouchableOpacity
                onPress={handleAICoachWorkout}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[styles.aiCoachBadge, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={[styles.aiCoachText, { color: colors.primary }]}>{t('ui.coach.ai_coach') || 'AIトレーナー'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {(showWorkoutNotes || workoutNotes) && (
            <TextInput
              style={[
                styles.workoutNotesInput,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                !showWorkoutNotes && styles.workoutNotesInputHidden,
              ]}
              placeholder={t('ui.active_workout.workout_notes_placeholder')}
              placeholderTextColor={colors.textMuted}
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
            <TouchableOpacity
              style={[styles.startWorkoutHeroBtn, { backgroundColor: colors.primary }]}
              onPress={beginWorkoutTimer}
              activeOpacity={0.85}
            >
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

          <GHTouchableOpacity
            style={[styles.addExerciseBtn, { borderColor: colors.primary }]}
            onPress={handleAddExercise}
            activeOpacity={0.7}
          >
            <Text style={[styles.addExerciseBtnText, { color: colors.primary }]}>{t('ui.active_workout.add_exercise_label')}</Text>
          </GHTouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingWrapper>

      {/* Floating Rest Timer UI */}
      <FloatingRestTimer safeBottomOffset={safeBottomOffset} />

      {/* Floating Manual Start Button (when not resting) */}
      {isWorkoutStarted && !restTimerActive && (
        <View style={[styles.manualStartOverlay, { bottom: safeBottomOffset + 20 }]} pointerEvents="box-none">
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
  container: { flex: 1 },
  fixedHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
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
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  workoutNotesBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  aiCoachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiCoachText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  workoutNotesInput: {
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  workoutNotesInputHidden: {
    height: 0,
    minHeight: 0,
    marginTop: 0,
    paddingVertical: 0,
    borderWidth: 0,
    opacity: 0,
  },
  content: { padding: 16, paddingBottom: 160 },
  startWorkoutHeroBtn: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  startWorkoutHeroBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  addExerciseBtn: {
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    borderWidth: 1,
  },
  addExerciseBtnText: { fontSize: 16, fontWeight: 'bold' },
  manualStartOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, alignItems: 'center' },
});
