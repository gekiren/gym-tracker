import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface DisplayFieldsSectionProps {
  showRpe: boolean;
  show1RM: boolean;
  showVolume: boolean;
  showStance: boolean;
  alwaysOneSet: boolean;
  onToggleDisplayField: (field: 'showRpe' | 'show1RM' | 'showVolume' | 'showStance', val: boolean) => void;
  onUpdateAlwaysOneSet: (val: boolean) => void;
  t: (key: string, options?: any) => string;
}

export const DisplayFieldsSection: React.FC<DisplayFieldsSectionProps> = ({
  showRpe,
  show1RM,
  showVolume,
  showStance,
  alwaysOneSet,
  onToggleDisplayField,
  onUpdateAlwaysOneSet,
  t,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="eye-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
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
            trackColor={{ false: '#333', true: Theme.colors.primary }}
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
            trackColor={{ false: '#333', true: Theme.colors.primary }}
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
            trackColor={{ false: '#333', true: Theme.colors.primary }}
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
            trackColor={{ false: '#333', true: Theme.colors.primary }}
            thumbColor={'#fff'}
          />
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.always_one_set_label')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.always_one_set_desc')}</Text>
          </View>
          <Switch
            value={alwaysOneSet}
            onValueChange={onUpdateAlwaysOneSet}
            trackColor={{ false: '#333', true: Theme.colors.primary }}
            thumbColor={'#fff'}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: Theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.md },
  sectionTitle: { fontSize: 18, color: Theme.colors.text, fontWeight: 'bold' },
  settingCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  settingLabel: { color: Theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  settingDesc: { color: Theme.colors.textMuted, fontSize: 13, paddingRight: 40, lineHeight: 18 },
});
