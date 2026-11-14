import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';

export interface HomeCardProps {
  title: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBgColor: string;
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
  onPress,
  onHeaderPress,
  children,
}) => {
  const { colors } = useAppTheme();

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
  cardBody: {
    width: '100%',
  },
});
