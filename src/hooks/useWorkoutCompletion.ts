import { useEffect, useState, useRef, useCallback } from 'react';
import { Alert, NativeModules, UIManager } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../store/workoutStore';
import { useSettingsStore } from '../store/settingsStore';
import { checkAndTriggerReviewFlow } from '../services/reviewService';
import { useRewardedInterstitialAd } from 'react-native-google-mobile-ads';
import { AD_CONFIG } from '../config/adConfig';
import { getSettings, saveSetting } from '../db/database';
import type ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { generateShareText, copyShareTextToClipboard } from '../services/shareService';
import { exportWorkoutToObsidian } from '../services/obsidianService';
import { awardWorkoutCompletionPoints, recordFeatureAction } from '../services/featureUnlockService';
import { recordWorkoutCompletionGamification } from '../services/gamificationService';

export function useWorkoutCompletion() {
  const { t } = useTranslation();
  const completionData = useWorkoutStore(state => state.lastWorkoutCompletion);
  const settings = useSettingsStore(state => state.settings);

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

  // Sharing States
  const [sharePattern, setSharePattern] = useState<'A' | 'B' | 'C'>('A');
  const [isSharing, setIsSharing] = useState(false);
  const [patternModalVisible, setPatternModalVisible] = useState(false);
  const [viewShotAvailable, setViewShotAvailable] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

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

  // Completion Data check & Obsidian export & Point award
  useEffect(() => {
    if (!completionData) {
      router.replace('/(tabs)/history');
    } else if (completionData.workout && completionData.workout.id) {
      exportWorkoutToObsidian(completionData.workout.id).catch(err => {
        console.warn('Obsidian export failed in background:', err);
      });
      // ワークアウト完了ポイント (+2P) および 初回/デイリーポイント付与
      const { isFirstToday } = recordFeatureAction('workout');
      if (isFirstToday) {
        awardWorkoutCompletionPoints();
      }
      // 経験値(XP)・メダル・クラス昇格判定
      const hasPRUpdate = Boolean(
        completionData.achievements?.is1RMUpdated || completionData.achievements?.isVolumeUpdated
      );
      recordWorkoutCompletionGamification(completionData.workout.id, hasPRUpdate).catch((err) => {
        console.warn('Gamification workout completion update failed:', err);
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
  };
}
