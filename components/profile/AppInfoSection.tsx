import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { router } from 'expo-router';

interface AppInfoSectionProps {
  currentOtaVersion: string;
  nativeVersion: string;
  t: (key: string, options?: any) => string;
}

export const AppInfoSection: React.FC<AppInfoSectionProps> = ({
  currentOtaVersion,
  nativeVersion,
  t,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="information-circle-outline" size={24} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>{t('ui.profile.section_info')}</Text>
      </View>
      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>{t('ui.profile.version')}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: Theme.colors.text, fontSize: 16 }}>{currentOtaVersion}</Text>
            <Text style={{ color: Theme.colors.textMuted, fontSize: 11, marginTop: 2 }}>
              {t('ui.profile.native_version_label', { version: nativeVersion })}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/privacy-policy' as any)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Theme.colors.text} style={{ marginRight: 10 }} />
            <Text style={styles.settingLabel}>{t('ui.profile.privacy_policy')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL('mailto:trenotesupport@gmail.com')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="mail-outline" size={20} color={Theme.colors.text} style={{ marginRight: 10 }} />
            <Text style={styles.settingLabel}>{t('ui.profile.contact')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
        </TouchableOpacity>
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
