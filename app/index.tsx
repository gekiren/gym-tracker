import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Dimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore, FeatureId } from '../src/store/settingsStore';
import { useFeatureUnlockStore, isFeatureUnlockedHelper } from '../src/store/featureUnlockStore';
import { ALL_FEATURE_IDS, getUnlockCost } from '../src/constants/featureUnlockConstants';
import { InitialFeatureSelectModal } from '../components/InitialFeatureSelectModal';
import { FeatureUnlockModal } from '../components/FeatureUnlockModal';
import { PointBadge } from '../components/PointBadge';
import { useLifelogStore } from '../src/store/lifelogStore';
import { useNutritionStore } from '../src/store/nutritionStore';
import { useBodyStore } from '../src/store/bodyStore';
import { analyzeMusclePotential } from '../src/utils/bodyCalculators';
import { saveSetting, getLastWorkoutSummary, LastWorkoutSummary } from '../src/db/database';
import * as Updates from 'expo-updates';
import { readCrashLog, deleteCrashLog, sendCrashReport, initializeSentry } from '../src/services/crashReporterService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LifelogDateHeader } from '../components/LifelogDateHeader';

import { WorkoutCard } from '../src/components/home/WorkoutCard';
import { BodyCard } from '../src/components/home/BodyCard';
import { WaterCard } from '../src/components/home/WaterCard';
import { NutritionCard } from '../src/components/home/NutritionCard';
import { TimeCard } from '../src/components/home/TimeCard';
import { HabitCard } from '../src/components/home/HabitCard';
import { RoutineCard } from '../src/components/home/RoutineCard';
import { VoiceAiCard } from '../src/components/home/VoiceAiCard';

const { width } = Dimensions.get('window');



