import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import type { AddSetStanceMode } from '../../src/store/settingsStore';

interface DisplayFieldsSectionProps {
  showRpe: boolean;
  show1RM: boolean;
  showVolume: boolean;
  showStance: boolean;
  alwaysOneSet: boolean;
  addSetStanceMode: AddSetStanceMode;
  onToggleDisplayField: (field: 'showRpe' | 'show1RM' | 'showVolume' | 'showStance', val: boolean) => void;
  onUpdateAlwaysOneSet: (val: boolean) => void;
  onUpdateAddSetStanceMode: (mode: AddSetStanceMode) => void;
  t: (key: string, options?: any) => string;
}

export const DisplayFieldsSection: React.FC<DisplayFieldsSectionProps> = ({
  showRpe,
  show1RM,
  showVolume,
  showStance,
  alwaysOneSet,
  addSetStanceMode,
  onToggleDisplayField,
  onUpdateAlwaysOneSet,
  onUpdateAddSetStanceMode,
  t,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="eye-outline" size={24} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>{t('ui.profile.section_display_fields')}</Text>
      </View>
      <Text style={[styles.settingDesc, { marginBottom: 12, paddingRight: 0 }]}>{t('ui.profile.display_fields_desc')}</Text>
      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.display_rpe')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.display_rpe_desc')}</Text>
          </View>
          <Switch
            value={showRpe}
            onValueChange={(v) => onToggleDisplayField('showRpe', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#fff'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.display_1rm')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.display_1rm_desc')}</Text>
          </View>
          <Switch
            value={show1RM}
            onValueChange={(v) => onToggleDisplayField('show1RM', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#fff'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.display_volume')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.display_volume_desc')}</Text>
          </View>
          <Switch
            value={showVolume}
            onValueChange={(v) => onToggleDisplayField('showVolume', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#fff'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.display_stance')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.display_stance_desc')}</Text>
          </View>
          <Switch
            value={showStance}
            onValueChange={(v) => onToggleDisplayField('showStance', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#fff'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.always_one_set_label')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.always_one_set_desc')}</Text>
          </View>
          <Switch
            value={alwaysOneSet}
            onValueChange={onUpdateAlwaysOneSet}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#fff'}
          />
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={styles.settingLabel}>{t('ui.profile.add_set_stance_mode_label')}</Text>
          <Text style={[styles.settingDesc, { paddingRight: 0 }]}>{t('ui.profile.add_set_stance_mode_desc')}</Text>
          <View style={styles.chipContainer}>
            <TouchableOpacity
              style={[styles.chip, addSetStanceMode === 'default' && styles.chipActive]}
              onPress={() => onUpdateAddSetStanceMode('default')}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, addSetStanceMode === 'default' && styles.chipTextActive]}>
                {t('ui.profile.add_set_stance_mode_default')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, addSetStanceMode === 'previous' && styles.chipActive]}
              onPress={() => onUpdateAddSetStanceMode('previous')}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, addSetStanceMode === 'previous' && styles.chipTextActive]}>
                {t('ui.profile.add_set_stance_mode_previous')}
              </Text>
            </TouchableOpacity>
          </View>
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
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: colors.primary },
    chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
    chipTextActive: { color: colors.primary, fontWeight: 'bold' },
  });
