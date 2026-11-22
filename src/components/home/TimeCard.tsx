import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '../../theme';
import { useLifelogStore } from '../../store/lifelogStore';
import { HomeCard } from './HomeCard';

export const TimeCard = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const daySummary = useLifelogStore(state => state.daySummary);

  return (
    <HomeCard
      title={t('ui.home.card_time') || '24時間管理'}
      iconName="time"
      iconColor="#ff9800"
      iconBgColor="rgba(255, 152, 0, 0.15)"
      gamificationFeatureId="zikan"
      onPress={() => router.push('/lifelog/zikan')}
    >
      <View style={styles.statRow}>
        <Text style={[styles.statVal, { color: colors.text }]}>
          {daySummary ? (daySummary.totalZikanMinutes / 60).toFixed(1) : '0.0'}{' '}
          <Text style={[styles.statUnit, { color: colors.textMuted }]}>
            {t('ui.home.unit_hour') || '時間'}
          </Text>
        </Text>
        <Text style={[styles.statGoal, { color: colors.textMuted }]}>
          {t('ui.home.recorded') || '記録済み'}
        </Text>
      </View>

      <View style={styles.breakdownList}>
        {daySummary?.zikan && daySummary.zikan.length > 0 ? (
          daySummary.zikan.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.breakdownRow}>
              <Text style={[styles.breakdownName, { color: colors.text }]} numberOfLines={1}>
                • {item.name}
              </Text>
              <Text style={[styles.breakdownTime, { color: colors.textMuted }]}>
                {item.hours >= 1 ? `${item.hours}${t('ui.home.unit_hour') || '時間'}` : ''}
                {item.minutes % 60 > 0 ? `${item.minutes % 60}${t('ui.home.unit_minute') || '分'}` : ''}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('ui.home.no_time_blocks') || '記録された時間ブロックがありません'}
          </Text>
        )}
      </View>
    </HomeCard>
  );
};

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  statVal: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statUnit: {
    fontSize: 16,
  },
  statGoal: {
    fontSize: 14,
    marginLeft: 8,
  },
  breakdownList: {
    marginTop: 4,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownName: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  breakdownTime: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
