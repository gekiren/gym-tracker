import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { translateStance } from '../../src/i18n';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../src/store/settingsStore';

interface PersonalRecordsListProps {
  exerciseId?: number;
  personalRecords: Record<string, Record<number, number>>;
  weightUnit: string;
  onPrPress: (reps: number, variation: string) => void;
}

const GAP = 6;
const NUM_COLUMNS = 4;
const EMPTY_COLLAPSED_STANCES: Record<string, boolean> = {};

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export function PersonalRecordsList({
  exerciseId,
  personalRecords,
  weightUnit,
  onPrPress
}: PersonalRecordsListProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const validExerciseId = exerciseId !== undefined && !Number.isNaN(exerciseId) ? exerciseId : undefined;
  const persistedCollapsed = useSettingsStore(
    useCallback(
      (state) => (validExerciseId !== undefined ? state.settings.exercisePrCollapsedStances[String(validExerciseId)] : undefined),
      [validExerciseId]
    )
  );
  const setExercisePrStanceCollapsed = useSettingsStore((state) => state.setExercisePrStanceCollapsed);
  const [localCollapsedStances, setLocalCollapsedStances] = useState<Record<string, boolean>>({});
  const collapsedStances = validExerciseId !== undefined ? (persistedCollapsed ?? EMPTY_COLLAPSED_STANCES) : localCollapsedStances;

  const sortedEntries = Object.entries(personalRecords)
    .filter(([, prMap]) => prMap && Object.keys(prMap).length > 0)
    .sort(([a], [b]) => {
      if (a === 'default') return -1;
      if (b === 'default') return 1;
      return translateStance(a).localeCompare(translateStance(b));
    });

  if (sortedEntries.length === 0) return null;

  const toggleStanceAccordion = (variation: string) => {
    const nextCollapsed = !collapsedStances[variation];
    if (validExerciseId !== undefined) {
      setExercisePrStanceCollapsed(validExerciseId, variation, nextCollapsed);
    } else {
      setLocalCollapsedStances(prev => ({
        ...prev,
        [variation]: nextCollapsed,
      }));
    }
  };

  return (
    <View style={[styles.prSection, { borderBottomColor: colors.border }]}>
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)} 
        style={styles.prHeaderToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('ui.exercise_detail.section_pr')}
        </Text>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.primary} />
      </TouchableOpacity>

      {isExpanded && (
        <View style={{ marginTop: 8, gap: 10 }}>
          {sortedEntries.map(([variation, prMap]) => {
            const sortedReps = Object.keys(prMap).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            const rows = chunkArray(sortedReps, NUM_COLUMNS);
            const isStanceCollapsed = !!collapsedStances[variation];
            const stanceLabel = variation === 'default'
              ? t('ui.exercise_detail.stance_none')
              : `${t('ui.active_workout.stance_label')}: ${translateStance(variation)}`;

            return (
              <View key={variation} style={styles.stanceGroup}>
                <TouchableOpacity
                  onPress={() => toggleStanceAccordion(variation)}
                  style={[styles.stanceHeaderToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: !isStanceCollapsed }}
                >
                  <View style={styles.stanceHeaderLeft}>
                    <Text style={[styles.prVariationTitle, { color: colors.text }]} numberOfLines={1}>
                      {stanceLabel}
                    </Text>
                    <View style={styles.stanceCountBadge}>
                      <Text style={[styles.stanceCountText, { color: colors.primary }]}>
                        {sortedReps.length}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isStanceCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {!isStanceCollapsed && (
                  <View style={[styles.prList, { marginTop: 8 }]}>
                    {rows.map((row, rowIdx) => (
                      <View key={rowIdx} style={styles.prRow}>
                        {row.map(reps => {
                          const repNum = parseInt(reps, 10);
                          const weight = prMap[repNum];
                          const oneRm = repNum === 1 ? weight : Math.round(weight * (1 + (repNum / 30)));
                          return (
                            <TouchableOpacity 
                              key={reps} 
                              style={[styles.prItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                              activeOpacity={0.7}
                              onPress={() => onPrPress(repNum, variation)}
                            >
                              <Text 
                                style={[styles.prReps, { color: colors.textMuted }]} 
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.8}
                              >
                                {reps}{t('ui.common.reps_unit')}
                              </Text>
                              <Text 
                                style={[styles.prWeight, { color: colors.primary }]} 
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
                )}
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
    paddingBottom: 16, 
    paddingTop: 16 
  },
  prHeaderToggle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16,
    minHeight: 44
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
  },
  stanceGroup: {
    marginBottom: 4,
  },
  stanceHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  stanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  prVariationTitle: { 
    fontSize: 13, 
    fontWeight: '700',
    flexShrink: 1,
  },
  stanceCountBadge: {
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stanceCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  prList: { 
    paddingHorizontal: 16, 
    gap: GAP, 
  },
  prRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  prItem: { 
    flex: 1,
    paddingHorizontal: 4, 
    paddingVertical: 8, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    minHeight: 66,
  },
  prItemDummy: {
    flex: 1,
  },
  prReps: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginBottom: 1 
  },
  prWeight: { 
    fontSize: 15.5, 
    fontWeight: 'bold' 
  },
  prOneRm: { 
    color: '#f5a623', 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginTop: 2 
  },
});
