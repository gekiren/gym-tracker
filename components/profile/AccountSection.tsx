import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { router } from 'expo-router';

interface AccountSectionProps {
  accountType: 'basic' | 'premium' | 'premium_limited' | 'early_adopter';
  premiumUntil: string;
  currentOtaVersion: string;
  nativeVersion: string;
  isCheckingPromoWorkflow: boolean;
  onPressAccountCard: () => void;
  onPressPromoCode: () => void;
  t: (key: string, options?: any) => string;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
  accountType,
  premiumUntil,
  currentOtaVersion,
  nativeVersion,
  isCheckingPromoWorkflow,
  onPressAccountCard,
  onPressPromoCode,
  t,
}) => {
  const getRemainingDaysText = (until: string) => {
    if (!until || until === 'perpetual') return '';
    const expiry = Date.parse(until);
    if (isNaN(expiry)) return '';
    
    const diffMs = expiry - Date.now();
    if (diffMs <= 0) return t('ui.profile.promo_expired') || '期限切れ';
    
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return t('ui.profile.promo_remaining_days', { days: diffDays }) || `残り${diffDays}日`;
  };

  return (
    <>
      {/* Account Type Card */}
      <TouchableOpacity 
        style={styles.accountCard} 
        onPress={onPressAccountCard}
        activeOpacity={0.7}
      >
        <View style={styles.accountIconContainer}>
          <Ionicons 
            name={
              accountType === 'early_adopter' ? 'ribbon-sharp' :
              accountType === 'premium' ? 'star-sharp' : 
              accountType === 'premium_limited' ? 'time-sharp' : 'person-sharp'
            } 
            size={22} 
            color={
              accountType === 'early_adopter' ? '#ffd700' : 
              accountType === 'premium' ? '#4facfe' : 
              accountType === 'premium_limited' ? '#c084fc' :
              Theme.colors.textMuted
            } 
          />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountLabel}>{t('ui.profile.account_type_label') || 'アカウントの種類'}</Text>
          <Text style={[
            styles.accountValue,
            accountType === 'early_adopter' && styles.accountValueEarly,
            accountType === 'premium' && styles.accountValuePremium,
            accountType === 'premium_limited' && styles.accountValuePremiumLimited
          ]}>
            {
              accountType === 'early_adopter' ? (t('ui.profile.account_early_adopter') || 'アーリーアダプター（無制限）') :
              accountType === 'premium' ? (t('ui.profile.account_premium') || 'プレミアムプラン') :
              accountType === 'premium_limited' ? `${t('ui.profile.account_premium_limited') || 'プレミアムプラン（お試し）'} - ${getRemainingDaysText(premiumUntil)}` :
              (t('ui.profile.account_basic') || 'ベーシックプラン（タップしてアップグレード）')
            }
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
      </TouchableOpacity>

      {/* App Info Section */}
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
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={onPressPromoCode}
            disabled={isCheckingPromoWorkflow}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
              <Ionicons 
                name={isCheckingPromoWorkflow ? "sync" : "gift-outline"} 
                size={20} 
                color={Theme.colors.text} 
                style={{ marginRight: 10 }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>
                  {isCheckingPromoWorkflow ? t('ui.profile.app_version_checking') : t('ui.profile.promo_code')}
                </Text>
                <Text style={[styles.settingDesc, { paddingRight: 0 }]}>
                  {t('ui.profile.promo_code_desc')}
                </Text>
              </View>
            </View>
            {isCheckingPromoWorkflow ? (
              <ActivityIndicator size="small" color={Theme.colors.textMuted} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
            )}
          </TouchableOpacity>
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
  accountCard: { 
    backgroundColor: Theme.colors.card, 
    borderRadius: Theme.borderRadius.md, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: Theme.colors.border, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  accountIconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#1c1c1e', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border
  },
  accountInfo: { flex: 1 },
  accountLabel: { 
    color: Theme.colors.textMuted, 
    fontSize: 12, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginBottom: 2 
  },
  accountValue: { color: Theme.colors.text, fontSize: 16, fontWeight: 'bold' },
  accountValueEarly: { color: '#ffd700' },
  accountValuePremium: { color: '#4facfe' },
  accountValuePremiumLimited: { color: '#c084fc' }
});
