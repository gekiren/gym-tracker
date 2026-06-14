import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { translateStance } from '../../src/i18n';
import { useTranslation } from 'react-i18next';

interface PersonalRecordsListProps {
  personalRecords: Record<string, Record<number, number>>;
  weightUnit: string;
  onPrPress: (reps: number, variation: string) => void;
}

export function PersonalRecordsList({
  personalRecords,
  weightUnit,
  onPrPress
}: PersonalRecordsListProps) {
  const { t } = useTranslation();
  
  if (Object.keys(personalRecords).length === 0) return null;

  return (
    <View style={styles.prSection}>
      <Text style={[styles.sectionTitle, { paddingHorizontal: Theme.spacing.lg, marginBottom: 8 }]}>
        {t('ui.exercise_detail.section_pr')}
      </Text>
      {Object.entries(personalRecords).map(([variation, prMap]) => (
        <View key={variation} style={{ marginBottom: 12 }}>
          {variation !== 'default' && (
            <Text style={styles.prVariationTitle}>
              {t('ui.active_workout.stance_label')}: {translateStance(variation)}
            </Text>
          )}
          <View style={styles.prList}>
            {Object.keys(prMap)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(reps => {
                const repNum = parseInt(reps);
                const weight = prMap[repNum];
                const oneRm = repNum === 1 ? weight : Math.round(weight * (1 + (repNum / 30)));
                return (
                  <TouchableOpacity 
                    key={reps} 
                    style={styles.prItem}
                    activeOpacity={0.7}
                    onPress={() => onPrPress(repNum, variation)}
                  >
                    <Text style={styles.prReps}>{reps}{t('ui.common.reps_unit')}</Text>
                    <Text style={styles.prWeight}>{weight} {weightUnit}</Text>
                    {repNum > 1 && (
                      <Text style={styles.prOneRm}>1RM: {oneRm}{weightUnit}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  prSection: { borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: Theme.spacing.md, paddingTop: Theme.spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  prVariationTitle: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: 'bold', paddingHorizontal: Theme.spacing.lg, marginBottom: 4 },
  prList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Theme.spacing.lg },
  prItem: { backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#333', minWidth: 70 },
  prReps: { color: Theme.colors.textMuted, fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  prWeight: { color: Theme.colors.primary, fontSize: 16, fontWeight: 'bold' },
  prOneRm: { color: '#f5a623', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
});
