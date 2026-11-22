import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/theme';
import { useGamificationStore } from '../src/store/gamificationStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { refreshGamificationMetrics } from '../src/services/gamificationService';
import {
  ACHIEVEMENT_MEDALS,
  FEATURE_DISPLAY_META,
  GAMIFICATION_FEATURE_IDS,
  getFeatureClassesForFeature,
  getFeatureClassProgress,
  getOverallClassProgress,
  isGamificationFeatureId,
  MEDAL_RARITY_REWARDS,
  OVERALL_CLASSES,
  TIER_VISUAL_META,
  XP_REWARDS,
} from '../src/constants/gamificationConstants';
import {
  AchievementMedalDef,
  GamificationFeatureId,
  MedalCategory,
} from '../src/types/gamification';
import { PointBadge } from '../components/PointBadge';

type ActiveTab = 'features' | 'medals' | 'ranks';
type MedalFilter = 'all' | MedalCategory;

export default function GamificationScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const isFocused = useIsFocused();

  const totalXp = useGamificationStore((s) => s.totalXp);
  const featureXp = useGamificationStore((s) => s.featureXp);
  const unlockedMedals = useGamificationStore((s) => s.unlockedMedals);
  const metrics = useGamificationStore((s) => s.metrics);
  const recentXpHistory = useGamificationStore((s) => s.recentXpHistory);
  const featureOrder = useSettingsStore((s) => s.settings.featureOrder);

  const [activeTab, setActiveTab] = useState<ActiveTab>('features');
  const [medalFilter, setMedalFilter] = useState<MedalFilter>('all');
  const [selectedFeatureId, setSelectedFeatureId] = useState<GamificationFeatureId | null>(null);
  const [selectedMedal, setSelectedMedal] = useState<AchievementMedalDef | null>(null);

  useEffect(() => {
    if (isFocused) {
      refreshGamificationMetrics().catch((err) => {
        console.warn('[GamificationScreen] Failed to refresh metrics:', err);
      });
    }
  }, [isFocused]);

  const overallProgress = useMemo(() => getOverallClassProgress(totalXp), [totalXp]);
  const overallTierMeta = TIER_VISUAL_META[overallProgress.current.tier];
  const unlockedMedalCount = Object.keys(unlockedMedals).length;
  const totalMedalCount = ACHIEVEMENT_MEDALS.length;

  const orderedFeatures = useMemo(() => {
    const order = (featureOrder || []).filter(isGamificationFeatureId);
    const missing = GAMIFICATION_FEATURE_IDS.filter((id) => !order.includes(id));
    return [...order, ...missing];
  }, [featureOrder]);

  const filteredMedals = useMemo(() => {
    const list =
      medalFilter === 'all'
        ? ACHIEVEMENT_MEDALS
        : ACHIEVEMENT_MEDALS.filter((m) => m.category === medalFilter);
    return [...list].sort((a, b) => {
      const aUnlocked = unlockedMedals[a.id] !== undefined ? 1 : 0;
      const bUnlocked = unlockedMedals[b.id] !== undefined ? 1 : 0;
      return bUnlocked - aUnlocked;
    });
  }, [medalFilter, unlockedMedals]);

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  };

  const renderMedalCard = (medal: AchievementMedalDef) => {
    const unlockedAt = unlockedMedals[medal.id];
    const isUnlocked = unlockedAt !== undefined;
    const rarityMeta = MEDAL_RARITY_REWARDS[medal.rarity];
    const rawVal = metrics[medal.metricKey] ?? 0;
    const progressRatio = Math.min(1, Math.max(0, rawVal / medal.targetValue));
    const displayCurrent = Math.min(rawVal, medal.targetValue);

    return (
      <TouchableOpacity
        key={medal.id}
        style={[
          styles.medalCard,
          {
            backgroundColor: colors.card,
            borderColor: isUnlocked ? rarityMeta.color : colors.border,
            opacity: isUnlocked ? 1 : 0.85,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => setSelectedMedal(medal)}
      >
        <View
          style={[
            styles.medalIconBox,
            {
              backgroundColor: isUnlocked ? rarityMeta.bgColor : 'rgba(255,255,255,0.05)',
              borderColor: isUnlocked ? rarityMeta.color : colors.border,
            },
          ]}
        >
          <Ionicons
            name={medal.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={isUnlocked ? rarityMeta.color : colors.textMuted}
          />
        </View>

        <View style={styles.medalContent}>
          <View style={styles.medalTopRow}>
            <Text style={[styles.medalTitle, { color: colors.text }]} numberOfLines={1}>
              {isEn ? medal.titleEn : medal.titleJa}
            </Text>
            <View
              style={[
                styles.rarityPill,
                { backgroundColor: rarityMeta.bgColor, borderColor: rarityMeta.color },
              ]}
            >
              <Text style={[styles.rarityText, { color: rarityMeta.color }]}>
                {isEn ? rarityMeta.labelEn : rarityMeta.labelJa}
              </Text>
            </View>
          </View>

          <Text style={[styles.medalDesc, { color: colors.textMuted }]} numberOfLines={2}>
            {isEn ? medal.descEn : medal.descJa}
          </Text>

          <View style={styles.medalBottomRow}>
            <View style={styles.medalProgressWrap}>
              <View style={styles.miniTrack}>
                <View
                  style={[
                    styles.miniFill,
                    {
                      width: `${Math.round(progressRatio * 100)}%`,
                      backgroundColor: isUnlocked ? rarityMeta.color : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.medalProgressText, { color: colors.textMuted }]}>
                {displayCurrent.toLocaleString()} / {medal.targetValue.toLocaleString()}{' '}
                {isEn ? medal.unitEn : medal.unitJa}
              </Text>
            </View>

            {isUnlocked ? (
              <View style={styles.unlockedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.unlockedDate, { color: colors.success }]}>
                  {formatTimestamp(unlockedAt)}
                </Text>
              </View>
            ) : (
              <Text style={styles.rewardPreview}>
                +{rarityMeta.xp}XP / +{rarityMeta.points}P
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top + 8, 16),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('ui.gamification.screen_title') || 'クラス＆実績メダル'}
        </Text>
        <PointBadge />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Overall Hero Card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: overallTierMeta.borderColor },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.heroEmblem,
                {
                  backgroundColor: overallTierMeta.bgColor,
                  borderColor: overallTierMeta.borderColor,
                },
              ]}
            >
              <Ionicons
                name={overallTierMeta.icon as keyof typeof Ionicons.glyphMap}
                size={32}
                color={overallTierMeta.color}
              />
            </View>

            <View style={styles.heroInfo}>
              <Text style={[styles.heroEyebrow, { color: colors.textMuted }]}>
                {t('ui.gamification.overall_class') || '総合クラス'}
              </Text>
              <Text style={[styles.heroClassName, { color: overallTierMeta.color }]}>
                {isEn ? overallProgress.current.nameEn : overallProgress.current.nameJa}
              </Text>
              <Text style={[styles.heroXpText, { color: colors.text }]}>
                {totalXp.toLocaleString()} XP
              </Text>
            </View>

            <View style={[styles.heroMedalBox, { borderColor: colors.border }]}>
              <Ionicons name="ribbon" size={18} color="#ffd700" />
              <Text style={[styles.heroMedalCount, { color: colors.text }]}>
                {unlockedMedalCount}/{totalMedalCount}
              </Text>
              <Text style={[styles.heroMedalSub, { color: colors.textMuted }]}>
                {t('ui.gamification.medals_label') || 'メダル'}
              </Text>
            </View>
          </View>

          <View style={styles.heroProgressTrack}>
            <View
              style={[
                styles.heroProgressFill,
                {
                  width: `${Math.round(overallProgress.progressRatio * 100)}%`,
                  backgroundColor: overallTierMeta.color,
                },
              ]}
            />
          </View>

          <View style={styles.heroFooterRow}>
            <Text style={[styles.heroFooterText, { color: colors.textMuted }]}>
              {overallProgress.isMax
                ? t('ui.gamification.max_rank_reached') || '最高クラスに到達しました！'
                : isEn
                  ? `Next: ${overallProgress.next!.nameEn} (${overallProgress.remainingXp.toLocaleString()} XP left)`
                  : `次のクラス「${overallProgress.next!.nameJa}」まであと ${overallProgress.remainingXp.toLocaleString()} XP`}
            </Text>
            {!overallProgress.isMax && overallProgress.next!.promotionBonusPoints > 0 && (
              <Text style={styles.nextBonusText}>
                +{overallProgress.next!.promotionBonusPoints} P
              </Text>
            )}
          </View>
        </View>

        {/* Segment Tab Bar */}
        <View
          style={[
            styles.tabBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {(
            [
              { key: 'features', label: t('ui.gamification.tab_features') || '機能別クラス' },
              { key: 'medals', label: t('ui.gamification.tab_medals') || '実績メダル' },
              { key: 'ranks', label: t('ui.gamification.tab_ranks') || '総合ランク＆履歴' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabBtn,
                  active && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: active ? '#ffffff' : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab 1: Per-Feature Classes */}
        {activeTab === 'features' && (
          <View style={styles.sectionList}>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              {t('ui.gamification.features_hint') ||
                '各機能をタップすると8段階ロードマップと関連メダルを確認できます。'}
            </Text>
            {orderedFeatures.map((fid) => {
              const fMeta = FEATURE_DISPLAY_META[fid];
              const xp = featureXp[fid] || 0;
              const prog = getFeatureClassProgress(xp, fid);
              const tMeta = TIER_VISUAL_META[prog.current.tier];
              const fMedals = ACHIEVEMENT_MEDALS.filter((m) => m.featureId === fid);
              const fUnlocked = fMedals.filter((m) => unlockedMedals[m.id] !== undefined).length;

              return (
                <TouchableOpacity
                  key={fid}
                  style={[
                    styles.featureCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedFeatureId(fid)}
                >
                  <View style={styles.featureCardHeader}>
                    <View style={[styles.featureIconCircle, { backgroundColor: fMeta.bgColor }]}>
                      <Ionicons
                        name={fMeta.icon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={fMeta.color}
                      />
                    </View>
                    <View style={styles.featureTitleCol}>
                      <Text style={[styles.featureTitle, { color: colors.text }]}>
                        {isEn ? fMeta.titleEn : fMeta.titleJa}
                      </Text>
                      <Text style={[styles.featureMetaText, { color: colors.textMuted }]}>
                        {xp.toLocaleString()} XP ・ {isEn ? 'Medals' : 'メダル'} {fUnlocked}/
                        {fMedals.length}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.classPill,
                        { backgroundColor: tMeta.bgColor, borderColor: tMeta.borderColor },
                      ]}
                    >
                      <Ionicons
                        name={tMeta.icon as keyof typeof Ionicons.glyphMap}
                        size={13}
                        color={tMeta.color}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.classPillText, { color: tMeta.color }]}>
                        {isEn ? prog.current.nameEn : prog.current.nameJa}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                      style={{ marginLeft: 4 }}
                    />
                  </View>

                  <View style={styles.featureProgressRow}>
                    <View style={styles.miniTrack}>
                      <View
                        style={[
                          styles.miniFill,
                          {
                            width: `${Math.round(prog.progressRatio * 100)}%`,
                            backgroundColor: tMeta.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.featureNextText, { color: colors.textMuted }]}>
                      {prog.isMax
                        ? 'MAX'
                        : isEn
                          ? `${prog.remainingXp.toLocaleString()} XP to ${prog.next!.nameEn}`
                          : `${prog.next!.nameJa}まで ${prog.remainingXp.toLocaleString()} XP`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Tab 2: Achievement Medals */}
        {activeTab === 'medals' && (
          <View style={styles.sectionList}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsRow}
            >
              {(
                [
                  { key: 'all', label: t('ui.gamification.filter_all') || 'すべて' },
                  { key: 'workout', label: t('ui.gamification.filter_workout') || '筋トレ' },
                  { key: 'pr_mastery', label: t('ui.gamification.filter_pr') || 'PR・種目' },
                  { key: 'streak', label: t('ui.gamification.filter_streak') || '継続' },
                  { key: 'lifelog', label: t('ui.gamification.filter_lifelog') || 'ライフログ' },
                  { key: 'milestone', label: t('ui.gamification.filter_milestone') || '総合' },
                ] as const
              ).map((chip) => {
                const selected = medalFilter === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setMedalFilter(chip.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: selected ? '#ffffff' : colors.textMuted },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.medalsList}>{filteredMedals.map(renderMedalCard)}</View>
          </View>
        )}

        {/* Tab 3: Overall Class Roadmap, XP Rules & Recent History */}
        {activeTab === 'ranks' && (
          <View style={styles.sectionList}>
            {/* XP Rules */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.infoCardTitle, { color: colors.text }]}>
                {t('ui.gamification.xp_rules_title') || '経験値（XP）の獲得方法'}
              </Text>
              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.textMuted }]}>
                  {t('ui.gamification.rule_workout') || 'ワークアウト完了'}
                </Text>
                <Text style={[styles.ruleVal, { color: colors.primary }]}>
                  +{XP_REWARDS.WORKOUT_COMPLETE} XP
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.textMuted }]}>
                  {t('ui.gamification.rule_pr') || '自己ベスト（PR）更新'}
                </Text>
                <Text style={[styles.ruleVal, { color: colors.primary }]}>
                  +{XP_REWARDS.PR_UPDATE_BONUS} XP
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.textMuted }]}>
                  {t('ui.gamification.rule_daily') || 'ライフログ各機能のデイリー初記録'}
                </Text>
                <Text style={[styles.ruleVal, { color: colors.primary }]}>
                  +{XP_REWARDS.DAILY_RECORD} XP
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.textMuted }]}>
                  {t('ui.gamification.rule_first') || '各機能の初記録ボーナス'}
                </Text>
                <Text style={[styles.ruleVal, { color: colors.primary }]}>
                  +{XP_REWARDS.FIRST_RECORD_BONUS} XP
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Text style={[styles.ruleLabel, { color: colors.textMuted }]}>
                  {t('ui.gamification.rule_medal') || '実績メダル解除'}
                </Text>
                <Text style={[styles.ruleVal, { color: '#ffd700' }]}>+50〜700 XP / +2〜20 P</Text>
              </View>
            </View>

            {/* Overall Roadmap */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.infoCardTitle, { color: colors.text }]}>
                {t('ui.gamification.overall_roadmap') || '総合クラス一覧（全21階級）'}
              </Text>
              {OVERALL_CLASSES.map((cls) => {
                const tMeta = TIER_VISUAL_META[cls.tier];
                const isCurrent = cls.rankIndex === overallProgress.current.rankIndex;
                const isReached = totalXp >= cls.minXp;
                return (
                  <View
                    key={cls.id}
                    style={[
                      styles.roadmapRow,
                      {
                        borderColor: isCurrent ? tMeta.color : 'transparent',
                        backgroundColor: isCurrent ? tMeta.bgColor : 'transparent',
                      },
                    ]}
                  >
                    <Ionicons
                      name={tMeta.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={isReached ? tMeta.color : colors.textMuted}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.roadmapName,
                        { color: isReached ? tMeta.color : colors.textMuted },
                      ]}
                    >
                      {isEn ? cls.nameEn : cls.nameJa}
                    </Text>
                    <Text style={[styles.roadmapXp, { color: colors.textMuted }]}>
                      {cls.minXp.toLocaleString()} XP〜
                    </Text>
                    {cls.promotionBonusPoints > 0 && (
                      <Text style={styles.roadmapBonus}>+{cls.promotionBonusPoints}P</Text>
                    )}
                    {isCurrent && (
                      <View style={[styles.currentTag, { backgroundColor: tMeta.color }]}>
                        <Text style={styles.currentTagText}>NOW</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Recent XP History */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.infoCardTitle, { color: colors.text }]}>
                {t('ui.gamification.recent_xp') || '最近の獲得XP履歴'}
              </Text>
              {recentXpHistory.length === 0 ? (
                <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>
                  {t('ui.gamification.no_xp_history') ||
                    'まだXP履歴がありません。トレーニングやライフログを記録して経験値を獲得しましょう。'}
                </Text>
              ) : (
                recentXpHistory.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.historyRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.historyLabel, { color: colors.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                        {formatTimestamp(item.timestamp)}
                      </Text>
                    </View>
                    <Text style={[styles.historyAmount, { color: colors.primary }]}>
                      +{item.amount} XP
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Feature Class Detail Modal */}
      <Modal
        visible={selectedFeatureId !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedFeatureId(null)}
      >
        {selectedFeatureId && (() => {
          const fMeta = FEATURE_DISPLAY_META[selectedFeatureId];
          const xp = featureXp[selectedFeatureId] || 0;
          const prog = getFeatureClassProgress(xp, selectedFeatureId);
          const tMeta = TIER_VISUAL_META[prog.current.tier];
          const featureClassRoadmap = getFeatureClassesForFeature(selectedFeatureId);
          const featureMedals = ACHIEVEMENT_MEDALS.filter((m) => m.featureId === selectedFeatureId);

          return (
            <View style={styles.modalBg}>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: colors.card, borderColor: tMeta.borderColor },
                ]}
              >
                <View style={styles.modalTopHeader}>
                  <View style={[styles.featureIconCircle, { backgroundColor: fMeta.bgColor }]}>
                    <Ionicons
                      name={fMeta.icon as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={fMeta.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {isEn ? fMeta.titleEn : fMeta.titleJa}
                    </Text>
                    <Text style={[styles.modalSubTitle, { color: tMeta.color }]}>
                      {isEn ? prog.current.nameEn : prog.current.nameJa} ({xp.toLocaleString()} XP)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedFeatureId(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} contentContainerStyle={{ gap: 12 }}>
                  <View style={styles.modalSubSection}>
                    <Text style={[styles.modalSubSectionTitle, { color: colors.text }]}>
                      {isEn ? 'Class Roadmap (8 Tiers)' : '機能クラス段階（全8ティア）'}
                    </Text>
                    {featureClassRoadmap.map((cls) => {
                      const clsTier = TIER_VISUAL_META[cls.tier];
                      const isReached = xp >= cls.minXp;
                      const isCurrent = cls.rankIndex === prog.current.rankIndex;
                      return (
                        <View
                          key={cls.id}
                          style={[
                            styles.roadmapRow,
                            {
                              borderColor: isCurrent ? clsTier.color : 'transparent',
                              backgroundColor: isCurrent ? clsTier.bgColor : 'transparent',
                            },
                          ]}
                        >
                          <Ionicons
                            name={clsTier.icon as keyof typeof Ionicons.glyphMap}
                            size={16}
                            color={isReached ? clsTier.color : colors.textMuted}
                            style={{ marginRight: 8 }}
                          />
                          <Text
                            style={[
                              styles.roadmapName,
                              { color: isReached ? clsTier.color : colors.textMuted },
                            ]}
                          >
                            {isEn ? cls.nameEn : cls.nameJa}
                          </Text>
                          <Text style={[styles.roadmapXp, { color: colors.textMuted }]}>
                            {cls.minXp.toLocaleString()} XP〜
                          </Text>
                          {cls.promotionBonusPoints > 0 && (
                            <Text style={styles.roadmapBonus}>+{cls.promotionBonusPoints}P</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.modalSubSection}>
                    <Text style={[styles.modalSubSectionTitle, { color: colors.text }]}>
                      {isEn ? 'Related Medals' : '関連実績メダル'}
                    </Text>
                    {featureMedals.map((medal) => {
                      const isUnlocked = unlockedMedals[medal.id] !== undefined;
                      const rarity = MEDAL_RARITY_REWARDS[medal.rarity];
                      const val = Math.min(metrics[medal.metricKey] ?? 0, medal.targetValue);
                      return (
                        <View
                          key={medal.id}
                          style={[
                            styles.modalMedalRow,
                            { borderColor: isUnlocked ? rarity.color : colors.border },
                          ]}
                        >
                          <Ionicons
                            name={
                              isUnlocked
                                ? 'checkmark-circle'
                                : (medal.icon as keyof typeof Ionicons.glyphMap)
                            }
                            size={18}
                            color={isUnlocked ? rarity.color : colors.textMuted}
                            style={{ marginRight: 8 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.modalMedalName, { color: colors.text }]}>
                              {isEn ? medal.titleEn : medal.titleJa}
                            </Text>
                            <Text style={[styles.modalMedalDesc, { color: colors.textMuted }]}>
                              {isEn ? medal.descEn : medal.descJa} ({val}/{medal.targetValue})
                            </Text>
                          </View>
                          <Text style={[styles.rewardPreview, { color: rarity.color }]}>
                            +{rarity.xp}XP
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedFeatureId(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseBtnText}>{t('ui.gamification.close') || '閉じる'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* Medal Detail Modal */}
      <Modal
        visible={selectedMedal !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedMedal(null)}
      >
        {selectedMedal && (() => {
          const unlockedAt = unlockedMedals[selectedMedal.id];
          const isUnlocked = unlockedAt !== undefined;
          const rarity = MEDAL_RARITY_REWARDS[selectedMedal.rarity];
          const rawVal = metrics[selectedMedal.metricKey] ?? 0;
          const progressRatio = Math.min(1, Math.max(0, rawVal / selectedMedal.targetValue));
          const displayCurrent = Math.min(rawVal, selectedMedal.targetValue);

          return (
            <View style={styles.modalBg}>
              <View
                style={[
                  styles.medalModalCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isUnlocked ? rarity.color : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.medalModalIconCircle,
                    {
                      backgroundColor: isUnlocked ? rarity.bgColor : 'rgba(255,255,255,0.05)',
                      borderColor: isUnlocked ? rarity.color : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={selectedMedal.icon as keyof typeof Ionicons.glyphMap}
                    size={36}
                    color={isUnlocked ? rarity.color : colors.textMuted}
                  />
                </View>

                <View
                  style={[
                    styles.rarityPill,
                    { backgroundColor: rarity.bgColor, borderColor: rarity.color, marginBottom: 8 },
                  ]}
                >
                  <Text style={[styles.rarityText, { color: rarity.color }]}>
                    {isEn ? rarity.labelEn : rarity.labelJa}
                  </Text>
                </View>

                <Text style={[styles.medalModalTitle, { color: colors.text }]}>
                  {isEn ? selectedMedal.titleEn : selectedMedal.titleJa}
                </Text>
                <Text style={[styles.medalModalDesc, { color: colors.textMuted }]}>
                  {isEn ? selectedMedal.descEn : selectedMedal.descJa}
                </Text>

                <View style={styles.medalModalStats}>
                  <View style={styles.miniTrack}>
                    <View
                      style={[
                        styles.miniFill,
                        {
                          width: `${Math.round(progressRatio * 100)}%`,
                          backgroundColor: isUnlocked ? rarity.color : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.medalProgressText, { color: colors.text }]}>
                    {displayCurrent.toLocaleString()} / {selectedMedal.targetValue.toLocaleString()}{' '}
                    {isEn ? selectedMedal.unitEn : selectedMedal.unitJa}
                  </Text>
                </View>

                <View style={[styles.medalRewardBox, { borderColor: colors.border }]}>
                  <Text style={[styles.medalRewardLabel, { color: colors.textMuted }]}>
                    {isEn ? 'Unlock Reward' : '獲得報酬'}
                  </Text>
                  <Text style={styles.medalRewardVal}>
                    +{rarity.xp} XP  /  +{rarity.points} P
                  </Text>
                  {isUnlocked && (
                    <Text style={[styles.unlockedDate, { color: colors.success, marginTop: 4 }]}>
                      {isEn ? 'Unlocked on ' : '解除日: '}
                      {formatTimestamp(unlockedAt)}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.primary, width: '100%' }]}
                  onPress={() => setSelectedMedal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseBtnText}>{t('ui.gamification.close') || '閉じる'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  heroEmblem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 12,
    marginBottom: 2,
  },
  heroClassName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  heroXpText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroMedalBox: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  heroMedalCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  heroMedalSub: {
    fontSize: 11,
  },
  heroProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  heroFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroFooterText: {
    fontSize: 12,
    flex: 1,
  },
  nextBonusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffd700',
    marginLeft: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionList: {
    gap: 12,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  featureCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitleCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  featureMetaText: {
    fontSize: 12,
  },
  classPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  classPillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  featureProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 3,
  },
  featureNextText: {
    fontSize: 11,
    minWidth: 96,
    textAlign: 'right',
  },
  filterChipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  medalsList: {
    gap: 10,
  },
  medalCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  medalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medalContent: {
    flex: 1,
    gap: 4,
  },
  medalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  medalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  rarityPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  medalDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  medalBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  medalProgressWrap: {
    flex: 1,
    gap: 3,
  },
  medalProgressText: {
    fontSize: 11,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unlockedDate: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  rewardPreview: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleLabel: {
    fontSize: 13,
    flex: 1,
  },
  ruleVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  roadmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  roadmapName: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  roadmapXp: {
    fontSize: 12,
    marginRight: 8,
  },
  roadmapBonus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffd700',
    marginRight: 6,
  },
  currentTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentTagText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyHistoryText: {
    fontSize: 13,
    lineHeight: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  historyLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalSubTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 360,
  },
  modalSubSection: {
    gap: 6,
  },
  modalSubSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalMedalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalMedalName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalMedalDesc: {
    fontSize: 11,
  },
  modalCloseBtn: {
    minHeight: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  medalModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  medalModalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  medalModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  medalModalDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  medalModalStats: {
    width: '100%',
    gap: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  medalRewardBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  medalRewardLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  medalRewardVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffd700',
  },
});
