import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface AccountCardProps {
  accountType: 'basic' | 'premium' | 'premium_limited' | 'early_adopter';
  premiumUntil: string;
  onPressAccountCard: () => void;
  onPressPlanDetail?: () => void;
  onPressPromo?: () => void;
  t: (key: string, options?: any) => string;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  accountType,
  premiumUntil,
  onPressAccountCard,
  onPressPlanDetail,
  onPressPromo,
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
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="card-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>プラン情報</Text>
      </View>

      <View style={styles.cardContainer}>
        {/* 1. プランの種類情報 */}
        <TouchableOpacity 
          style={styles.headerRow} 
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
            <Text style={styles.accountLabel}>{t('ui.profile.account_type_label') || 'プランの種類'}</Text>
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
                (t('ui.profile.account_basic') || 'ベーシックプラン')
              }
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
        </TouchableOpacity>

        {/* 2. プラン詳細 / アップグレード */}
        <TouchableOpacity 
          style={styles.menuRow} 
          onPress={onPressPlanDetail || onPressAccountCard}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="ribbon-outline" size={20} color="#ffd700" style={{ marginRight: 12 }} />
            <Text style={styles.menuTitle}>プラン詳細 / アップグレード</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
        </TouchableOpacity>

        {/* 3. プロモーションコード入力 */}
        <TouchableOpacity 
          style={[styles.menuRow, { borderBottomWidth: 0 }]} 
          onPress={onPressPromo}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="ticket-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 12 }} />
            <Text style={styles.menuTitle}>プロモーションコード入力</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.md },
  sectionTitle: { fontSize: 18, color: Theme.colors.text, fontWeight: 'bold' },
  cardContainer: { 
    backgroundColor: Theme.colors.card, 
    borderRadius: Theme.borderRadius.md, 
    borderWidth: 1, 
    borderColor: Theme.colors.border, 
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
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
  accountValuePremiumLimited: { color: '#c084fc' },
  menuRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: Theme.colors.border
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuTitle: { fontSize: 15, fontWeight: '600', color: Theme.colors.text },
});
