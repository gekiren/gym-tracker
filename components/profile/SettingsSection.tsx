import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

const REST_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300]; // in seconds

interface SettingsSectionProps {
  autoRest: boolean;
  onUpdateAuto: (val: boolean) => void;
  timerVibrate: boolean;
  onUpdateVibrate: (val: boolean) => void;
  keepAwake: boolean;
  onUpdateKeepAwake: (val: boolean) => void;
  defaultRest: number;
  onUpdateRest: (secs: number) => void;
  weightUnit: 'kg' | 'lbs';
  onUpdateUnit: (unit: 'kg' | 'lbs') => void;
  bodyWeight: string;
  onUpdateBodyWeight: (val: string) => void;
  currentLang: string;
  onChangeLanguage: (lang: 'ja' | 'en') => void;
  crashConsent: string;
  onUpdateCrashConsent: (val: boolean) => void;
  alwaysOneSet: boolean;
  onUpdateAlwaysOneSet: (val: boolean) => void;
  showRpe: boolean;
  show1RM: boolean;
  showVolume: boolean;
  showStance: boolean;
  onToggleDisplayField: (field: 'showRpe' | 'show1RM' | 'showVolume' | 'showStance', val: boolean) => void;
  aiTokensBalance: number;
  maxTokens: number;
  isBasic: boolean;
  t: (key: string, options?: any) => string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  autoRest,
  onUpdateAuto,
  timerVibrate,
  onUpdateVibrate,
  keepAwake,
  onUpdateKeepAwake,
  defaultRest,
  onUpdateRest,
  weightUnit,
  onUpdateUnit,
  bodyWeight,
  onUpdateBodyWeight,
  currentLang,
  onChangeLanguage,
  crashConsent,
  onUpdateCrashConsent,
  alwaysOneSet,
  onUpdateAlwaysOneSet,
  showRpe,
  show1RM,
  showVolume,
  showStance,
  onToggleDisplayField,
  aiTokensBalance,
  maxTokens,
  isBasic,
  t,
}) => {
  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}${t('ui.common.secs_unit')}`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}${t('ui.common.min_unit')}${s}${t('ui.common.secs_unit')}` : `${m}${t('ui.common.min_unit')}`;
  };

  return (
    <>
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

      {/* Display Fields Section */}
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

      {/* AI Coach Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_ai_coach') || 'AIトレーナー設定'}</Text>
        </View>
        <View style={styles.settingCard}>
          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Text style={styles.settingLabel}>{t('ui.profile.ai_tokens_balance') || '今月の利用枠残高'}</Text>
              <Text style={{ color: aiTokensBalance === 0 ? Theme.colors.danger : Theme.colors.text, fontWeight: 'bold', fontSize: 16 }}>
                {`${aiTokensBalance} / ${maxTokens}`}
              </Text>
            </View>
            <Text style={[styles.settingDesc, { paddingRight: 0 }]}>
              {t('ui.profile.ai_tokens_desc') || 'Cloudflare Worker & Gemini APIを経由した安全で高度なトレーニング指導が受けられます。'}
            </Text>
            
            <View style={styles.aiTokensContainer}>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${Math.min(100, Math.max(0, (aiTokensBalance / maxTokens) * 100))}%`,
                      backgroundColor: aiTokensBalance === 0 ? Theme.colors.danger : Theme.colors.primary 
                    }
                  ]} 
                />
              </View>
              {aiTokensBalance === 0 && (
                <Text style={styles.quotaWarning}>{t('ui.profile.quota_exhausted_alert') || '今月の利用枠が残っていません。'}</Text>
              )}
              <Text style={[styles.settingDesc, { marginTop: 6, paddingRight: 0 }]}>
                {isBasic 
                  ? '30日後に利用枠は自動的に5回にリセットされます。' 
                  : (t('ui.profile.ai_tokens_reset_desc') || '30日後に利用枠は自動的に20回にリセットされます。')
                }
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
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
  langChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  weightInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: Theme.colors.border, width: '100%', marginTop: 12 },
  aiTokensContainer: { marginTop: 12, width: '100%' },
  progressBarBg: { height: 8, backgroundColor: '#222', borderRadius: 4, width: '100%', overflow: 'hidden', marginTop: 12, marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  quotaWarning: { color: Theme.colors.danger, fontWeight: 'bold', fontSize: 13, marginTop: 8 },
});
