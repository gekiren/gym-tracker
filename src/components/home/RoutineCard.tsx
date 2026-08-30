import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Theme } from '../../theme';
import { useLifelogStore } from '../../store/lifelogStore';

export const RoutineCard = () => {
  const { t } = useTranslation();
  const daySummary = useLifelogStore(state => state.daySummary);

  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9}
      onPress={() => router.push('/lifelog/routine')}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
          <Ionicons name="repeat" size={24} color="#4caf50" />
        </View>
        <Text style={styles.cardTitle}>{t('ui.home.card_routines') || 'ルーティン管理'}</Text>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.routineSummaryRow}>
          <Ionicons name="checkmark-done-circle-outline" size={20} color="#4caf50" style={{ marginRight: 6 }} />
          <Text style={styles.routineSummaryText}>
            {t('ui.home.completed_routines') || '完了したルーティン:'}
          </Text>
        </View>
        {daySummary?.completedRoutineNames && daySummary.completedRoutineNames.length > 0 ? (
          <View style={{ marginTop: 8, paddingLeft: 26 }}>
            {daySummary.completedRoutineNames.map((name, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="checkmark" size={14} color="#4caf50" style={{ marginRight: 6 }} />
                <Text style={{ color: Theme.colors.text, fontSize: 15 }}>{name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ marginTop: 8, paddingLeft: 26 }}>
            <Text style={{ color: Theme.colors.textMuted, fontSize: 14 }}>{t('ui.home.none') || 'なし'}</Text>
          </View>
        )}
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
  routineSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routineSummaryText: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
});
