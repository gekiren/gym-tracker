import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/theme';
import { useGamificationStore } from '../src/store/gamificationStore';
import {
  getFeatureClassProgress,
  TIER_VISUAL_META,
} from '../src/constants/gamificationConstants';
import { GamificationFeatureId } from '../src/types/gamification';

interface FeatureClassBarProps {
  featureId: GamificationFeatureId;
}

/**
 * Compact 1-line status bar displaying the current feature-specific rank,
 * XP progress toward the next rank, and deep-link navigation to the feature modal.
 */
export const FeatureClassBar: React.FC<FeatureClassBarProps> = React.memo(({ featureId }) => {
  const { colors } = useAppTheme();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const featureXp = useGamificationStore((state) => state.featureXp[featureId] ?? 0);

  const progress = getFeatureClassProgress(featureXp, featureId);
  const tierMeta = TIER_VISUAL_META[progress.current.tier];
  const className = isEn ? progress.current.nameEn : progress.current.nameJa;

  const isMax = progress.isMax || !progress.next;
  const nextClassName = !isMax && progress.next
    ? (isEn ? progress.next.nameEn : progress.next.nameJa)
    : '';

  const nextLabel = isMax
    ? t('ui.gamification.max_rank_short') || (isEn ? 'MAX Rank' : '最高ランク')
    : t('ui.gamification.next_rank_short', { name: nextClassName }) ||
      (isEn ? `Next: ${nextClassName}` : `次: ${nextClassName}`);

  const xpText = isMax || !progress.next
    ? `${featureXp.toLocaleString()} XP (MAX)`
    : `${featureXp.toLocaleString()} / ${progress.next.minXp.toLocaleString()} XP`;

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={() => router.push({ pathname: '/gamification', params: { featureId } } as any)}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.tierBadge,
          { backgroundColor: tierMeta.bgColor, borderColor: tierMeta.borderColor },
        ]}
      >
        <Ionicons
          name={tierMeta.icon as keyof typeof Ionicons.glyphMap}
          size={13}
          color={tierMeta.color}
          style={styles.tierIcon}
        />
        <Text style={[styles.tierText, { color: tierMeta.color }]} numberOfLines={1}>
          {className}
        </Text>
      </View>

      <View style={styles.progressColumn}>
        <View style={styles.labelRow}>
          <Text
            style={[styles.nextLabel, { color: colors.textMuted }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {nextLabel}
          </Text>
          <Text style={[styles.xpLabel, { color: colors.textMuted }]} numberOfLines={1}>
            {xpText}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(progress.progressRatio * 100)}%`,
                backgroundColor: tierMeta.color,
              },
            ]}
          />
        </View>
      </View>

      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
});

FeatureClassBar.displayName = 'FeatureClassBar';

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    gap: 10,
  },
  tierBadge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierIcon: {
    marginRight: 4,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressColumn: {
    flex: 1,
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 0,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
