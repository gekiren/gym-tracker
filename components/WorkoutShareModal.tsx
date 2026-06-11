import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, Image, UIManager, NativeModules } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { translateExercise } from '../src/i18n';
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

interface WorkoutShareModalProps {
  visible: boolean;
  onClose: () => void;
  workout: any;
  settings: {
    weightUnit: 'kg' | 'lbs';
    bodyWeight: number | null;
  };
}

export default function WorkoutShareModal({ visible, onClose, workout, settings }: WorkoutShareModalProps) {
  const [sharePattern, setSharePattern] = useState<'A' | 'B' | 'C'>('A');
  const [isSharing, setIsSharing] = useState(false);
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

  const handleShare = async (pattern: 'A' | 'B' | 'C') => {
    if (!viewShotAvailable) {
      Alert.alert(
        'アプリの再ビルドが必要です',
        '画像生成用のネイティブモジュールが含まれていません。プレビュー版または本番用アプリ（EAS Build）を再起動・再ビルドしてからお試しください。',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSharePattern(pattern);
    setIsSharing(true);

    // Let the state update propagate so the correct pattern renders in ShareCardView
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
        onClose();
      }
    }, 400);
  };

  return (
    <>
      {/* Pattern Selection Modal */}
      <Modal visible={visible && !isSharing} transparent={true} animationType="slide" onRequestClose={onClose}>
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
              onPress={onClose}
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
      {viewShotAvailable && ViewShotComponent && visible && (
        <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
          <ViewShotComponent ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
            <ShareCardView workout={workout} settings={settings} pattern={sharePattern} />
          </ViewShotComponent>
        </View>
      )}
    </>
  );
}

interface ShareCardViewProps {
  workout: {
    title: string;
    end_time?: string;
    calories: number | null;
    exercises: {
      name?: string;
      exercise_name?: string;
      equipment?: string;
      sets: {
        weight: number | null;
        reps: number | null;
        is_completed: boolean;
      }[];
    }[];
  };
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
        name: ex.name || ex.exercise_name || '',
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
