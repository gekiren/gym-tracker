import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { Confetti } from '../Confetti';

interface CompletionHeaderProps {
  title: string;
  durationMin: number | null;
  calories: number | null;
  t: (key: string) => string;
}

export const CompletionHeader: React.FC<CompletionHeaderProps> = React.memo(({ title, durationMin, calories, t }) => {
  return (
    <>
      <Confetti />
      <View style={styles.congratsContainer}>
        <View style={styles.iconWrapper}>
          <Ionicons name="trophy" size={64} color="#ffd700" />
        </View>
        <Text style={styles.congratsTitle}>{t('ui.workout_completion.title')}</Text>
        <Text style={styles.congratsSubtitle}>{title}</Text>
      </View>

      <View style={styles.metaRow}>
        {durationMin !== null && (
          <View style={styles.metaBadge}>
            <Ionicons name="time" size={16} color={Theme.colors.primary} />
            <Text style={styles.metaBadgeText}>
              {durationMin} {t('ui.common.min_unit')}
            </Text>
          </View>
        )}
        {calories !== null && calories > 0 && (
          <View style={styles.metaBadge}>
            <Ionicons name="flame" size={16} color="#ff5722" />
            <Text style={styles.metaBadgeText}>{calories} kcal</Text>
          </View>
        )}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  congratsContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: Theme.spacing.lg,
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  congratsTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: Theme.spacing.xs,
    letterSpacing: 1.2,
  },
  congratsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: Theme.spacing.lg,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metaBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
