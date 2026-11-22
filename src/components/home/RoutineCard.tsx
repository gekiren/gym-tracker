import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '../../theme';
import { useLifelogStore } from '../../store/lifelogStore';
import { HomeCard } from './HomeCard';

export const RoutineCard = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const daySummary = useLifelogStore(state => state.daySummary);

  return (
    <HomeCard
      title={t('ui.home.card_routines') || 'ルーティン管理'}
      iconName="repeat"
      iconColor="#4caf50"
      iconBgColor="rgba(76, 175, 80, 0.15)"
      gamificationFeatureId="routine"
      onPress={() => router.push('/lifelog/routine')}
    >
      <View style={styles.routineSummaryRow}>
        <Ionicons
          name="checkmark-done-circle-outline"
          size={20}
          color="#4caf50"
          style={styles.summaryIcon}
        />
        <Text style={[styles.routineSummaryText, { color: colors.text }]}>
          {t('ui.home.completed_routines') || '完了したルーティン:'}
        </Text>
      </View>
      {daySummary?.completedRoutineNames && daySummary.completedRoutineNames.length > 0 ? (
        <View style={styles.listContainer}>
          {daySummary.completedRoutineNames.map((name, index) => (
            <View key={index} style={styles.listItemRow}>
              <Ionicons name="checkmark" size={16} color="#4caf50" style={styles.itemIcon} />
              <Text style={[styles.itemText, { color: colors.text }]}>{name}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.listContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('ui.home.none') || 'なし'}
          </Text>
        </View>
      )}
    </HomeCard>
  );
};

const styles = StyleSheet.create({
  routineSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    marginRight: 8,
  },
  routineSummaryText: {
    fontSize: 15,
    fontWeight: '500',
  },
  listContainer: {
    marginTop: 8,
    paddingLeft: 24,
    gap: 4,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 8,
  },
  itemText: {
    fontSize: 15,
  },
  emptyText: {
    fontSize: 14,
  },
});
