import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Theme } from '../../theme';
import { useLifelogStore } from '../../store/lifelogStore';

export const TimeCard = () => {
  const { t } = useTranslation();
  const daySummary = useLifelogStore(state => state.daySummary);

  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9}
      onPress={() => router.push('/lifelog/zikan')}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
          <Ionicons name="time" size={24} color="#ff9800" />
        </View>
        <Text style={styles.cardTitle}>{t('ui.home.card_time') || '24時間管理'}</Text>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.statRow}>
          <Text style={styles.statVal}>
            {daySummary ? (daySummary.totalZikanMinutes / 60).toFixed(1) : '0.0'} <Text style={styles.statUnit}>{t('ui.home.unit_hour') || '時間'}</Text>
          </Text>
          <Text style={styles.statGoal}>{t('ui.home.recorded') || '記録済み'}</Text>
        </View>

        <View style={styles.breakdownList}>
          {daySummary?.zikan && daySummary.zikan.length > 0 ? (
            daySummary.zikan.slice(0, 3).map((item, index) => (
              <View key={index} style={styles.breakdownRow}>
                <Text style={styles.breakdownName}>• {item.name}</Text>
                <Text style={styles.breakdownTime}>
                  {item.hours >= 1 ? `${item.hours}${t('ui.home.unit_hour') || '時間'}` : ''}{item.minutes % 60 > 0 ? `${item.minutes % 60}${t('ui.home.unit_minute') || '分'}` : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('ui.home.no_time_blocks') || '記録された時間ブロックがありません'}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    color: Theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    paddingLeft: 52,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  statVal: {
    color: Theme.colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  statUnit: {
    fontSize: 16,
    color: Theme.colors.textMuted,
  },
  statGoal: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    marginLeft: 8,
  },
  breakdownList: {
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownName: {
    color: Theme.colors.text,
    fontSize: 14,
  },
  breakdownTime: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
