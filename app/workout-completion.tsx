import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, UIManager, NativeModules } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../src/store/workoutStore';
import { Theme } from '../src/theme';
import { Confetti } from '../components/Confetti';
import { checkAndTriggerReviewFlow } from '../src/services/reviewService';
import { useRewardedInterstitialAd } from 'react-native-google-mobile-ads';
import { AD_CONFIG } from '../src/config/adConfig';
import { getSettings, saveSetting, consumeAIToken, getAITokensBalance, refundAIToken } from '../src/db/database';
import { sendMessageToAICoach } from '../src/services/aiCoachService';
import type ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { generateShareText, copyShareTextToClipboard } from '../src/services/shareService';
import { ShareCardView } from '../components/active-workout/ShareCardView';

// Subcomponents
import { AchievementsSection } from '../components/workout-completion/AchievementsSection';
import { WorkoutDetailsList } from '../components/workout-completion/WorkoutDetailsList';
import { WorkoutCompletionModals } from '../components/workout-completion/WorkoutCompletionModals';

let ViewShotComponent: any = null;
try {
  const module = require('react-native-view-shot');
  ViewShotComponent = module.default || module;
} catch (e) {
  console.warn('react-native-view-shot module require failed:', e);
}

export default function WorkoutCompletionScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const completionData = useWorkoutStore(state => state.lastWorkoutCompletion);
  const settings = useWorkoutStore(state => state.settings);
  const setAITokensBalance = useWorkoutStore(state => state.setAITokensBalance);

  // AdMob Hooks
  const adUnitId = AD_CONFIG.getRewardedInterstitialAdUnitId();
  const { isLoaded, isClosed, load, show, isEarnedReward, error } = useRewardedInterstitialAd(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  // Local States
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [rewardResult, setRewardResult] = useState<'normal' | 'lucky' | null>(null);
  const [timerFinished, setTimerFinished] = useState(false);
  const [shouldShowAd, setShouldShowAd] = useState(false);
  const [shouldLoadAd, setShouldLoadAd] = useState(false);
  const [showAdPreview, setShowAdPreview] = useState(false);
  const hasCheckedAd = useRef(false);
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const syncTokenBalance = async () => {
      try {
        const balance = await getAITokensBalance();
        setAITokensBalance(balance);
      } catch (e) {
        console.warn('Failed to sync token balance', e);
      }
    };
    syncTokenBalance();
  }, []);
  
  // Sharing States
  const [sharePattern, setSharePattern] = useState<'A' | 'B' | 'C'>('A');
  const [isSharing, setIsSharing] = useState(false);
  const [patternModalVisible, setPatternModalVisible] = useState(false);
  const [viewShotAvailable, setViewShotAvailable] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    try {
      const hasNativeModule = !!NativeModules.RNViewShot;
      const hasViewConfig = !!(
        UIManager.hasViewManagerConfig && UIManager.hasViewManagerConfig('RNViewShot')
      ) || !!(
        UIManager.getViewManagerConfig && (UIManager.getViewManagerConfig('RNViewShot') || (UIManager as any).getViewManagerConfig('RNViewShotView'))
      );
      setViewShotAvailable(hasNativeModule || hasViewConfig);
    } catch (e) {
      setViewShotAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (!completionData) {
      router.replace('/(tabs)/history');
    }
  }, [completionData]);

  useEffect(() => {
    if (!completionData || settings.isPremium || settings.isEarlyAdopter || hasCheckedAd.current) return;
    hasCheckedAd.current = true;

    const checkAdFlow = async () => {
      try {
        const storedSettings = await getSettings();
        const skipCount = storedSettings['ad_skip_count'] ? parseInt(storedSettings['ad_skip_count'], 10) : 0;

        if (skipCount > 0) {
          await saveSetting('ad_skip_count', String(skipCount - 1));
          console.log(`Ad skipped. Remaining skip count decremented from ${skipCount} to ${skipCount - 1}`);
        } else {
          console.log('No skip count remaining. Setting shouldLoadAd to true...');
          setShouldShowAd(true);
          setShouldLoadAd(true);
        }
      } catch (e) {
        console.warn('Failed to handle ad skip count', e);
      }
    };

    checkAdFlow();
  }, [completionData, settings.isPremium, settings.isEarlyAdopter]);

  useEffect(() => {
    if (shouldLoadAd) {
      setShouldLoadAd(false);
      console.log('Ad instance load function ready. Calling load()...');
      load();
    }
  }, [shouldLoadAd, load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimerFinished(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timerFinished && isLoaded && shouldShowAd) {
      setShowAdPreview(true);
    }
  }, [timerFinished, isLoaded, shouldShowAd]);

  useEffect(() => {
    if (showAdPreview) {
      const delayTimer = setTimeout(() => {
        show();
        setShowAdPreview(false);
        setShouldShowAd(false);
      }, 1500);
      return () => clearTimeout(delayTimer);
    }
  }, [showAdPreview, show]);

  useEffect(() => {
    if (error) {
      console.warn('AdMob Error in Workout Completion screen:', error);
      Alert.alert(
        'AdMob Error (Debug)',
        `Error description:\n${error.message || String(error)}`,
        [{ text: 'OK' }]
      );
    }
  }, [error]);

  useEffect(() => {
    if (isClosed) {
      if (isEarnedReward) {
        const isLucky = Math.random() < 0.30;
        const skipCount = isLucky ? 2 : 1;
        
        saveSetting('ad_skip_count', String(skipCount)).then(() => {
          setRewardResult(isLucky ? 'lucky' : 'normal');
          setRewardModalVisible(true);
        });
      } else {
        const rand = Math.random();
        let silentSkip = 0;
        if (rand < 0.70) {
          silentSkip = 0;
        } else if (rand < 0.90) {
          silentSkip = 1;
        } else {
          silentSkip = 2;
        }
        
        saveSetting('ad_skip_count', String(silentSkip));
        console.log(`Ad skipped by user. Silent skip drawn: ${silentSkip} (rand: ${rand.toFixed(4)})`);
      }
    }
  }, [isClosed, isEarnedReward]);

  if (!completionData) {
    return null;
  }

  const { workout, achievements } = completionData;
  const maxTokens = (settings.isPremium || settings.isEarlyAdopter) ? 20 : 5;

  const handleAskAICoach = async () => {
    if (loadingAI) return;

    let consumed = false;
    try {
      consumed = await consumeAIToken();
    } catch (e) {
      console.warn('Failed to consume token', e);
    }

    if (!consumed) {
      Alert.alert(
        t('ui.coach.limit_reached_title') || '利用枠エラー',
        t('ui.coach.limit_reached_msg') || '今月の利用枠が残っていません。'
      );
      return;
    }

    try {
      const updatedBalance = await getAITokensBalance();
      setAITokensBalance(updatedBalance);
    } catch (e) {
      console.warn('Failed to update balance UI', e);
    }

    setLoadingAI(true);

    try {
      const durationMin = workout.end_time && workout.start_time
        ? Math.max(1, Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000))
        : null;

      let workoutDetailsStr = `今日のワークアウト: ${workout.title || 'フリーワークアウト'}\n`;
      if (durationMin !== null) {
        workoutDetailsStr += `実施時間: ${durationMin}分\n`;
      }
      if (workout.calories !== null && workout.calories > 0) {
        workoutDetailsStr += `消費カロリー: ${workout.calories} kcal\n`;
      }
      workoutDetailsStr += `実施種目とセット内容:\n`;

      workout.exercises.forEach((ex) => {
        const completedSets = ex.sets.filter(s => !!s.is_completed);
        if (completedSets.length > 0) {
          workoutDetailsStr += `- ${ex.name}:\n`;
          completedSets.forEach((set) => {
            const weightStr = set.weight !== null ? `${set.weight}${settings.weightUnit}` : '自重';
            const repsStr = set.reps !== null ? `${set.reps}回` : '';
            const rpeStr = set.rpe !== null ? ` (RPE: ${set.rpe})` : '';
            workoutDetailsStr += `  セット${set.set_number}: ${weightStr} x ${repsStr}${rpeStr}\n`;
          });
        }
      });

      if (achievements.weeklyWorkoutCount > 0) {
        workoutDetailsStr += `1週間の実施回数: 週${achievements.weeklyWorkoutCount}回達成\n`;
      }
      if (achievements.streakWeeks > 1) {
        workoutDetailsStr += `継続週数: ${achievements.streakWeeks}週間継続中\n`;
      }

      const isEn = i18n.language?.startsWith('en');
      const message = isEn
        ? "Please analyze the workout records above and generate a highly motivating, positive, and specific praise/encouragement comment in English (1-2 sentences, within 100 characters). Output only the body of the praise, omitting greetings or self-introductions."
        : "上記の今日のワークアウト実績を分析し、ユーザーを具体的かつポジティブに褒める、前向きでモチベーションが高まるオリジナルの応援コメントを日本語で1〜2文（合計100文字以内）で作成してください。挨拶や自己紹介（AIコーチ等）は省き、褒め言葉の本文のみを出力してください。";

      const response = await sendMessageToAICoach(
        message,
        workoutDetailsStr,
        settings.bodyWeight,
        settings.weightUnit
      );

      if (response.success) {
        setAiComment(response.reply);
      } else {
        try {
          await refundAIToken();
          const updatedBalance = await getAITokensBalance();
          setAITokensBalance(updatedBalance);
        } catch (e) {
          console.warn('Failed to refund token', e);
        }

        const alertTitle = response.errorType === 'busy'
          ? (t('ui.coach.busy_title') || '混雑中')
          : (t('ui.common.error') || 'エラー');

        Alert.alert(
          alertTitle,
          response.reply || '評価の取得に失敗しました。'
        );
      }
    } catch (err) {
      console.error('Failed to get AI assessment', err);
      try {
        await refundAIToken();
        const updatedBalance = await getAITokensBalance();
        setAITokensBalance(updatedBalance);
      } catch (e) {
        console.warn('Failed to refund token', e);
      }

      Alert.alert(
        t('ui.common.error') || 'エラー',
        '通信エラーが発生しました。'
      );
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDone = () => {
    router.replace('/(tabs)/history');
    setTimeout(() => {
      checkAndTriggerReviewFlow();
    }, 1000);
  };

  const handleShareButtonPress = () => {
    if (!viewShotAvailable) {
      Alert.alert(
        'アプリの再ビルドが必要です',
        '画像生成用のネイティブモジュールが含まれていません。プレビュー版または本番用アプリ（EAS Build）を再起動・再ビルドしてからお試しください。',
        [{ text: 'OK' }]
      );
      return;
    }
    setPatternModalVisible(true);
  };

  const handleShare = async (pattern: 'A' | 'B' | 'C') => {
    setSharePattern(pattern);
    setPatternModalVisible(false);
    setIsSharing(true);

    setTimeout(async () => {
      try {
        if (viewShotRef.current && typeof viewShotRef.current.capture === 'function') {
          const uri = await viewShotRef.current.capture();
          
          const shareText = generateShareText(workout, settings);
          await copyShareTextToClipboard(shareText);

          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/png',
              dialogTitle: 'ワークアウト記録をシェア',
              UTI: 'public.png',
            });
          } else {
            Alert.alert('共有エラー', 'このデバイスでは共有機能が利用できません。');
          }
        } else {
          Alert.alert('生成エラー', '画像生成コンポーネントが準備できていません。');
        }
      } catch (err) {
        console.error('Share capture failed', err);
        Alert.alert('エラー', '画像の生成中にエラーが発生しました。');
      } finally {
        setIsSharing(false);
      }
    }, 400);
  };

  const durationMin = workout.end_time && workout.start_time
    ? Math.max(1, Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000))
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Confetti effect overlay */}
      <Confetti />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header / Congratulations */}
        <View style={styles.congratsContainer}>
          <View style={styles.iconWrapper}>
            <Ionicons name="trophy" size={64} color="#ffd700" />
          </View>
          <Text style={styles.congratsTitle}>
            {t('ui.workout_completion.title')}
          </Text>
          <Text style={styles.congratsSubtitle}>
            {workout.title}
          </Text>
        </View>

        {/* Stats Row (Duration / Calories) */}
        <View style={styles.metaRow}>
          {durationMin !== null && (
            <View style={styles.metaBadge}>
              <Ionicons name="time" size={16} color={Theme.colors.primary} />
              <Text style={styles.metaBadgeText}>{durationMin} {t('ui.common.min_unit')}</Text>
            </View>
          )}
          {workout.calories !== null && workout.calories > 0 && (
            <View style={styles.metaBadge}>
              <Ionicons name="flame" size={16} color="#ff5722" />
              <Text style={styles.metaBadgeText}>{workout.calories} kcal</Text>
            </View>
          )}
        </View>

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
        <WorkoutDetailsList
          workout={workout}
          settings={settings}
          t={t}
        />

        {/* Spacer to push content above button */}
        <View style={{ height: 40 }} />

        {/* SNS Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShareButtonPress}>
          <Ionicons name="share-social-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
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
        <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
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
  congratsContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: Theme.spacing.lg,
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  congratsTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: Theme.spacing.xs,
    letterSpacing: 1.2,
  },
  congratsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: Theme.spacing.lg,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metaBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
});
