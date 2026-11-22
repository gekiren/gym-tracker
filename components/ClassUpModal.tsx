import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/theme';
import { useGamificationStore } from '../src/store/gamificationStore';
import { FEATURE_DISPLAY_META, TIER_VISUAL_META } from '../src/constants/gamificationConstants';
import { Confetti } from './Confetti';

export const ClassUpModal: React.FC = () => {
  const { colors } = useAppTheme();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const pathname = usePathname();

  const pendingClassUp = useGamificationStore((state) => state.pendingClassUp);
  const clearPendingClassUp = useGamificationStore((state) => state.clearPendingClassUp);
  const pendingRetroactiveSummary = useGamificationStore(
    (state) => state.pendingRetroactiveSummary
  );
  const clearPendingRetroactiveSummary = useGamificationStore(
    (state) => state.clearPendingRetroactiveSummary
  );

  // ワークアウト完了画面表示中は広告（AdMob）と衝突しないよう保留する
  const isOnWorkoutCompletion = pathname === '/workout-completion';
  const showClassUp = !isOnWorkoutCompletion && Boolean(pendingClassUp);
  const showRetroSummary =
    !isOnWorkoutCompletion && !showClassUp && Boolean(pendingRetroactiveSummary);

  useEffect(() => {
    if (showClassUp) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [showClassUp]);

  if (!showClassUp && !showRetroSummary) {
    return null;
  }

  if (showClassUp && pendingClassUp) {
    const overallTier = pendingClassUp.overall
      ? TIER_VISUAL_META[pendingClassUp.overall.to.tier]
      : TIER_VISUAL_META[pendingClassUp.features[0]?.to.tier || 'gold'];

    const totalBonusPoints =
      (pendingClassUp.overall?.bonusPoints || 0) +
      pendingClassUp.features.reduce((sum, f) => sum + f.bonusPoints, 0);

    const handleClose = () => {
      clearPendingClassUp();
    };

    const handleViewDetails = () => {
      clearPendingClassUp();
      router.push('/gamification' as any);
    };

    return (
      <Modal visible={true} animationType="fade" transparent={true} onRequestClose={handleClose}>
        <View style={styles.modalBg}>
          <Confetti />

          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: overallTier.borderColor },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: overallTier.bgColor }]}>
              <Ionicons
                name={overallTier.icon as keyof typeof Ionicons.glyphMap}
                size={40}
                color={overallTier.color}
              />
            </View>

            <View
              style={[
                styles.badge,
                { backgroundColor: overallTier.bgColor, borderColor: overallTier.borderColor },
              ]}
            >
              <Ionicons name="sparkles" size={14} color={overallTier.color} style={{ marginRight: 4 }} />
              <Text style={[styles.badgeText, { color: overallTier.color }]}>CLASS UP!</Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {t('ui.gamification.class_up_title') || 'クラス昇格おめでとうございます！'}
            </Text>

            <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
              {pendingClassUp.overall && (
                <View style={[styles.promotionBox, { borderColor: overallTier.borderColor }]}>
                  <Text style={[styles.promotionKind, { color: colors.textMuted }]}>
                    {t('ui.gamification.overall_class') || '総合クラス'}
                  </Text>
                  <View style={styles.rankFlowRow}>
                    <Text style={[styles.rankFrom, { color: colors.textMuted }]}>
                      {isEn
                        ? pendingClassUp.overall.from.nameEn
                        : pendingClassUp.overall.from.nameJa}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={overallTier.color} />
                    <Text style={[styles.rankTo, { color: overallTier.color }]}>
                      {isEn ? pendingClassUp.overall.to.nameEn : pendingClassUp.overall.to.nameJa}
                    </Text>
                  </View>
                </View>
              )}

              {pendingClassUp.features.map((feat) => {
                const featMeta = FEATURE_DISPLAY_META[feat.featureId];
                const nextTier = TIER_VISUAL_META[feat.to.tier];
                return (
                  <View
                    key={feat.featureId}
                    style={[styles.promotionBox, { borderColor: nextTier.borderColor }]}
                  >
                    <View style={styles.featureHeaderRow}>
                      <Ionicons
                        name={featMeta.icon as keyof typeof Ionicons.glyphMap}
                        size={15}
                        color={featMeta.color}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.promotionKind, { color: colors.text }]}>
                        {isEn ? featMeta.titleEn : featMeta.titleJa}
                      </Text>
                    </View>
                    <View style={styles.rankFlowRow}>
                      <Text style={[styles.rankFrom, { color: colors.textMuted }]}>
                        {isEn ? feat.from.nameEn : feat.from.nameJa}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={nextTier.color} />
                      <Text style={[styles.rankTo, { color: nextTier.color }]}>
                        {isEn ? feat.to.nameEn : feat.to.nameJa}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {totalBonusPoints > 0 && (
                <View style={styles.bonusPill}>
                  <Ionicons name="diamond" size={16} color="#ffd700" style={{ marginRight: 6 }} />
                  <Text style={styles.bonusText}>
                    {t('ui.gamification.promotion_bonus', { points: totalBonusPoints }) ||
                      `昇格ボーナス +${totalBonusPoints} P 獲得！`}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleViewDetails}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>
                  {t('ui.gamification.view_classes_medals') || 'クラス＆実績を見る'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.closeBtn, { borderColor: colors.border }]}
                onPress={handleClose}
                activeOpacity={0.75}
              >
                <Text style={[styles.closeBtnText, { color: colors.text }]}>
                  {t('ui.gamification.close') || '閉じる'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // 初回レトロアクティブ反映サマリーモーダル
  if (showRetroSummary && pendingRetroactiveSummary) {
    const tierMeta = TIER_VISUAL_META[pendingRetroactiveSummary.overallClass.tier];
    const handleCloseRetro = () => {
      clearPendingRetroactiveSummary();
    };
    const handleOpenGamification = () => {
      clearPendingRetroactiveSummary();
      router.push('/gamification' as any);
    };

    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseRetro}
      >
        <View style={styles.modalBg}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: tierMeta.borderColor },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: tierMeta.bgColor }]}>
              <Ionicons
                name={tierMeta.icon as keyof typeof Ionicons.glyphMap}
                size={38}
                color={tierMeta.color}
              />
            </View>

            <View
              style={[
                styles.badge,
                { backgroundColor: tierMeta.bgColor, borderColor: tierMeta.borderColor },
              ]}
            >
              <Ionicons name="trophy" size={14} color={tierMeta.color} style={{ marginRight: 4 }} />
              <Text style={[styles.badgeText, { color: tierMeta.color }]}>
                {t('ui.gamification.retro_badge') || 'CLASS & MEDALS SYNCED'}
              </Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {t('ui.gamification.retro_title') || 'これまでの記録を反映しました！'}
            </Text>
            <Text style={[styles.retroDesc, { color: colors.textMuted }]}>
              {t('ui.gamification.retro_desc') ||
                '過去のトレーニングやライフログ実績から経験値・クラス・実績メダルを自動集計しました。'}
            </Text>

            <View style={[styles.retroSummaryBox, { borderColor: colors.border }]}>
              <View style={styles.retroStatRow}>
                <Text style={[styles.retroStatLabel, { color: colors.textMuted }]}>
                  {t('ui.gamification.overall_class') || '総合クラス'}
                </Text>
                <Text style={[styles.retroStatVal, { color: tierMeta.color }]}>
                  {isEn
                    ? pendingRetroactiveSummary.overallClass.nameEn
                    : pendingRetroactiveSummary.overallClass.nameJa}{' '}
                  ({pendingRetroactiveSummary.totalXp.toLocaleString()} XP)
                </Text>
              </View>
              <View style={styles.retroStatRow}>
                <Text style={[styles.retroStatLabel, { color: colors.textMuted }]}>
                  {t('ui.gamification.unlocked_medals') || '獲得メダル'}
                </Text>
                <Text style={[styles.retroStatVal, { color: colors.text }]}>
                  {pendingRetroactiveSummary.unlockedMedalCount} 個
                </Text>
              </View>
              {pendingRetroactiveSummary.totalBonusPoints > 0 && (
                <View style={styles.retroStatRow}>
                  <Text style={[styles.retroStatLabel, { color: colors.textMuted }]}>
                    {t('ui.gamification.bonus_points') || 'ボーナスPポイント'}
                  </Text>
                  <Text style={[styles.retroStatVal, { color: '#ffd700' }]}>
                    +{pendingRetroactiveSummary.totalBonusPoints} P
                  </Text>
                </View>
              )}
            </View>

            {pendingRetroactiveSummary.featureHighlights.length > 0 && (
              <View style={styles.chipsWrap}>
                {pendingRetroactiveSummary.featureHighlights.map((item) => {
                  const fMeta = FEATURE_DISPLAY_META[item.featureId];
                  const tMeta = TIER_VISUAL_META[item.classDef.tier];
                  return (
                    <View
                      key={item.featureId}
                      style={[
                        styles.featureChip,
                        { backgroundColor: tMeta.bgColor, borderColor: tMeta.borderColor },
                      ]}
                    >
                      <Text style={[styles.featureChipText, { color: tMeta.color }]}>
                        {isEn ? fMeta.titleEn : fMeta.titleJa}:{' '}
                        {isEn ? item.classDef.nameEn : item.classDef.nameJa}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleOpenGamification}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>
                  {t('ui.gamification.view_classes_medals') || 'クラス＆実績を見る'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.closeBtn, { borderColor: colors.border }]}
                onPress={handleCloseRetro}
                activeOpacity={0.75}
              >
                <Text style={[styles.closeBtnText, { color: colors.text }]}>
                  {t('ui.gamification.close') || '閉じる'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  listScroll: {
    width: '100%',
    maxHeight: 240,
    marginBottom: 16,
  },
  listContent: {
    gap: 10,
  },
  promotionBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promotionKind: {
    fontSize: 12,
    fontWeight: '600',
  },
  rankFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankFrom: {
    fontSize: 14,
    fontWeight: '600',
  },
  rankTo: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  bonusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.14)',
    borderColor: 'rgba(255, 215, 0, 0.38)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  bonusText: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  retroDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  retroSummaryBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  retroStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retroStatLabel: {
    fontSize: 12,
  },
  retroStatVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  featureChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  featureChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