export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  // Workout Store
  const settings = useSettingsStore(state => state.settings);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const featureOrder = useSettingsStore(state => state.settings.featureOrder);
  const featureVisibility = useSettingsStore(state => state.settings.featureVisibility);
  const hasUnsentCrashLog = useWorkoutStore(state => state.hasUnsentCrashLog);

  // Lifelog Store
  const currentDate = useLifelogStore(state => state.currentDate);
  const isLoadingLifelog = useLifelogStore(state => state.isLoading);
  const setCurrentDate = useLifelogStore(state => state.setCurrentDate);

  // Nutrition Store
  const loadMealLogs = useNutritionStore(state => state.loadMealLogs);
  const loadGoals = useNutritionStore(state => state.loadGoals);

  // Body Store
  const loadBodyData = useBodyStore(state => state.loadBodyData);

  // Feature Unlock Store
  const pointsBalance = useFeatureUnlockStore(state => state.pointsBalance);
  const unlockedFeatures = useFeatureUnlockStore(state => state.unlockedFeatures);
  const forceUnlockAll = useFeatureUnlockStore(state => state.forceUnlockAll);
  const hasCompletedInitialSelection = useFeatureUnlockStore(state => state.hasCompletedInitialSelection);
  const setInitialFeatures = useFeatureUnlockStore(state => state.setInitialFeatures);
  const pendingUnlockFeature = useFeatureUnlockStore(state => state.pendingUnlockFeature);
  const setPendingUnlockFeature = useFeatureUnlockStore(state => state.setPendingUnlockFeature);

  const isPremium = settings.isPremium;
  const isEarlyAdopter = settings.isEarlyAdopter;

  // Local state for onboarding/modals
  const [isSendingCrash, setIsSendingCrash] = useState(false);
  const [isNewUser, setIsNewUser] = useState(settings.needsStyleSelection);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      const targetDate = currentDate || today;
      setCurrentDate(targetDate);
      loadMealLogs(targetDate);
      loadGoals();
      loadBodyData(targetDate.replace(/\//g, '-'));

      return () => {
        isMounted = false;
      };
    }, [currentDate, loadMealLogs, loadGoals, loadBodyData, setCurrentDate])
  );

  // Onboarding Handlers
  const handleSelectUnit = async (unit: 'kg' | 'lbs') => {
    await saveSetting('weight_unit', unit);
    loadSettings({ ...settings, weightUnit: unit, needsUnitSelection: false });
  };

  const handleSelectStyle = async (style: 'simple' | 'advanced') => {
    await saveSetting('style_mode', style);
    const isAdvanced = style === 'advanced';
    
    await saveSetting('display_rpe', isAdvanced ? '1' : '0');
    await saveSetting('display_stance', isAdvanced ? '1' : '0');
    await saveSetting('display_1rm', isAdvanced ? '1' : '0');
    await saveSetting('display_volume', isAdvanced ? '1' : '0');

    useSettingsStore.getState().setDisplayFields({
      showRpe: isAdvanced,
      showStance: isAdvanced,
      show1RM: isAdvanced,
      showVolume: isAdvanced
    });

    loadSettings({ ...settings, needsStyleSelection: false });
    setIsNewUser(false);
  };

  const unlockedList = ALL_FEATURE_IDS.filter(id => isFeatureUnlockedHelper(id, unlockedFeatures, forceUnlockAll, isPremium, isEarlyAdopter));

  const handleUnlock = async (featureId: FeatureId) => {
    setPendingUnlockFeature(featureId);
  };

  const handleSendCrashReport = async () => {
    setIsSendingCrash(true);
    try {
      const log = await readCrashLog();
      if (log) {
        await sendCrashReport(log);
        await deleteCrashLog();
        useWorkoutStore.getState().setHasUnsentCrashLog(false);
        initializeSentry();
        Alert.alert(t('ui.crash_report.success_title') || '���M����', t('ui.crash_report.success_desc') || '�����͂��肪�Ƃ��������܂��B');
      }
    } catch (e) {
      console.error('Failed to send crash report:', e);
      Alert.alert(t('ui.crash_report.error_title') || '�G���[', t('ui.crash_report.error_desc') || '���M�Ɏ��s���܂����B');
    } finally {
      setIsSendingCrash(false);
    }
  };

  const handleCrashConsent = async (action: 'agreed' | 'declined' | 'remind_later') => {
    setIsSendingCrash(true);
    try {
      if (action === 'declined') {
        await deleteCrashLog();
        useWorkoutStore.getState().setHasUnsentCrashLog(false);
      }
      useWorkoutStore.getState().setHasUnsentCrashLog(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingCrash(false);
    }
  };

  const renderFeatureCard = (id: FeatureId) => {
    switch (id) {
      case 'workout': return <WorkoutCard key="workout" />;
      case 'body': return <BodyCard key="body" />;
      case 'water': return <WaterCard key="water" />;
      case 'nutrition': return <NutritionCard key="nutrition" />;
      case 'zikan': return <TimeCard key="zikan" />;
      case 'habit': return <HabitCard key="habit" />;
      case 'routine': return <RoutineCard key="routine" />;
      case 'voice_ai': return <VoiceAiCard key="voice_ai" />;
      default: return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      {/* Date Switcher Header */}
      <LifelogDateHeader style={{ paddingTop: insets.top + 16, paddingBottom: 16 }} type="workout" />

      {/* P-Points & Status Bar */}
      <View style={styles.pointStatusBar}>
        <View style={styles.pointStatusLeft}>
          <Text style={styles.pointStatusLabel}>{t('ui.home.p_points_balance') || 'Pポイント残高:'}</Text>
          <PointBadge />
        </View>
        <TouchableOpacity
          style={styles.manageFeaturesLink}
          onPress={() => router.push('/settings/feature-management')}
          activeOpacity={0.7}
        >
          <Text style={styles.manageFeaturesLinkText}>{t('ui.home.manage_features') || '機能の追加・管理'}</Text>
          <Ionicons name="chevron-forward" size={14} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Loading Indicator */}
        {isLoadingLifelog && (
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginBottom: 12 }} />
        )}

        {/* Dynamic Feature Cards List */}
        {(() => {
          const activeOrder: FeatureId[] = featureOrder && featureOrder.length > 0 
            ? featureOrder 
            : ['workout', 'body', 'water', 'nutrition', 'zikan', 'routine', 'habit', 'voice_ai'];
          
          // 解放されている機能のみフィルタリング
          const unlockedList = activeOrder.filter((id: FeatureId) =>
            isFeatureUnlockedHelper(id, unlockedFeatures, forceUnlockAll, isPremium, isEarlyAdopter)
          );

          const visibleFeatures = unlockedList.filter((id: FeatureId) =>
            featureVisibility ? featureVisibility[id] !== false : true
          );

          if (visibleFeatures.length === 0) {
            return (
              <View style={[styles.card, { alignItems: 'center', paddingVertical: 36 }]}>
                <Ionicons name="options-outline" size={44} color={Theme.colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={{ color: Theme.colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                  {t('ui.home.no_features_selected') || '表示される機能が選択されていません。'}{'\n'}
                  {t('ui.home.select_features_hint') || 'アプリ設定 ➔「機能管理」から表示する機能を選択してください。'}
                </Text>
              </View>
            );
          }

          return visibleFeatures.map((id) => renderFeatureCard(id as FeatureId));
        })()}

        {/* Unlock New Feature CTA Card (When not all features are unlocked) */}
        {!isPremium && !isEarlyAdopter && !forceUnlockAll && unlockedFeatures.length < ALL_FEATURE_IDS.length && (
          <TouchableOpacity
            style={styles.unlockCtaCard}
            activeOpacity={0.8}
            onPress={() => router.push('/settings/feature-management')}
          >
            <View style={styles.unlockCtaIconBg}>
              <Ionicons name="key-outline" size={24} color="#ffd700" />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.unlockCtaTitle}>{t('ui.home.unlock_new_features') || '新しい機能を開放する'}</Text>
                <View style={styles.unlockCtaBadge}>
                  <Text style={styles.unlockCtaBadgeText}>{t('ui.home.remaining_features', { count: ALL_FEATURE_IDS.length - unlockedFeatures.length }) || `あと ${ALL_FEATURE_IDS.length - unlockedFeatures.length} 機能`}</Text>
                </View>
              </View>
              <Text style={styles.unlockCtaDesc}>
                {t('ui.home.unlock_features_hint', { cost: getUnlockCost(unlockedFeatures.length) }) || `貯まった Pポイントを使って、好きな機能をアンロックできます（次: ${getUnlockCost(unlockedFeatures.length)} P）`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffd700" />
          </TouchableOpacity>
        )}

        {/* App Settings Access Card */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.8}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
              <Ionicons name="settings-outline" size={24} color="#4facfe" />
            </View>
            <Text style={styles.cardTitle}>{t('ui.home.card_settings') || 'アプリ設定'}</Text>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.inactiveText}>
              {t('ui.home.settings_desc') || 'Gemini AI連携、データ出力・共有、バックアップ、機能管理などを操作できます。'}
            </Text>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* Initial Feature Selection Modal (For new users / before selecting 2 features) */}
      <InitialFeatureSelectModal
        visible={!settings.needsUnitSelection && !settings.needsStyleSelection && !isPremium && !isEarlyAdopter && !hasCompletedInitialSelection}
        onComplete={(selected) => {
          setInitialFeatures(selected);
          // 選択した2つを表示状態にも同期
          const newVisibility: Record<FeatureId, boolean> = {
            workout: selected.includes('workout'),
            water: selected.includes('water'),
            nutrition: selected.includes('nutrition'),
            body: selected.includes('body'),
            routine: selected.includes('routine'),
            habit: selected.includes('habit'),
            zikan: selected.includes('zikan'),
            voice_ai: selected.includes('voice_ai'),
          };
          useSettingsStore.getState().setFeatureConfig(
            [...selected, ...ALL_FEATURE_IDS.filter(id => !selected.includes(id))],
            newVisibility
          );
        }}
      />

      {/* Feature Unlock Celebration Modal */}
      <FeatureUnlockModal
        featureId={pendingUnlockFeature}
        onClose={() => setPendingUnlockFeature(null)}
      />

      {/* Onboarding Unit Selection Modal */}
      <Modal visible={settings.needsUnitSelection} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Ionicons name="barbell" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.home.onboarding_unit_title')}</Text>
            <Text style={styles.modalDesc}>
              {t('ui.home.onboarding_unit_desc')}
            </Text>
            <View style={styles.modalBtnContainer}>
              <TouchableOpacity style={styles.unitBtn} onPress={() => handleSelectUnit('kg')}>
                <Text style={styles.unitBtnText}>{t('ui.home.unit_kg_desc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.unitBtn} onPress={() => handleSelectUnit('lbs')}>
                <Text style={styles.unitBtnText}>{t('ui.home.unit_lbs_desc')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Onboarding Style Selection Modal */}
      <Modal visible={!settings.needsUnitSelection && settings.needsStyleSelection} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxWidth: 450 }]}>
            <Ionicons name="sparkles" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.home.onboarding_style_title') || '記録スタイルを選択'}</Text>
            <Text style={[styles.modalDesc, { marginBottom: 20 }]}>
              {t('ui.home.onboarding_style_desc') || 'ご自身のトレーニングレベルや好みに合わせて、画面に表示する記録項目を選んでください。'}
            </Text>

            <TouchableOpacity 
              style={styles.styleOptionCard} 
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('simple')}
            >
              <View style={styles.styleOptionIconBg}>
                <Ionicons name="document-text-outline" size={26} color={Theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.styleOptionTitle}>{t('ui.home.style_simple_title') || 'シンプル'}</Text>
                <Text style={styles.styleOptionDesc}>
                  {t('ui.home.style_simple_desc') || '表示項目を最小限に抑え、トレーニングの重量・回数記録だけに集中できるクリーンな表示です。'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.styleOptionCard, { marginTop: 12 }]} 
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('advanced')}
            >
              <View style={[styles.styleOptionIconBg, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
                <Ionicons name="sparkles-outline" size={26} color={Theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.styleOptionTitle}>{t('ui.home.style_advanced_title') || 'こだわり'}</Text>
                <Text style={styles.styleOptionDesc}>
                  {t('ui.home.style_advanced_desc') || 'RPE(辛さ)やフォームのスタンス記録、自動1RM推定、合計ボリューム計算など、こだわりの機能をフル活用できます。'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.styleOnboardingHint}>
              {t('ui.home.style_onboarding_hint') || '※選択した内容は、後から設定（プロフィール）画面で個別にいつでもON/OFFを変更可能です。'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Onboarding & Startup Crash Consent Modal */}
      <Modal visible={!settings.needsUnitSelection && !settings.needsStyleSelection && settings.crashConsent === 'unset' && hasUnsentCrashLog} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxWidth: 450 }]}>
            <Ionicons name="bug-outline" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.crash_report.title') || 'アプリ改善へのご協力のお願い'}</Text>
            <Text style={[styles.modalDesc, { marginBottom: 24 }]}>
              {t('ui.crash_report.message_detected') || '前回の起動時にアプリが予期せず終了しました。品質向上のため、匿名のクラッシュレポートを送信してもよろしいですか？'}
            </Text>

            <View style={styles.modalBtnContainer}>
              <TouchableOpacity style={styles.crashConsentBtn} onPress={() => handleCrashConsent('agreed')} disabled={isSendingCrash}>
                {isSendingCrash ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.crashConsentBtnText}>{t('ui.crash_report.btn_consent') || '送信して協力する（同意）'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.crashDeclineBtn} onPress={() => handleCrashConsent('declined')} disabled={isSendingCrash}>
                <Text style={styles.crashDeclineBtnText}>{t('ui.crash_report.btn_decline') || '今回は送信しない（拒否）'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    width: '100%',
  },
  activeWorkoutContainer: {
    gap: 8,
  },
  workoutActiveTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 217, 100, 0.15)',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.success,
  },
  statusBadgeText: {
    color: Theme.colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  inactiveWorkoutContainer: {
    gap: 6,
  },
  inactiveText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  statVal: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 6,
  },
  statUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: Theme.colors.textMuted,
  },
  statGoal: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Theme.spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBtn: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  presetBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownList: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownName: {
    color: '#fff',
    fontSize: 14,
  },
  breakdownTime: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  habitList: {
    gap: 10,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  habitMainClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 12,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  habitColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  habitName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  habitActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  habitAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(233, 30, 99, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.4)',
  },
  routineSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)',
  },
  routineSummaryText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  routineCompletedCount: {
    color: '#4caf50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  muscleVolumeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  muscleVolumeText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Theme.colors.card, width: '100%', borderRadius: Theme.borderRadius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 12, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: Theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtnContainer: { width: '100%', gap: 12 },
  unitBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center' },
  unitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  styleOptionCard: { backgroundColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border, width: '100%' },
  styleOptionIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(79, 172, 254, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  styleOptionTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  styleOptionDesc: { fontSize: 12, color: Theme.colors.textMuted, lineHeight: 18 },
  styleOnboardingHint: { fontSize: 12, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 24, lineHeight: 18, paddingHorizontal: 12 },
  crashConsentBtn: { backgroundColor: '#007aff', paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center', width: '100%', justifyContent: 'center' },
  crashConsentBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  crashDeclineBtn: { backgroundColor: '#121212', paddingVertical: 12, borderRadius: Theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: '#262626', width: '100%', justifyContent: 'center' },
  crashDeclineBtnText: { color: '#555555', fontSize: 14, fontWeight: 'bold' },

  // P-Point Status Bar
  pointStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  pointStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointStatusLabel: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  manageFeaturesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
  },
  manageFeaturesLinkText: {
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: '600',
  },

  // Unlock CTA Card
  unlockCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  unlockCtaIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unlockCtaTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  unlockCtaBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  unlockCtaBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  unlockCtaDesc: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    lineHeight: 15,
    marginTop: 3,
  },
});
