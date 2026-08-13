import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface AiCoachSectionProps {
  aiTokensBalance: number;
  maxTokens: number;
  isBasic: boolean;
  t: (key: string, options?: any) => string;
}

export const AiCoachSection: React.FC<AiCoachSectionProps> = ({
  aiTokensBalance,
  maxTokens,
  isBasic,
  t,
}) => {
  return (
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
  aiTokensContainer: { marginTop: 12, width: '100%' },
  progressBarBg: { height: 8, backgroundColor: '#222', borderRadius: 4, width: '100%', overflow: 'hidden', marginTop: 12, marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  quotaWarning: { color: Theme.colors.danger, fontWeight: 'bold', fontSize: 13, marginTop: 8 },
});
