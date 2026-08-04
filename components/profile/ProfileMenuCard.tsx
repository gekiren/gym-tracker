import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { MenuItem } from '../../src/hooks/useProfile';

interface ProfileMenuCardProps {
  item: MenuItem;
  onPress: (route: string) => void;
}

export const ProfileMenuCard: React.FC<ProfileMenuCardProps> = React.memo(({ item, onPress }) => {
  return (
    <TouchableOpacity style={styles.menuCard} activeOpacity={0.7} onPress={() => onPress(item.route)}>
      <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}15` }]}>
        <Ionicons name={item.icon as any} size={26} color={item.iconColor} />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc}>{item.desc}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  cardContent: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 16,
  },
});
