import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../src/theme';
import { ShareCardView } from '../components/active-workout/ShareCardView';
import { AchievementsSection } from '../components/workout-completion/AchievementsSection';
import { WorkoutDetailsList } from '../components/workout-completion/WorkoutDetailsList';
import { WorkoutCompletionModals } from '../components/workout-completion/WorkoutCompletionModals';
import { CompletionHeader } from '../components/workout-completion/CompletionHeader';
import { useWorkoutCompletion } from '../src/hooks/useWorkoutCompletion';

let ViewShotComponent: any = null;
try {
  const module = require('react-native-view-shot');
  ViewShotComponent = module.default || module;
} catch (e) {
  console.warn('react-native-view-shot module require failed:', e);
}

export default function WorkoutCompletionScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const {
    t,
    completionData,
    settings,
    rewardModalVisible,
    setRewardModalVisible,
    rewardResult,
    showAdPreview,
    sharePattern,
    isSharing,
    patternModalVisible,
    setPatternModalVisible,
    viewShotAvailable,
    viewShotRef,
    handleDone,
    handleShareButtonPress,
    handleShare,
  } = useWorkoutCompletion();

  if (!completionData) {
    return null;
  }

  const { workout, achievements } = completionData;
  const durationMin =
    workout.end_time && workout.start_time
      ? Math.max(1, Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000))
      : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header / Congratulations & Meta Stats */}
        <CompletionHeader
          title={workout.title || t('ui.home.free_workout_title')}
          durationMin={durationMin}
          calories={workout.calories}
          t={t}
        />

        {/* Achievements Section */}
        <AchievementsSection
          workoutId={workout.id}
          achievements={achievements}
          settings={settings}
          t={t}
        />

        {/* Workout Details (Read-only list) */}
        <WorkoutDetailsList workout={workout} settings={settings} t={t} />

        {/* Spacer */}
        <View style={{ height: 40 }} />

        {/* SNS Share Button */}
        <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.card, borderColor: colors.primary }]} onPress={handleShareButtonPress}>
          <Ionicons name="share-social-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.shareButtonText, { color: colors.primary }]}>{t('ui.common.share_sns')}</Text>
        </TouchableOpacity>

        {/* Done Button */}
        <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.primary }]} onPress={handleDone}>
          <Text style={styles.doneButtonText}>{t('ui.workout_completion.done_btn')}</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Share Loading Overlay */}
      {isSharing && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>{t('ui.share_modal.generating')}</Text>
          </View>
        </View>
      )}

      {/* Hidden view for capturing */}
      {viewShotAvailable && ViewShotComponent && (
        <View style={styles.hiddenCaptureView}>
          <ViewShotComponent ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
            <ShareCardView workout={workout} settings={settings} pattern={sharePattern} />
          </ViewShotComponent>
        </View>
      )}

      {/* Modals Overlay */}
      <WorkoutCompletionModals
        patternModalVisible={patternModalVisible}
        setPatternModalVisible={setPatternModalVisible}
        rewardModalVisible={rewardModalVisible}
        setRewardModalVisible={setRewardModalVisible}
        rewardResult={rewardResult}
        showAdPreview={showAdPreview}
        onShare={handleShare}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  doneButton: {
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  hiddenCaptureView: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
});
