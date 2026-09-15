import React, { useState } from 'react';
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

const GAP = 6;
const NUM_COLUMNS = 4;

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export function PersonalRecordsList({
  personalRecords,
  weightUnit,
  onPrPress
}: PersonalRecordsListProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (Object.keys(personalRecords).length === 0) return null;

  return (
    <View style={styles.prSection}>
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)} 
        style={styles.prHeaderToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionTitle}>
          {t('ui.exercise_detail.section_pr')}
        </Text>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={Theme.colors.primary} />
      </TouchableOpacity>

      {isExpanded && (
        <View style={{ marginTop: 8 }}>
          {Object.entries(personalRecords).map(([variation, prMap]) => {
            const sortedReps = Object.keys(prMap).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            const rows = chunkArray(sortedReps, NUM_COLUMNS);

            return (
              <View key={variation} style={{ marginBottom: 12 }}>
                {variation !== 'default' && (
                  <Text style={styles.prVariationTitle}>
                    {t('ui.active_workout.stance_label')}: {translateStance(variation)}
                  </Text>
                )}
                <View style={styles.prList}>
                  {rows.map((row, rowIdx) => (
                    <View key={rowIdx} style={styles.prRow}>
                      {row.map(reps => {
                        const repNum = parseInt(reps, 10);
                        const weight = prMap[repNum];
                        const oneRm = repNum === 1 ? weight : Math.round(weight * (1 + (repNum / 30)));
                        return (
                          <TouchableOpacity 
                            key={reps} 
                            style={styles.prItem}
                            activeOpacity={0.7}
                            onPress={() => onPrPress(repNum, variation)}
                          >
                            <Text 
                              style={styles.prReps} 
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.8}
                            >
                              {reps}{t('ui.common.reps_unit')}
                            </Text>
                            <Text 
                              style={styles.prWeight} 
                              numberOfLines={1} 
                              adjustsFontSizeToFit 
                              minimumFontScale={0.7}
                            >
                              {weight} {weightUnit}
                            </Text>
                            {repNum > 1 ? (
                              <Text 
                                style={styles.prOneRm} 
                                numberOfLines={1} 
                                adjustsFontSizeToFit 
                                minimumFontScale={0.7}
                              >
                                1RM: {oneRm}{weightUnit}
                              </Text>
                            ) : (
                              <Text style={[styles.prOneRm, { opacity: 0 }]} numberOfLines={1}>
                                1RM
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                      {Array.from({ length: NUM_COLUMNS - row.length }).map((_, dummyIdx) => (
                        <View key={`dummy-${dummyIdx}`} style={styles.prItemDummy} />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  prSection: { 
    borderBottomWidth: 1, 
    borderBottomColor: Theme.colors.border, 
    paddingBottom: Theme.spacing.md, 
    paddingTop: Theme.spacing.md 
  },
  prHeaderToggle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Theme.spacing.md 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: Theme.colors.text 
  },
  prVariationTitle: { 
    color: Theme.colors.textMuted, 
    fontSize: 13, 
    fontWeight: 'bold', 
    paddingHorizontal: Theme.spacing.md, 
    marginBottom: 6 
  },
  prList: { 
    paddingHorizontal: Theme.spacing.md, 
    gap: GAP, 
  },
  prRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  prItem: { 
    flex: 1,
    backgroundColor: '#1a1a1a', 
    paddingHorizontal: 2, 
    paddingVertical: 6, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: '#333', 
    minHeight: 66,
  },
  prItemDummy: {
    flex: 1,
  },
  prReps: { 
    color: Theme.colors.textMuted, 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginBottom: 1 
  },
  prWeight: { 
    color: Theme.colors.primary, 
    fontSize: 15.5, 
    fontWeight: 'bold' 
  },
  prOneRm: { 
    color: '#f5a623', 
    fontSize: 11, 
    fontWeight: 'bold', 
    marginTop: 2 
  },
});
