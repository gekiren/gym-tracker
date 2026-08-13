import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface PreferenceSectionProps {
  weightUnit: 'kg' | 'lbs';
  onUpdateUnit: (unit: 'kg' | 'lbs') => void;
  bodyWeight: string;
  onUpdateBodyWeight: (val: string) => void;
  currentLang: string;
  onChangeLanguage: (lang: 'ja' | 'en') => void;
  crashConsent: string;
  onUpdateCrashConsent: (val: boolean) => void;
  backgroundTheme?: 'dark' | 'pureBlack';
  onUpdateBackgroundTheme?: (theme: 'dark' | 'pureBlack') => void;
  t: (key: string, options?: any) => string;
}

export const PreferenceSection: React.FC<PreferenceSectionProps> = ({
  weightUnit,
  onUpdateUnit,
  bodyWeight,
  onUpdateBodyWeight,
  currentLang,
  onChangeLanguage,
  crashConsent,
  onUpdateCrashConsent,
  backgroundTheme = 'dark',
  onUpdateBackgroundTheme,
  t,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="settings-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
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
        <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={styles.settingLabel}>{t('ui.profile.body_weight_label')}</Text>
          <Text style={styles.settingDesc}>{t('ui.profile.body_weight_desc')}</Text>
          <TextInput
            style={styles.weightInput}
            keyboardType="numeric"
            value={bodyWeight}
            onChangeText={onUpdateBodyWeight}
            placeholder={`e.g. 70 (${weightUnit})`}
            placeholderTextColor={Theme.colors.textMuted}
          />
        </View>
        <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={styles.settingLabel}>背景テーマ (カラーモード)</Text>
          <Text style={styles.settingDesc}>アプリ全体の背景色テーマを選択できます。</Text>
          <View style={[styles.chipContainer, { marginTop: 12 }]}>
            <TouchableOpacity
              style={[styles.langChip, backgroundTheme === 'dark' && styles.chipActive]}
              onPress={() => onUpdateBackgroundTheme?.('dark')}
            >
              <Text style={[styles.chipText, backgroundTheme === 'dark' && styles.chipTextActive]}>🌑 ダーク (#121212)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langChip, backgroundTheme === 'pureBlack' && styles.chipActive]}
              onPress={() => onUpdateBackgroundTheme?.('pureBlack')}
            >
              <Text style={[styles.chipText, backgroundTheme === 'pureBlack' && styles.chipTextActive]}>⬛ 純黒 / OLED (#000000)</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={styles.settingLabel}>{t('ui.profile.language_label')}</Text>
          <View style={[styles.chipContainer, { marginTop: 12 }]}>
            <TouchableOpacity
              style={[styles.langChip, currentLang === 'ja' && styles.chipActive]}
              onPress={() => onChangeLanguage('ja')}
            >
              <Text style={[styles.chipText, currentLang === 'ja' && styles.chipTextActive]}>🇯🇵 日本語</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langChip, currentLang === 'en' && styles.chipActive]}
              onPress={() => onChangeLanguage('en')}
            >
              <Text style={[styles.chipText, currentLang === 'en' && styles.chipTextActive]}>🇺🇸 English</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.settingLabel}>{t('ui.profile.crash_report_consent_label') || '匿名のクラッシュレポート自動送信'}</Text>
            <Text style={styles.settingDesc}>{t('ui.profile.crash_report_consent_desc') || 'アプリが異常終了した際、匿名の診断ログを自動送信して品質改善に協力します。'}</Text>
          </View>
          <Switch
            value={crashConsent === 'agreed'}
            onValueChange={onUpdateCrashConsent}
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
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  langChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  weightInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: Theme.colors.border, width: '100%', marginTop: 12 },
});
