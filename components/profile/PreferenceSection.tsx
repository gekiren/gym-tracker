import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';

interface PreferenceSectionProps {
  weightUnit: 'kg' | 'lbs';
  onUpdateUnit: (unit: 'kg' | 'lbs') => void;
  bodyWeight: string;
  onUpdateBodyWeight: (val: string) => void;
  t: (key: string, options?: any) => string;
}

export const PreferenceSection: React.FC<PreferenceSectionProps> = ({
  weightUnit,
  onUpdateUnit,
  bodyWeight,
  onUpdateBodyWeight,
  t,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="barbell-outline" size={24} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>{t('ui.profile.section_preferences')}</Text>
      </View>

      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>{t('ui.profile.weight_unit_label')}</Text>
          <View style={[styles.chipContainer, { marginTop: 0, gap: 4 }]}>
            <TouchableOpacity
              style={[styles.langChip, { paddingVertical: 8, paddingHorizontal: 16 }, weightUnit === 'kg' && styles.chipActive]}
              onPress={() => onUpdateUnit('kg')}
            >
              <Text style={[styles.chipText, weightUnit === 'kg' && styles.chipTextActive]}>kg</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langChip, { paddingVertical: 8, paddingHorizontal: 16 }, weightUnit === 'lbs' && styles.chipActive]}
              onPress={() => onUpdateUnit('lbs')}
            >
              <Text style={[styles.chipText, weightUnit === 'lbs' && styles.chipTextActive]}>lbs</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'flex-start', borderBottomWidth: 0 }]}>
          <Text style={styles.settingLabel}>{t('ui.profile.body_weight_label')}</Text>
          <Text style={styles.settingDesc}>{t('ui.profile.body_weight_desc')}</Text>
          <TextInput
            style={styles.weightInput}
            keyboardType="numeric"
            value={bodyWeight}
            onChangeText={onUpdateBodyWeight}
            placeholder={`e.g. 70 (${weightUnit})`}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, color: colors.text, fontWeight: 'bold' },
    settingCard: { backgroundColor: colors.card, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: colors.border },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    settingLabel: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
    settingDesc: { color: colors.textMuted, fontSize: 13, paddingRight: 40, lineHeight: 18 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    langChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: colors.primary },
    chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
    chipTextActive: { color: colors.primary, fontWeight: 'bold' },
    weightInput: { backgroundColor: colors.background, color: colors.text, padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: colors.border, width: '100%', marginTop: 12 },
  });
