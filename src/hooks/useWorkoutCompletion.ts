import { useEffect, useState, useRef, useCallback } from 'react';
import { Alert, NativeModules, UIManager } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../store/workoutStore';
import { checkAndTriggerReviewFlow } from '../services/reviewService';
import { useRewardedInterstitialAd } from 'react-native-google-mobile-ads';
import { AD_CONFIG } from '../config/adConfig';
import { getSettings, saveSetting, consumeAIToken, getAITokensBalance, refundAIToken } from '../db/database';
import { sendMessageToAICoach } from '../services/aiCoachService';
import type ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { generateShareText, copyShareTextToClipboard } from '../services/shareService';
import { exportWorkoutToObsidian } from '../services/obsidianService';

export function useWorkoutCompletion() {
  const { t, i18n } = useTranslation();
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

  // Sharing States
  const [sharePattern, setSharePattern] = useState<'A' | 'B' | 'C'>('A');
  const [isSharing, setIsSharing] = useState(false);
  const [patternModalVisible, setPatternModalVisible] = useState(false);
  const [viewShotAvailable, setViewShotAvailable] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  // Sync token balance
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
  }, [setAITokensBalance]);

  // ViewShot Availability Check
  useEffect(() => {
    try {
      const hasNativeModule = !!NativeModules.RNViewShot;
      const hasViewConfig =
        !!(UIManager.hasViewManagerConfig && UIManager.hasViewManagerConfig('RNViewShot')) ||
        !!(
          UIManager.getViewManagerConfig &&
          (UIManager.getViewManagerConfig('RNViewShot') || (UIManager as any).getViewManagerConfig('RNViewShotView'))
        );
      setViewShotAvailable(hasNativeModule || hasViewConfig);
    } catch (e) {
      setViewShotAvailable(false);
    }
  }, []);

  // Completion Data check & Obsidian export
  useEffect(() => {
    if (!completionData) {
      router.replace('/(tabs)/history');
    } else if (completionData.workout && completionData.workout.id) {
      exportWorkoutToObsidian(completionData.workout.id).catch(err => {
        console.warn('Obsidian export failed in background:', err);
      });
    }
  }, [completionData]);

  // AdMob Skip Count Logic
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

  // Load Ad trigger
  useEffect(() => {
    if (shouldLoadAd) {
      setShouldLoadAd(false);
      console.log('Ad instance load function ready. Calling load()...');
      load();
    }
  }, [shouldLoadAd, load]);

  // Timer Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimerFinished(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Ad Preview Effect
  useEffect(() => {
    if (timerFinished && isLoaded && shouldShowAd) {
      setShowAdPreview(true);
    }
  }, [timerFinished, isLoaded, shouldShowAd]);

  // Show Ad after preview
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

  // Ad Error Effect
  useEffect(() => {
    if (error) {
      console.warn('AdMob Error in Workout Completion screen:', error);
      Alert.alert('AdMob Error (Debug)', `Error description:\n${error.message || String(error)}`, [{ text: 'OK' }]);
    }
  }, [error]);

  // Ad Closed Effect
  useEffect(() => {
    if (isClosed) {
      if (isEarnedReward) {
        const isLucky = Math.random() < 0.3;
        const skipCount = isLucky ? 2 : 1;

        saveSetting('ad_skip_count', String(skipCount)).then(() => {
          setRewardResult(isLucky ? 'lucky' : 'normal');
          setRewardModalVisible(true);
        });
      } else {
        const rand = Math.random();
        let silentSkip = 0;
        if (rand < 0.7) {
          silentSkip = 0;
        } else if (rand < 0.9) {
          silentSkip = 1;
        } else {
          silentSkip = 2;
        }

        saveSetting('ad_skip_count', String(silentSkip));
        console.log(`Ad skipped by user. Silent skip drawn: ${silentSkip} (rand: ${rand.toFixed(4)})`);
      }
    }
  }, [isClosed, isEarnedReward]);

  const maxTokens = settings.isPremium || settings.isEarlyAdopter ? 20 : 5;

  // Ask AI Coach Handler
  const handleAskAICoach = useCallback(async () => {
    if (loadingAI || !completionData) return;
    const { workout, achievements } = completionData;

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
      const durationMin =
        workout.end_time && workout.start_time
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

      workout.exercises.forEach(ex => {
        const completedSets = ex.sets.filter(s => !!s.is_completed);
        if (completedSets.length > 0) {
          workoutDetailsStr += `- ${ex.name}:\n`;
          completedSets.forEach(set => {
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
        ? 'Please analyze the workout records above and generate a highly motivating, positive, and specific praise/encouragement comment in English (1-2 sentences, within 100 characters). Output only the body of the praise, omitting greetings or self-introductions.'
        : '上記の今日のワークアウト実績を分析し、ユーザーを具体的かつポジティブに褒める、前向きでモチベーションが高まるオリジナルの応援コメントを日本語で1〜2文（合計100文字以内）で作成してください。挨拶や自己紹介（AIコーチ等）は省き、褒め言葉の本文のみを出力してください。';

      const response = await sendMessageToAICoach(message, workoutDetailsStr, settings.bodyWeight, settings.weightUnit);

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

        const alertTitle = response.errorType === 'busy' ? t('ui.coach.busy_title') || '混雑中' : t('ui.common.error') || 'エラー';

        Alert.alert(alertTitle, response.reply || '評価の取得に失敗しました。');
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

      Alert.alert(t('ui.common.error') || 'エラー', '通信エラーが発生しました。');
    } finally {
      setLoadingAI(false);
    }
  }, [loadingAI, completionData, setAITokensBalance, settings.weightUnit, settings.bodyWeight, i18n.language, t]);

  // Done Handler
  const handleDone = useCallback(() => {
    router.replace('/(tabs)/history');
    setTimeout(() => {
      checkAndTriggerReviewFlow();
    }, 1000);
  }, []);

  // Share Button Press
  const handleShareButtonPress = useCallback(() => {
    if (!viewShotAvailable) {
      Alert.alert(
        'アプリの再ビルドが必要です',
        '画像生成用のネイティブモジュールが含まれていません。プレビュー版または本番用アプリ（EAS Build）を再起動・再ビルドしてからお試しください。',
        [{ text: 'OK' }]
      );
      return;
    }
    setPatternModalVisible(true);
  }, [viewShotAvailable]);

  // Share Handler
  const handleShare = useCallback(
    async (pattern: 'A' | 'B' | 'C') => {
      if (!completionData) return;
      setSharePattern(pattern);
      setPatternModalVisible(false);
      setIsSharing(true);

      setTimeout(async () => {
        try {
          if (viewShotRef.current && typeof viewShotRef.current.capture === 'function') {
            const uri = await viewShotRef.current.capture();

            const shareText = generateShareText(completionData.workout, settings);
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
    },
    [completionData, settings]
  );

  return {
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
  };
}
