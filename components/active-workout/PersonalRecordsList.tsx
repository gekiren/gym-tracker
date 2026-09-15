import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
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
const HORIZONTAL_PADDING = Theme.spacing.md;

export function PersonalRecordsList({
  personalRecords,
  weightUnit,
  onPrPress
}: PersonalRecordsListProps) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (Object.keys(personalRecords).length === 0) return null;

  const effectiveWidth = containerWidth > 0 ? containerWidth : Math.max(0, screenWidth - HORIZONTAL_PADDING * 2);
  const itemWidth = Math.max(0, Math.floor((effectiveWidth - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS));

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
          {Object.entries(personalRecords).map(([variation, prMap]) => (
            <View key={variation} style={{ marginBottom: 12 }}>
              {variation !== 'default' && (
                <Text style={styles.prVariationTitle}>
                  {t('ui.active_workout.stance_label')}: {translateStance(variation)}
                </Text>
              )}
              <View 
                style={styles.prList}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0 && Math.abs(w - containerWidth) > 1) {
                    setContainerWidth(w);
                  }
                }}
              >
                {Object.keys(prMap)
                  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                  .map(reps => {
                    const repNum = parseInt(reps, 10);
                    const weight = prMap[repNum];
                    const oneRm = repNum === 1 ? weight : Math.round(weight * (1 + (repNum / 30)));
                    return (
                      <TouchableOpacity 
                        key={reps} 
                        style={[styles.prItem, { width: itemWidth }]}
                        activeOpacity={0.7}
                        onPress={() => onPrPress(repNum, variation)}
                      >
                        <Text style={styles.prReps} numberOfLines={1}>
                          {reps}{t('ui.common.reps_unit')}
                        </Text>
                        <Text 
                          style={styles.prWeight} 
                          numberOfLines={1} 
                          adjustsFontSizeToFit 
                          minimumFontScale={0.75}
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
              </View>
            </View>
          ))}
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
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: GAP, 
    paddingHorizontal: Theme.spacing.md 
  },
  prItem: { 
    backgroundColor: '#1a1a1a', 
    paddingHorizontal: 4, 
    paddingVertical: 8, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: '#333', 
    minHeight: 66,
  },
  prReps: { 
    color: Theme.colors.textMuted, 
    fontSize: 11, 
    fontWeight: 'bold', 
    marginBottom: 2 
  },
  prWeight: { 
    color: Theme.colors.primary, 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  prOneRm: { 
    color: '#f5a623', 
    fontSize: 10, 
    fontWeight: 'bold', 
    marginTop: 3 
  },
});
