import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, Image, UIManager, NativeModules } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutStore, WorkoutCompletionData } from '../src/store/workoutStore';
import { Theme } from '../src/theme';
import { translateExercise, translateStance } from '../src/i18n';
import { Confetti } from '../components/Confetti';
import { checkAndTriggerReviewFlow } from '../src/services/reviewService';
import { useRewardedInterstitialAd } from 'react-native-google-mobile-ads';
import { AD_CONFIG } from '../src/config/adConfig';
import { getSettings, saveSetting } from '../src/db/database';
import type ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { calculateShareStats, generateShareText, copyShareTextToClipboard } from '../src/services/shareService';

let ViewShotComponent: any = null;
try {
  const module = require('react-native-view-shot');
  ViewShotComponent = module.default || module;
} catch (e) {
  console.warn('react-native-view-shot module require failed:', e);
}

const APP_ICON = require('../assets/images/icon.png');

export default function WorkoutCompletionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const completionData = useWorkoutStore(state => state.lastWorkoutCompletion);
  const settings = useWorkoutStore(state => state.settings);

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
    // If no completion data (e.g. direct nav), go back or to history
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
          // Decrement skip count and save silently
          await saveSetting('ad_skip_count', String(skipCount - 1));
          console.log(`Ad skipped. Remaining skip count decremented from ${skipCount} to ${skipCount - 1}`);
        } else {
          // It's time to show the ad! Set state and queue ad loading
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
      setShouldLoadAd(false); // only load once
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
        // User watched the ad to the end!
        const isLucky = Math.random() < 0.30;
        const skipCount = isLucky ? 2 : 1;
        
        saveSetting('ad_skip_count', String(skipCount)).then(() => {
          setRewardResult(isLucky ? 'lucky' : 'normal');
          setRewardModalVisible(true);
        });
      } else {
        // User skipped the ad!
        // Raffle probabilities: 0 skips (70%), 1 skip (20%), 2 skips (10%)
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
          
          // Generate & Copy text to clipboard
          const shareText = generateShareText(workout, settings);
          await copyShareTextToClipboard(shareText);

          // Native Share
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

  const calculateRM = (weight: number | null, reps: number | null) => {
    if (!weight || !reps || reps < 1) return null;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + (reps / 30)));
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('ui.workout_completion.subtitle')}</Text>
          
          <View style={styles.achievementGrid}>
            {/* Streak Days Card */}
            <View style={styles.achievementCard}>
              <View style={[styles.cardIconCircle, { backgroundColor: 'rgba(255, 87, 34, 0.15)' }]}>
                <Ionicons name="flame" size={24} color="#ff5722" />
              </View>
              <Text style={styles.cardValue}>{t('ui.workout_completion.streak_days', { count: achievements.streakDays })}</Text>
            </View>

            {/* Streak Weeks Card */}
            <View style={styles.achievementCard}>
              <View style={[styles.cardIconCircle, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
                <Ionicons name="calendar" size={24} color={Theme.colors.primary} />
              </View>
              <Text style={styles.cardValue}>{t('ui.workout_completion.streak_weeks', { count: achievements.streakWeeks })}</Text>
            </View>
          </View>

          {/* 1RM Record Card */}
          {achievements.is1RMUpdated && (
            <View style={[styles.achievementCardLong, { borderColor: '#ffd700', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="star" size={20} color="#ffd700" style={{ marginRight: 8 }} />
                <Text style={[styles.longCardHeader, { color: '#ffd700' }]}>{t('ui.workout_completion.rm_updated')}</Text>
              </View>
              {achievements.updated1RMs.map((item, idx) => (
                <View key={idx} style={styles.recordDetailRow}>
                  <Text style={styles.recordDetailName}>{translateExercise(item.name)}</Text>
                  <Text style={styles.recordDetailValue}>
                    {item.oldVal}{settings.weightUnit} → <Text style={{ color: '#ffd700', fontWeight: 'bold' }}>{item.newVal}{settings.weightUnit}</Text>
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Volume Record Card */}
          {achievements.isVolumeUpdated && (
            <View style={[styles.achievementCardLong, { borderColor: Theme.colors.success, borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="trending-up" size={20} color={Theme.colors.success} style={{ marginRight: 8 }} />
                <Text style={[styles.longCardHeader, { color: Theme.colors.success }]}>{t('ui.workout_completion.volume_updated')}</Text>
              </View>
              {achievements.updatedVolumes.map((item, idx) => (
                <View key={idx} style={styles.recordDetailRow}>
                  <Text style={styles.recordDetailName}>{translateExercise(item.name)}</Text>
                  <Text style={styles.recordDetailValue}>
                    {item.oldVal}{settings.weightUnit} → <Text style={{ color: Theme.colors.success, fontWeight: 'bold' }}>{item.newVal}{settings.weightUnit}</Text>
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Encouraging message if no PRs */}
          {!achievements.is1RMUpdated && !achievements.isVolumeUpdated && (
            <View style={styles.encouragingCard}>
              <Ionicons name="sparkles-outline" size={22} color={Theme.colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.encouragingText}>
                {t('ui.workout_completion.no_achievements')}
              </Text>
            </View>
          )}
        </View>

        {/* Workout Details (Read-only list) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('ui.workout_completion.workout_details')}</Text>

          {workout.notes ? (
            <View style={styles.workoutNotes}>
              <Ionicons name="document-text-outline" size={16} color={Theme.colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.workoutNotesText}>{workout.notes}</Text>
            </View>
          ) : null}

          {workout.exercises.map((ex) => {
            const completedSets = ex.sets.filter(s => !!s.is_completed);
            if (completedSets.length === 0) return null;

            return (
              <View key={ex.id} style={styles.card}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseTitle}>{translateExercise(ex.name)}</Text>
                  <View style={styles.exerciseVolumeBadge}>
                    <Text style={styles.exerciseVolumeLabel}>{t('ui.history.volume_label')}: </Text>
                    <Text style={styles.exerciseVolumeValue}>
                      {completedSets.reduce((sum, s) => {
                        const exBw = (ex.equipment === '自重' && settings.bodyWeight) ? settings.bodyWeight : 0;
                        return sum + ((s.weight || 0) + exBw) * (s.reps || 0);
                      }, 0)} {settings.weightUnit}
                    </Text>
                  </View>
                </View>

                {ex.notes ? (
                  <View style={styles.exerciseNotes}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
                    <Text style={styles.exerciseNotesText}>{ex.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 40 }]}>{t('ui.active_workout.header_set')}</Text>
                  <Text style={[styles.th, { width: 90 }]}>{settings.weightUnit}</Text>
                  <Text style={[styles.th, { flex: 1 }]}>{t('ui.active_workout.header_reps')}</Text>
                  {settings.displayFields.showRpe && (
                    <Text style={[styles.th, { width: 45 }]}>{t('ui.active_workout.header_rpe')}</Text>
                  )}
                  {settings.displayFields.show1RM && (
                    <Text style={[styles.th, { flex: 1 }]}>1RM</Text>
                  )}
                </View>

                {completedSets.map((set) => {
                  const currentRM = calculateRM(set.weight, set.reps);
                  let timeStr = '';
                  const fmtTime = (secs: number) => {
                    const m = Math.floor(secs / 60);
                    const s = secs % 60;
                    return `${m > 0 ? `${m}:` : ''}${s.toString().padStart(m > 0 ? 2 : 1, '0')}${m === 0 ? 's' : ''}`;
                  };
                  if (set.work_seconds != null) timeStr += `⏱️ ${fmtTime(set.work_seconds)} `;
                  if (set.rest_seconds != null) timeStr += `☕ ${fmtTime(set.rest_seconds)}`;
                  timeStr = timeStr.trim();

                  return (
                    <View key={set.id} style={styles.setRowWrapper}>
                      <View style={styles.setRow}>
                        <Text style={styles.tdSet}>{set.set_number}{set.side ? `(${set.side})` : ''}</Text>
                        <Text style={[styles.tdValue, { width: 90 }]}>{set.weight ?? '-'}</Text>
                        <Text style={styles.tdValue}>{set.reps ?? '-'}</Text>
                        {settings.displayFields.showRpe && (
                          <Text style={[styles.tdValue, { width: 45, flex: 0 }]}>{set.rpe ?? '-'}</Text>
                        )}
                        {settings.displayFields.show1RM && (
                          <Text style={[styles.tdValue, { color: Theme.colors.primary }]}>{currentRM ?? '-'}</Text>
                        )}
                      </View>
                      
                      {/* Sub-row for variation/stance and timers */}
                      {(set.variation || timeStr) ? (
                        <View style={styles.setSubRow}>
                          {set.variation ? (
                            <Text style={styles.stanceBadge}>
                              {t('ui.active_workout.stance_label')}: {translateStance(set.variation)}
                            </Text>
                          ) : <View />}
                          {timeStr ? (
                            <Text style={styles.timeBadge}>{timeStr}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* Spacer to push content above button */}
        <View style={{ height: 40 }} />

        {/* SNS Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShareButtonPress}>
          <Ionicons name="share-social-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.shareButtonText}>SNSにシェア</Text>
        </TouchableOpacity>

        {/* Done Button */}
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>{t('ui.workout_completion.done_btn')}</Text>
        </TouchableOpacity>
        
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Pattern Selection Modal */}
      <Modal visible={patternModalVisible} transparent={true} animationType="slide" onRequestClose={() => setPatternModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <Text style={styles.modalTitle}>シェア画像のデザインを選択</Text>
            
            <TouchableOpacity style={styles.patternOption} onPress={() => handleShare('A')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="sparkles" size={24} color="#ffd700" />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={styles.patternName}>パターンA: エンタメ換算重視</Text>
                <Text style={styles.patternDesc}>総重量を軽自動車やゾウ、おにぎり等に面白換算！</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.patternOption} onPress={() => handleShare('B')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="list" size={24} color={Theme.colors.primary} />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={styles.patternName}>パターンB: 詳細記録重視</Text>
                <Text style={styles.patternDesc}>全種目の重量・レップ・セット数をきれいに一覧化！</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.patternOption} onPress={() => handleShare('C')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="stats-chart" size={24} color={Theme.colors.success} />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={styles.patternName}>パターンC: ハイブリッド</Text>
                <Text style={styles.patternDesc}>面白換算に加え、種目ごとのセット数と最大1RMを表示！</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setPatternModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Loading Overlay */}
      {isSharing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>シェア用画像を生成中...</Text>
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

      {/* Reward Modal */}
      <Modal visible={rewardModalVisible} transparent={true} animationType="fade">
        <View style={styles.rewardModalOverlay}>
          <View style={styles.rewardModalContent}>
            <View style={styles.rewardModalIcon}>
              <Ionicons 
                name={rewardResult === 'lucky' ? "gift" : "checkmark-circle"} 
                size={54} 
                color={rewardResult === 'lucky' ? "#ffd700" : Theme.colors.success} 
              />
            </View>
            <Text style={styles.rewardModalTitle}>
              {rewardResult === 'lucky' 
                ? t('ui.workout_completion.reward_title_lucky') 
                : t('ui.workout_completion.reward_title')}
            </Text>
            <Text style={styles.rewardModalDesc}>
              {rewardResult === 'lucky' 
                ? t('ui.workout_completion.reward_desc_two') 
                : t('ui.workout_completion.reward_desc_one')}
            </Text>
            <TouchableOpacity 
              style={styles.rewardModalBtn} 
              onPress={() => setRewardModalVisible(false)}
            >
              <Text style={styles.rewardModalBtnText}>
                {t('ui.workout_completion.reward_close_btn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ad Preview Overlay */}
      {showAdPreview && (
        <View style={styles.adPreviewOverlay}>
          <View style={styles.adPreviewContent}>
            <View style={styles.adPreviewIconCircle}>
              <Ionicons name="gift" size={48} color="#ffd700" />
            </View>
            <Text style={styles.adPreviewTitle}>
              {t('ui.workout_completion.ad_preview_title')}
            </Text>
            <Text style={styles.adPreviewDesc}>
              {t('ui.workout_completion.ad_preview_desc')}
            </Text>
            <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginTop: 24 }} />
          </View>
        </View>
      )}
    </View>
  );
}

interface ShareCardViewProps {
  workout: WorkoutCompletionData['workout'];
  settings: {
    weightUnit: 'kg' | 'lbs';
    bodyWeight: number | null;
  };
  pattern: 'A' | 'B' | 'C';
}

function ShareCardView({ workout, settings, pattern }: ShareCardViewProps) {
  const stats = calculateShareStats(workout, settings);
  const dateStr = new Date(workout.end_time || Date.now()).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const formattedVolume = stats.totalVolume.toLocaleString();

  const getExerciseSummary = () => {
    return workout.exercises.map(ex => {
      const completedSets = ex.sets.filter(s => !!s.is_completed);
      let max1RM = 0;
      completedSets.forEach(s => {
        if (s.weight && s.reps) {
          const rm = s.reps === 1 ? s.weight : s.weight * (1 + (s.reps / 30));
          if (rm > max1RM) max1RM = rm;
        }
      });
      return {
        name: ex.name,
        setsCount: completedSets.length,
        max1RM: Math.round(max1RM),
        setsDetail: completedSets.map(s => `${s.weight ?? 0}${stats.weightUnit}x${s.reps ?? 0}`).join(' / '),
      };
    }).filter(ex => ex.setsCount > 0);
  };

  const exerciseSummaries = getExerciseSummary();

  return (
    <View style={[styles.cardCanvas, { backgroundColor: '#0F172A' }]}>
      <View style={styles.cardInner}>
        {/* Top Header */}
        <View>
          <View style={styles.cardHeaderBadge} />
          <Text style={styles.cardHeaderTitle}>
            {pattern === 'B' ? 'WORKOUT SUMMARY' : 'WORKOUT COMPLETED'}
          </Text>
          <Text style={styles.cardHeaderDate}>{dateStr}</Text>
          <Text style={styles.cardWorkoutTitle} numberOfLines={1}>{workout.title}</Text>
        </View>

        {/* Main Content Area */}
        <View style={styles.cardMainContent}>
          {pattern === 'A' && (
            <View style={{ flex: 1, justifyContent: 'center', gap: 30 }}>
              {/* Volume */}
              <View>
                <Text style={styles.cardLabel}>TOTAL VOLUME</Text>
                <Text style={styles.cardVolumeValue}>
                  {formattedVolume} <Text style={{ fontSize: 40 }}>{stats.weightUnit}</Text>
                </Text>
              </View>

              {/* Fun conversions */}
              <View style={styles.funCardsContainer}>
                <View style={styles.funCard}>
                  <Text style={styles.funCardEmoji}>🚗</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.funCardTitle}>軽自動車約 {stats.carCount} 台分！</Text>
                    <Text style={styles.funCardSub}>総ボリュームを車の重量（約800kg）に換算</Text>
                  </View>
                </View>

                {stats.totalVolumeKg >= 6000 ? (
                  <View style={styles.funCard}>
                    <Text style={styles.funCardEmoji}>🐘</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.funCardTitle}>アフリカゾウ約 {stats.elephantCount} 頭分！</Text>
                      <Text style={styles.funCardSub}>総ボリュームをゾウの重量（約6,000kg）に換算</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.funCard}>
                    <Text style={styles.funCardEmoji}>🚌</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.funCardTitle}>大型路線バス約 {stats.busCount} 台分！</Text>
                      <Text style={styles.funCardSub}>総ボリュームをバスの重量（約10,000kg）に換算</Text>
                    </View>
                  </View>
                )}

                {stats.calories > 0 && (
                  <View style={styles.funCard}>
                    <Text style={styles.funCardEmoji}>🍙</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.funCardTitle}>おにぎり約 {stats.onigiriCount} 個分 / ビール {stats.beerCount} 杯分</Text>
                      <Text style={styles.funCardSub}>消費エネルギー（{stats.calories} kcal）の食べ物換算</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {pattern === 'B' && (
            <View style={{ flex: 1, gap: 24, justifyContent: 'center' }}>
              <Text style={styles.cardLabel}>COMPLETED EXERCISES</Text>
              <View style={{ gap: 20 }}>
                {exerciseSummaries.slice(0, 6).map((ex, idx) => (
                  <View key={idx} style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Text style={styles.detailExerciseName} numberOfLines={1}>{translateExercise(ex.name)}</Text>
                      <Text style={styles.detailSetsCount}>{ex.setsCount} sets</Text>
                    </View>
                    <Text style={styles.detailSetsDetail} numberOfLines={1}>{ex.setsDetail}</Text>
                  </View>
                ))}
                {exerciseSummaries.length > 6 && (
                  <Text style={styles.plusMoreText}>+ 他 {exerciseSummaries.length - 6} 種目実施</Text>
                )}
              </View>
            </View>
          )}

          {pattern === 'C' && (
            <View style={{ flex: 1, justifyContent: 'center', gap: 30 }}>
              {/* Top - Mini Volume & Fun */}
              <View style={{ gap: 10 }}>
                <Text style={styles.cardLabel}>TOTAL VOLUME</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 24 }}>
                  <Text style={[styles.cardVolumeValue, { fontSize: 72, lineHeight: 76 }]}>
                    {formattedVolume} <Text style={{ fontSize: 32 }}>{stats.weightUnit}</Text>
                  </Text>
                  <Text style={styles.hybridFunText}>🚗 軽自動車約 {stats.carCount} 台分！</Text>
                </View>
              </View>

              {/* Bottom - Simplified Exercise List */}
              <View style={{ gap: 16 }}>
                <Text style={styles.cardLabel}>EXERCISE SUMMARY</Text>
                <View style={{ gap: 12 }}>
                  {exerciseSummaries.slice(0, 5).map((ex, idx) => (
                    <View key={idx} style={styles.hybridRow}>
                      <Text style={styles.hybridExerciseName} numberOfLines={1}>{translateExercise(ex.name)}</Text>
                      <Text style={styles.hybridStats}>
                        {ex.setsCount} sets  |  Max 1RM: <Text style={{ color: Theme.colors.primary, fontWeight: 'bold' }}>{ex.max1RM}{stats.weightUnit}</Text>
                      </Text>
                    </View>
                  ))}
                  {exerciseSummaries.length > 5 && (
                    <Text style={[styles.plusMoreText, { marginTop: 0 }]}>+ 他 {exerciseSummaries.length - 5} 種目実施</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterQuote}>POWERED BY TRENOTE</Text>
          <View style={styles.cardBranding}>
            <Image source={APP_ICON} style={styles.cardBrandingIcon} />
            <View>
              <Text style={styles.cardBrandingName}>TreNote</Text>
              <Text style={styles.cardBrandingSub}>Workout Tracker</Text>
            </View>
          </View>
        </View>
      </View>
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
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    color: Theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.md,
    letterSpacing: 0.5,
  },
  achievementGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  achievementCard: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  achievementCardLong: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  longCardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  recordDetailName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1.2,
  },
  recordDetailValue: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  encouragingCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  encouragingText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  workoutNotes: {
    flexDirection: 'row',
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    padding: 12,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.lg,
  },
  workoutNotesText: {
    color: Theme.colors.text,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  exerciseTitle: {
    color: Theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1.2,
  },
  exerciseVolumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exerciseVolumeLabel: {
    fontSize: 12,
    color: Theme.colors.text,
  },
  exerciseVolumeValue: {
    fontSize: 12,
    color: Theme.colors.text,
    fontWeight: 'bold',
  },
  exerciseNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  exerciseNotesText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: 8,
  },
  th: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  setRowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tdSet: {
    color: Theme.colors.textMuted,
    width: 40,
    textAlign: 'center',
    fontSize: 15,
  },
  tdValue: {
    color: Theme.colors.text,
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  setSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 44,
    paddingRight: 12,
  },
  stanceBadge: {
    color: Theme.colors.textMuted,
    fontSize: 11,
  },
  timeBadge: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  doneButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rewardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardModalContent: {
    width: '85%',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  rewardModalIcon: {
    marginBottom: Theme.spacing.md,
  },
  rewardModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  rewardModalDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  rewardModalBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: Theme.borderRadius.sm,
  },
  rewardModalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  adPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  adPreviewContent: {
    width: '85%',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  adPreviewIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  adPreviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  adPreviewDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  // Share styles
  shareButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: Theme.borderRadius.lg,
    borderTopRightRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    gap: 16,
    borderTopWidth: 1,
    borderColor: Theme.colors.border,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  patternOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: 16,
  },
  patternIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternTextContainer: {
    flex: 1,
  },
  patternName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  patternDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 4,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Theme.colors.textMuted,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  loadingContent: {
    backgroundColor: Theme.colors.card,
    padding: 24,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Share Card Canvas Styles
  cardCanvas: {
    width: 1080,
    height: 1080,
    position: 'relative',
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    padding: 60,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  cardHeaderBadge: {
    width: 80,
    height: 6,
    backgroundColor: Theme.colors.primary,
    borderRadius: 3,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Theme.colors.primary,
    letterSpacing: 2,
  },
  cardHeaderDate: {
    fontSize: 20,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  cardWorkoutTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  cardVolumeValue: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 100,
  },
  funCardsContainer: {
    gap: 20,
  },
  funCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  funCardEmoji: {
    fontSize: 40,
  },
  funCardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  funCardSub: {
    fontSize: 20,
    color: '#94A3B8',
    marginTop: 4,
  },
  cardMainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  detailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  detailCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailExerciseName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  detailSetsCount: {
    fontSize: 22,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  detailSetsDetail: {
    fontSize: 24,
    color: '#94A3B8',
  },
  plusMoreText: {
    fontSize: 24,
    color: '#64748B',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  hybridFunText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#E2E8F0',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  hybridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  hybridExerciseName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  hybridStats: {
    fontSize: 24,
    color: '#94A3B8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 28,
  },
  cardFooterQuote: {
    fontSize: 22,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 3,
  },
  cardBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardBrandingIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  cardBrandingName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardBrandingSub: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
});
