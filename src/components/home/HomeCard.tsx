import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../theme';
import { useGamificationStore } from '../../store/gamificationStore';
import { getFeatureClassForXp, TIER_VISUAL_META } from '../../constants/gamificationConstants';
import { GamificationFeatureId } from '../../types/gamification';

export interface HomeCardProps {
  title: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBgColor: string;
  gamificationFeatureId?: GamificationFeatureId;
  onPress?: () => void;
  onHeaderPress?: () => void;
  children: React.ReactNode;
}

/**
 * Shared dashboard card container providing consistent spacing, border radius,
 * header layout, and dynamic theme colors.
 */
export const HomeCard: React.FC<HomeCardProps> = ({
  title,
  iconName,
  iconColor,
  iconBgColor,
  gamificationFeatureId,
  onPress,
  onHeaderPress,
  children,
}) => {
  const { colors } = useAppTheme();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const featureXp = useGamificationStore((state) =>
    gamificationFeatureId ? (state.featureXp[gamificationFeatureId] ?? 0) : -1
  );

  const featureClass =
    featureXp >= 0 ? getFeatureClassForXp(featureXp, gamificationFeatureId) : null;
  const tierMeta = featureClass ? TIER_VISUAL_META[featureClass.tier] : null;

  const cardDynamicStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border,
  };

  const headerContent = (
    <>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={iconName} size={24} color={iconColor} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {featureClass && tierMeta && (
        <View
          style={[
            styles.classPill,
            { backgroundColor: tierMeta.bgColor, borderColor: tierMeta.borderColor },
          ]}
        >
          <Ionicons
            name={tierMeta.icon as keyof typeof Ionicons.glyphMap}
            size={11}
            color={tierMeta.color}
            style={{ marginRight: 3 }}
          />
          <Text style={[styles.classPillText, { color: tierMeta.color }]} numberOfLines={1}>
            {isEn ? featureClass.nameEn : featureClass.nameJa}
          </Text>
        </View>
      )}
      {(onPress || onHeaderPress) && (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, cardDynamicStyle]}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <View style={styles.cardHeader}>{headerContent}</View>
        <View style={styles.cardBody}>{children}</View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, cardDynamicStyle]}>
      {onHeaderPress ? (
        <TouchableOpacity
          style={[styles.cardHeader, styles.headerPressable]}
          activeOpacity={0.7}
          onPress={onHeaderPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {headerContent}
        </TouchableOpacity>
      ) : (
        <View style={styles.cardHeader}>{headerContent}</View>
      )}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerPressable: {
    minHeight: 44,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  classPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    width: '100%',
  },
});
