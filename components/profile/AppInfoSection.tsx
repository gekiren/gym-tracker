import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="information-circle-outline" size={24} color={colors.textMuted} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>{t('ui.profile.section_info')}</Text>
      </View>
      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>{t('ui.profile.version')}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.text, fontSize: 16 }}>{currentOtaVersion}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
              {t('ui.profile.native_version_label', { version: nativeVersion })}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/privacy-policy' as any)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} style={{ marginRight: 10 }} />
            <Text style={styles.settingLabel}>{t('ui.profile.privacy_policy')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.border} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL('mailto:trenotesupport@gmail.com')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="mail-outline" size={20} color={colors.text} style={{ marginRight: 10 }} />
            <Text style={styles.settingLabel}>{t('ui.profile.contact')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.border} />
        </TouchableOpacity>
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
  });
