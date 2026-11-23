import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/theme';
import { useSettingsStore, FeatureId } from '../src/store/settingsStore';
import { useFeatureUnlockStore, isFeatureUnlockedHelper } from '../src/store/featureUnlockStore';
import { ALL_FEATURE_IDS, getUnlockCost } from '../src/constants/featureUnlockConstants';
import { InitialFeatureSelectModal } from '../components/InitialFeatureSelectModal';
import { FeatureUnlockModal } from '../components/FeatureUnlockModal';
import { OnboardingModals } from '../components/OnboardingModals';
import { ClassStatusBar } from '../components/ClassStatusBar';
import { useLifelogStore } from '../src/store/lifelogStore';
import { useNutritionStore } from '../src/store/nutritionStore';
import { useBodyStore } from '../src/store/bodyStore';
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

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Settings Store
  const settings = useSettingsStore(state => state.settings);
  const featureOrder = useSettingsStore(state => state.settings.featureOrder);
  const featureVisibility = useSettingsStore(state => state.settings.featureVisibility);

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

  // 9月13日データの自動救出・復元
  useEffect(() => {
    (async () => {
      try {
        const res = await rescueSeptember13Data();
        if (res.rescued) {
          const targetDate = useLifelogStore.getState().resolveActiveDate();
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
      const targetDate = useLifelogStore.getState().resolveActiveDate();
      setCurrentDate(targetDate);
      loadMealLogs(targetDate);
      loadGoals();
      loadBodyData(targetDate.replace(/\//g, '-'));
    }, [currentDate, loadMealLogs, loadGoals, loadBodyData, setCurrentDate])
  );

  const renderFeatureCard = (id: FeatureId) => {
    switch (id) {
      case 'workout': return <WorkoutCard key="workout" />;
      case 'body': return <BodyCard key="body" />;
      case 'water': return <WaterCard key="water" />;
      case 'nutrition': return <NutritionCard key="nutrition" />;
      case 'zikan': return <TimeCard key="zikan" />;
      case 'habit': return <HabitCard key="habit" />;
      case 'routine': return <RoutineCard key="routine" />;
      default: return null;
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Date Switcher Header */}
      <LifelogDateHeader style={{ paddingTop: insets.top + 16, paddingBottom: 16 }} type="workout" />

      {/* Overall Class, XP & P-Points Status Bar */}
      <ClassStatusBar isLoading={isLoadingLifelog} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Dynamic Feature Cards List */}
        {(() => {
          const activeOrder: FeatureId[] = featureOrder && featureOrder.length > 0
            ? featureOrder
            : ['workout', 'body', 'water', 'nutrition', 'zikan', 'routine', 'habit'];

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
              'データ出力・共有、バックアップ、機能管理、外部サービス連携などを操作できます。'}
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

      <OnboardingModals />
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
