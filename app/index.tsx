import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/theme';
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
import { saveSetting } from '../src/db/database';
import { deleteCrashLog } from '../src/services/crashReporterService';
import { rescueSeptember13Data } from '../src/services/rescueService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LifelogDateHeader } from '../components/LifelogDateHeader';

import { HomeCard } from '../src/components/home/HomeCard';
import { WorkoutCard } from '../src/components/home/WorkoutCard';
import { BodyCard } from '../src/components/home/BodyCard';
import { WaterCard } from '../src/components/home/WaterCard';
import { NutritionCard } from '../src/components/home/NutritionCard';
import { TimeCard } from '../src/components/home/TimeCard';
import { HabitCard } from '../src/components/home/HabitCard';
import { RoutineCard } from '../src/components/home/RoutineCard';
import { VoiceAiCard } from '../src/components/home/VoiceAiCard';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
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

  // 9月13日データの自動救出・復元
  useEffect(() => {
    (async () => {
      try {
        const res = await rescueSeptember13Data();
        if (res.rescued) {
          const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
          const targetDate = currentDate || today;
          setCurrentDate(targetDate);
          loadMealLogs(targetDate);
          loadGoals();
          loadBodyData(targetDate.replace(/\//g, '-'));
        }
      } catch (err) {
        console.warn('[RESCUE_20260913] Rescue execution failed:', err);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      const targetDate = currentDate || today;
      setCurrentDate(targetDate);
      loadMealLogs(targetDate);
      loadGoals();
      loadBodyData(targetDate.replace(/\//g, '-'));
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
      showVolume: isAdvanced,
    });

    loadSettings({ ...settings, needsStyleSelection: false });
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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Date Switcher Header */}
      <LifelogDateHeader style={{ paddingTop: insets.top + 16, paddingBottom: 16 }} type="workout" />

      {/* P-Points & Status Bar */}
      <View style={[styles.pointStatusBar, { borderBottomColor: colors.border }]}>
        <View style={styles.pointStatusLeft}>
          <Text style={[styles.pointStatusLabel, { color: colors.textMuted }]}>
            {t('ui.home.p_points_balance') || 'Pポイント残高:'}
          </Text>
          <PointBadge />
          {isLoadingLifelog && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loadingSpinner} />
          )}
        </View>
        <TouchableOpacity
          style={styles.manageFeaturesLink}
          onPress={() => router.push('/settings/feature-management')}
          activeOpacity={0.7}
        >
          <Text style={[styles.manageFeaturesLinkText, { color: colors.primary }]}>
            {t('ui.home.manage_features') || '機能の追加・管理'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="options-outline"
                  size={44}
                  color={colors.textMuted}
                  style={styles.emptyIcon}
                />
                <Text style={[styles.emptyCardText, { color: colors.textMuted }]}>
                  {t('ui.home.no_features_selected') || '表示される機能が選択されていません。'}
                  {'\n'}
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
            style={[styles.unlockCtaCard, { backgroundColor: colors.card }]}
            activeOpacity={0.8}
            onPress={() => router.push('/settings/feature-management')}
          >
            <View style={styles.unlockCtaIconBg}>
              <Ionicons name="key-outline" size={24} color="#ffd700" />
            </View>
            <View style={styles.unlockCtaContent}>
              <View style={styles.unlockCtaHeaderRow}>
                <Text style={[styles.unlockCtaTitle, { color: colors.text }]}>
                  {t('ui.home.unlock_new_features') || '新しい機能を開放する'}
                </Text>
                <View style={styles.unlockCtaBadge}>
                  <Text style={styles.unlockCtaBadgeText}>
                    {t('ui.home.remaining_features', { count: ALL_FEATURE_IDS.length - unlockedFeatures.length }) ||
                      `あと ${ALL_FEATURE_IDS.length - unlockedFeatures.length} 機能`}
                  </Text>
                </View>
              </View>
              <Text style={[styles.unlockCtaDesc, { color: colors.textMuted }]}>
                {t('ui.home.unlock_features_hint', { cost: getUnlockCost(unlockedFeatures.length) }) ||
                  `貯まった Pポイントを使って、好きな機能をアンロックできます（次: ${getUnlockCost(unlockedFeatures.length)} P）`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffd700" />
          </TouchableOpacity>
        )}

        {/* App Settings Access Card */}
        <HomeCard
          title={t('ui.home.card_settings') || 'アプリ設定'}
          iconName="settings-outline"
          iconColor={colors.primary}
          iconBgColor="rgba(79, 172, 254, 0.15)"
          onPress={() => router.push('/settings')}
        >
          <Text style={[styles.settingsDesc, { color: colors.textMuted }]}>
            {t('ui.home.settings_desc') ||
              'Gemini AI連携、データ出力・共有、バックアップ、機能管理などを操作できます。'}
          </Text>
        </HomeCard>
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
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="barbell" size={48} color={colors.primary} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('ui.home.onboarding_unit_title')}
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              {t('ui.home.onboarding_unit_desc')}
            </Text>
            <View style={styles.modalBtnContainer}>
              <TouchableOpacity
                style={[styles.unitBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleSelectUnit('kg')}
              >
                <Text style={styles.unitBtnText}>{t('ui.home.unit_kg_desc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleSelectUnit('lbs')}
              >
                <Text style={styles.unitBtnText}>{t('ui.home.unit_lbs_desc')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Onboarding Style Selection Modal */}
      <Modal visible={!settings.needsUnitSelection && settings.needsStyleSelection} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View
            style={[
              styles.modalCard,
              styles.modalCardWide,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="sparkles" size={48} color={colors.primary} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('ui.home.onboarding_style_title') || '記録スタイルを選択'}
            </Text>
            <Text style={[styles.modalDesc, styles.modalDescCompact, { color: colors.textMuted }]}>
              {t('ui.home.onboarding_style_desc') ||
                'ご自身のトレーニングレベルや好みに合わせて、画面に表示する記録項目を選んでください。'}
            </Text>

            <TouchableOpacity
              style={[styles.styleOptionCard, { borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('simple')}
            >
              <View style={styles.styleOptionIconBg}>
                <Ionicons name="document-text-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.styleOptionBody}>
                <Text style={[styles.styleOptionTitle, { color: colors.text }]}>
                  {t('ui.home.style_simple_title') || 'シンプル'}
                </Text>
                <Text style={[styles.styleOptionDesc, { color: colors.textMuted }]}>
                  {t('ui.home.style_simple_desc') ||
                    '表示項目を最小限に抑え、トレーニングの重量・回数記録だけに集中できるクリーンな表示です。'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.styleOptionCard, styles.styleOptionCardSpaced, { borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('advanced')}
            >
              <View style={[styles.styleOptionIconBg, styles.styleOptionIconBgAccent]}>
                <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.styleOptionBody}>
                <Text style={[styles.styleOptionTitle, { color: colors.text }]}>
                  {t('ui.home.style_advanced_title') || 'こだわり'}
                </Text>
                <Text style={[styles.styleOptionDesc, { color: colors.textMuted }]}>
                  {t('ui.home.style_advanced_desc') ||
                    'RPE(辛さ)やフォームのスタンス記録、自動1RM推定、合計ボリューム計算など、こだわりの機能をフル活用できます。'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={[styles.styleOnboardingHint, { color: colors.textMuted }]}>
              {t('ui.home.style_onboarding_hint') ||
                '※選択した内容は、後から設定（プロフィール）画面で個別にいつでもON/OFFを変更可能です。'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Onboarding & Startup Crash Consent Modal */}
      <Modal
        visible={!settings.needsUnitSelection && !settings.needsStyleSelection && settings.crashConsent === 'unset' && hasUnsentCrashLog}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalBg}>
          <View
            style={[
              styles.modalCard,
              styles.modalCardWide,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="bug-outline" size={48} color={colors.primary} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('ui.crash_report.title') || 'アプリ改善へのご協力のお願い'}
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              {t('ui.crash_report.message_detected') ||
                '前回の起動時にアプリが予期せず終了しました。品質向上のため、匿名のクラッシュレポートを送信してもよろしいですか？'}
            </Text>

            <View style={styles.modalBtnContainer}>
              <TouchableOpacity
                style={[styles.crashConsentBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleCrashConsent('agreed')}
                disabled={isSendingCrash}
              >
                {isSendingCrash ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.crashConsentBtnText}>
                    {t('ui.crash_report.btn_consent') || '送信して協力する（同意）'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.crashDeclineBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => handleCrashConsent('declined')}
                disabled={isSendingCrash}
              >
                <Text style={[styles.crashDeclineBtnText, { color: colors.textMuted }]}>
                  {t('ui.crash_report.btn_decline') || '今回は送信しない（拒否）'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyCardText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCardWide: {
    maxWidth: 450,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalDescCompact: {
    marginBottom: 20,
  },
  modalBtnContainer: {
    width: '100%',
    gap: 12,
  },
  unitBtn: {
    minHeight: 48,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  styleOptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  styleOptionCardSpaced: {
    marginTop: 12,
  },
  styleOptionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  styleOptionIconBgAccent: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
  },
  styleOptionBody: {
    flex: 1,
  },
  styleOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  styleOptionDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  styleOnboardingHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  crashConsentBtn: {
    minHeight: 48,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  crashConsentBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  crashDeclineBtn: {
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  crashDeclineBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // P-Point Status Bar
  pointStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
  },
  pointStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointStatusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingSpinner: {
    marginLeft: 4,
  },
  manageFeaturesLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
  },
  manageFeaturesLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Unlock CTA Card
  unlockCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  unlockCtaIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unlockCtaContent: {
    flex: 1,
    marginRight: 8,
  },
  unlockCtaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  unlockCtaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  unlockCtaBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  unlockCtaBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  unlockCtaDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
