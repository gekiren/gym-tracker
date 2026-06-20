import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

const REST_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300]; // in seconds

interface TimerSectionProps {
  autoRest: boolean;
  onUpdateAuto: (val: boolean) => void;
  timerVibrate: boolean;
  onUpdateVibrate: (val: boolean) => void;
  keepAwake: boolean;
  onUpdateKeepAwake: (val: boolean) => void;
  defaultRest: number;
  onUpdateRest: (secs: number) => void;
  t: (key: string, options?: any) => string;
}

export const TimerSection: React.FC<TimerSectionProps> = ({
  autoRest,
  onUpdateAuto,
  timerVibrate,
  onUpdateVibrate,
  keepAwake,
  onUpdateKeepAwake,
  defaultRest,
  onUpdateRest,
  t,
}) => {
  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}${t('ui.common.secs_unit')}`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}${t('ui.common.min_unit')}${s}${t('ui.common.secs_unit')}` : `${m}${t('ui.common.min_unit')}`;
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="timer-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>{t('ui.profile.section_timer')}</Text>
      </View>

      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.auto_rest')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.auto_rest_desc')}</Text>
          </View>
          <Switch
            value={autoRest}
            onValueChange={onUpdateAuto}
            trackColor={{ false: '#333', true: Theme.colors.primary }}
            thumbColor={'#fff'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.timer_vibrate')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.timer_vibrate_desc')}</Text>
          </View>
          <Switch
            value={timerVibrate}
            onValueChange={onUpdateVibrate}
            trackColor={{ false: '#333', true: Theme.colors.primary }}
            thumbColor={'#fff'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.keep_awake')}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.keep_awake_desc')}</Text>
          </View>
          <Switch
            value={keepAwake}
            onValueChange={onUpdateKeepAwake}
            trackColor={{ false: '#333', true: Theme.colors.primary }}
            thumbColor={'#fff'}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={styles.settingLabel}>{t('ui.profile.default_rest')}</Text>
          <Text style={styles.settingDesc}>{t('ui.profile.default_rest_desc')}</Text>
          
          <View style={styles.chipContainer}>
            {REST_OPTIONS.map((secs) => (
              <TouchableOpacity
                key={secs}
                style={[styles.chip, defaultRest === secs && styles.chipActive]}
                onPress={() => onUpdateRest(secs)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, defaultRest === secs && styles.chipTextActive]}>
                  {formatTime(secs)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
});
