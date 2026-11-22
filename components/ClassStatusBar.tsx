import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/theme';
import { useGamificationStore } from '../src/store/gamificationStore';
import {
  ACHIEVEMENT_MEDALS,
  getOverallClassProgress,
  TIER_VISUAL_META,
} from '../src/constants/gamificationConstants';
import { PointBadge } from './PointBadge';

interface ClassStatusBarProps {
  isLoading?: boolean;
}

export const ClassStatusBar: React.FC<ClassStatusBarProps> = ({ isLoading = false }) => {
  const { colors } = useAppTheme();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const totalXp = useGamificationStore((state) => state.totalXp);
  const unlockedCount = useGamificationStore(
    (state) => Object.keys(state.unlockedMedals).length
  );

  const progress = getOverallClassProgress(totalXp);
  const tierMeta = TIER_VISUAL_META[progress.current.tier];
  const className = isEn ? progress.current.nameEn : progress.current.nameJa;
  const totalMedalCount = ACHIEVEMENT_MEDALS.length;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {/* Row 1: Overall Class Badge + PointBadge + Manage Features */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.classTrigger}
          onPress={() => router.push('/gamification' as any)}
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
              size={15}
              color={tierMeta.color}
              style={styles.tierIcon}
            />
            <Text style={[styles.tierText, { color: tierMeta.color }]} numberOfLines={1}>
              {className}
            </Text>
          </View>

          <View style={[styles.medalChip, { borderColor: colors.border }]}>
            <Ionicons name="ribbon" size={13} color="#ffd700" style={styles.medalIcon} />
            <Text style={[styles.medalText, { color: colors.text }]}>
              {unlockedCount}/{totalMedalCount}
            </Text>
          </View>

          {isLoading && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          )}
        </TouchableOpacity>

        <View style={styles.rightControls}>
          <PointBadge />
          <TouchableOpacity
            style={styles.manageFeaturesBtn}
            onPress={() => router.push('/settings/feature-management')}
            activeOpacity={0.75}
          >
            <Text style={[styles.manageFeaturesText, { color: colors.primary }]} numberOfLines={1}>
              {t('ui.home.manage_features_short') || '機能管理'}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 2: XP Progress Bar */}
      <TouchableOpacity
        style={styles.progressRow}
        onPress={() => router.push('/gamification' as any)}
        activeOpacity={0.75}
      >
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
        <Text style={[styles.xpLabel, { color: colors.textMuted }]} numberOfLines={1}>
          {progress.isMax
            ? `${totalXp.toLocaleString()} XP (MAX)`
            : `${totalXp.toLocaleString()} / ${progress.next!.minXp.toLocaleString()} XP`}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: 8,
  },
  classTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minHeight: 44,
    gap: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 1,
  },
  tierIcon: {
    marginRight: 5,
  },
  tierText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  medalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  medalIcon: {
    marginRight: 4,
  },
  medalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  spinner: {
    marginLeft: 2,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  manageFeaturesBtn: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
  },
  manageFeaturesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
