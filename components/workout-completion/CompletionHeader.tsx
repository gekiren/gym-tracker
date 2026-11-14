import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { Confetti } from '../Confetti';

interface CompletionHeaderProps {
  title: string;
  durationMin: number | null;
  calories: number | null;
  t: (key: string) => string;
}

export const CompletionHeader: React.FC<CompletionHeaderProps> = React.memo(({ title, durationMin, calories, t }) => {
  const { colors } = useAppTheme();

  return (
    <>
      <Confetti />
      <View style={styles.congratsContainer}>
        <View style={styles.iconWrapper}>
          <Ionicons name="trophy" size={64} color="#ffd700" />
        </View>
        <Text style={[styles.congratsTitle, { color: colors.text }]}>{t('ui.workout_completion.title')}</Text>
        <Text style={[styles.congratsSubtitle, { color: colors.textMuted }]}>{title}</Text>
      </View>

      <View style={styles.metaRow}>
        {durationMin !== null && (
          <View style={[styles.metaBadge, { borderColor: colors.border }]}>
            <Ionicons name="time" size={16} color={colors.primary} />
            <Text style={[styles.metaBadgeText, { color: colors.text }]}>
              {durationMin} {t('ui.common.min_unit')}
            </Text>
          </View>
        )}
        {calories !== null && calories > 0 && (
          <View style={[styles.metaBadge, { borderColor: colors.border }]}>
            <Ionicons name="flame" size={16} color="#ff5722" />
            <Text style={[styles.metaBadgeText, { color: colors.text }]}>{calories} kcal</Text>
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
    marginBottom: 24,
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  congratsTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 1.2,
  },
  congratsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
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
  },
  metaBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

CompletionHeader.displayName = 'CompletionHeader';
