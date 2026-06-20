import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface AccountCardProps {
  accountType: 'basic' | 'premium' | 'premium_limited' | 'early_adopter';
  premiumUntil: string;
  onPressAccountCard: () => void;
  t: (key: string, options?: any) => string;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  accountType,
  premiumUntil,
  onPressAccountCard,
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
  );
};

const styles = StyleSheet.create({
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
