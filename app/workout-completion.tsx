import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../src/theme';
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
  const {
    t,
    completionData,
    settings,
    maxTokens,
    rewardModalVisible,
    setRewardModalVisible,
    rewardResult,
    showAdPreview,
    aiComment,
    loadingAI,
    sharePattern,
    isSharing,
    patternModalVisible,
    setPatternModalVisible,
    viewShotAvailable,
    viewShotRef,
    handleAskAICoach,
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
          achievements={achievements}
          settings={settings}
          maxTokens={maxTokens}
          aiComment={aiComment}
          loadingAI={loadingAI}
          onAskAICoach={handleAskAICoach}
          t={t}
        />

        {/* Workout Details (Read-only list) */}
        <WorkoutDetailsList workout={workout} settings={settings} t={t} />

        {/* Spacer */}
        <View style={{ height: 40 }} />

        {/* SNS Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShareButtonPress}>
          <Ionicons name="share-social-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.shareButtonText}>{t('ui.common.share_sns')}</Text>
        </TouchableOpacity>

        {/* Done Button */}
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>{t('ui.workout_completion.done_btn')}</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Share Loading Overlay */}
      {isSharing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>{t('ui.share_modal.generating')}</Text>
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
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    marginBottom: 12,
  },
  shareButtonText: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#fff',
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
    backgroundColor: Theme.colors.card,
    padding: 24,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 15,
  },
  hiddenCaptureView: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
});
