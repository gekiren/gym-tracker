import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { saveSetting } from '../../src/db/database';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../../src/i18n';

const REST_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300]; // in seconds

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { settings, loadSettings } = useWorkoutStore();
  const [defaultRest, setDefaultRest] = useState(settings.defaultRest);
  const [autoRest, setAutoRest] = useState(settings.autoRest);
  const [weightUnit, setWeightUnit] = useState(settings.weightUnit);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  useEffect(() => {
    setDefaultRest(settings.defaultRest);
    setAutoRest(settings.autoRest);
    setWeightUnit(settings.weightUnit);
  }, [settings]);

  const handleUpdateRest = async (secs: number) => {
    setDefaultRest(secs);
    loadSettings(secs, autoRest, weightUnit);
    await saveSetting('default_rest_timer', secs.toString());
  };

  const handleUpdateAuto = async (val: boolean) => {
    setAutoRest(val);
    loadSettings(defaultRest, val, weightUnit);
    await saveSetting('auto_rest_timer', val ? '1' : '0');
  };

  const handleUpdateUnit = async (unit: 'kg' | 'lbs') => {
    setWeightUnit(unit);
    loadSettings(defaultRest, autoRest, unit);
    await saveSetting('weight_unit', unit);
  };

  const handleChangeLanguage = async (lang: 'ja' | 'en') => {
    changeLanguage(lang);
    setCurrentLang(lang);
    await saveSetting('language', lang);
  };

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}${t('ui.common.secs_unit')}`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}${t('ui.common.min_unit')}${s}${t('ui.common.secs_unit')}` : `${m}${t('ui.common.min_unit')}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('ui.profile.title')}</Text>
      </View>

      {/* Tools Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="construct-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_tools')}</Text>
        </View>
        
        <View style={styles.settingCard}>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/rm-calculator')}>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Ionicons name="calculator" size={22} color={Theme.colors.text} style={{ marginRight: 12 }} />
               <View>
                 <Text style={styles.settingLabel}>{t('ui.profile.rm_calculator')}</Text>
                 <Text style={[styles.settingDesc, { paddingRight: 0 }]}>{t('ui.profile.rm_calculator_desc')}</Text>
               </View>
             </View>
             <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Timer Section */}
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
              onValueChange={handleUpdateAuto}
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
                  onPress={() => handleUpdateRest(secs)}
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

      {/* Preference Section */}
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
                onPress={() => handleUpdateUnit('kg')}
              >
                <Text style={[styles.chipText, weightUnit === 'kg' && styles.chipTextActive]}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langChip, { paddingVertical: 8, paddingHorizontal: 16 }, weightUnit === 'lbs' && styles.chipActive]}
                onPress={() => handleUpdateUnit('lbs')}
              >
                <Text style={[styles.chipText, weightUnit === 'lbs' && styles.chipTextActive]}>lbs</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={styles.settingLabel}>{t('ui.profile.language_label')}</Text>
            <View style={[styles.chipContainer, { marginTop: 12 }]}>
              <TouchableOpacity
                style={[styles.langChip, currentLang === 'ja' && styles.chipActive]}
                onPress={() => handleChangeLanguage('ja')}
              >
                <Text style={[styles.chipText, currentLang === 'ja' && styles.chipTextActive]}>🇯🇵 日本語</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langChip, currentLang === 'en' && styles.chipActive]}
                onPress={() => handleChangeLanguage('en')}
              >
                <Text style={[styles.chipText, currentLang === 'en' && styles.chipTextActive]}>🇺🇸 English</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={24} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_info')}</Text>
        </View>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('ui.profile.version')}</Text>
            <Text style={{ color: Theme.colors.textMuted }}>1.0.0</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  header: { marginBottom: Theme.spacing.lg, marginTop: Theme.spacing.md },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.text },
  section: { marginBottom: Theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.md },
  sectionTitle: { fontSize: 18, color: Theme.colors.text, fontWeight: 'bold' },
  settingCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  settingLabel: { color: Theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  settingDesc: { color: Theme.colors.textMuted, fontSize: 13, paddingRight: 40, lineHeight: 18 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  langChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' }
});
