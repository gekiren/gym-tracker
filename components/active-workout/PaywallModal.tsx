import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { useTranslation } from 'react-i18next';

interface PaywallModalProps {
  isPurchasing: boolean;
  isPremium: boolean;
  isEarly: boolean;
  onClose: () => void;
  onPurchase: () => void;
  onRestore: () => void;
  displayPrice: string;
}

export function PaywallModal({
  isPurchasing,
  isPremium,
  isEarly,
  onClose,
  onPurchase,
  onRestore,
  displayPrice
}: PaywallModalProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={styles.paywallBg}>
      <View style={[styles.paywallCard, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={[styles.paywallHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.paywallTitle, { color: colors.text }]}>{t('ui.profile.paywall.title')}</Text>
          <TouchableOpacity onPress={onClose} disabled={isPurchasing} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ width: '100%', marginVertical: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.paywallSubtitle, { color: colors.text }]}>
            {t('ui.profile.paywall.subtitle')}
          </Text>

          {/* Feature 1 */}
          <View style={styles.paywallFeature}>
            <View style={styles.paywallFeatureIcon}>
              <Ionicons name="star" size={24} color={colors.primary} />
            </View>
            <View style={styles.paywallFeatureInfo}>
              <Text style={[styles.paywallFeatureTitle, { color: colors.text }]}>{t('ui.profile.paywall.features.ad_free_all_features.title')}</Text>
              <Text style={[styles.paywallFeatureDesc, { color: colors.textMuted }]}>{t('ui.profile.paywall.features.ad_free_all_features.desc')}</Text>
            </View>
          </View>

          {/* Feature 2 */}
          <View style={styles.paywallFeature}>
            <View style={styles.paywallFeatureIcon}>
              <Ionicons name="copy" size={24} color={colors.primary} />
            </View>
            <View style={styles.paywallFeatureInfo}>
              <Text style={[styles.paywallFeatureTitle, { color: colors.text }]}>{t('ui.profile.paywall.features.import_routine.title')}</Text>
              <Text style={[styles.paywallFeatureDesc, { color: colors.textMuted }]}>{t('ui.profile.paywall.features.import_routine.desc')}</Text>
            </View>
          </View>

          {/* Feature 3 */}
          <View style={styles.paywallFeature}>
            <View style={styles.paywallFeatureIcon}>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.paywallFeatureInfo}>
              <Text style={[styles.paywallFeatureTitle, { color: colors.text }]}>{t('ui.profile.paywall.features.backup_restore.title')}</Text>
              <Text style={[styles.paywallFeatureDesc, { color: colors.textMuted }]}>{t('ui.profile.paywall.features.backup_restore.desc')}</Text>
            </View>
          </View>

          {/* Feature 4 */}
          <View style={styles.paywallFeature}>
            <View style={styles.paywallFeatureIcon}>
              <Ionicons name="heart" size={24} color={colors.primary} />
            </View>
            <View style={styles.paywallFeatureInfo}>
              <Text style={[styles.paywallFeatureTitle, { color: colors.text }]}>{t('ui.profile.paywall.features.support_dev.title')}</Text>
              <Text style={[styles.paywallFeatureDesc, { color: colors.textMuted }]}>{t('ui.profile.paywall.features.support_dev.desc')}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Price tag */}
        <View style={[styles.priceContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>{t('ui.profile.paywall.price_label')}</Text>
          <Text style={[styles.priceValue, { color: colors.primary }]}>{displayPrice}</Text>
          <Text style={[styles.priceSubtext, { color: colors.textMuted }]}>{t('ui.profile.paywall.price_subtext')}</Text>
        </View>

        {/* Actions */}
        <View style={styles.paywallBtnContainer}>
          <TouchableOpacity 
            style={[
              styles.paywallUpgradeBtn,
              { backgroundColor: colors.primary },
              isPurchasing && { opacity: 0.5 },
              (isPremium && !isEarly) && { backgroundColor: 'rgba(255, 255, 255, 0.16)' }
            ]} 
            onPress={onPurchase}
            disabled={isPurchasing || (isPremium && !isEarly)}
          >
            <Text style={styles.paywallUpgradeBtnText}>
              {(isPremium && !isEarly) ? t('ui.profile.paywall.upgrade_btn_applied') : t('ui.profile.paywall.upgrade_btn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.paywallRestoreBtn, isPurchasing && { opacity: 0.5 }]} 
            onPress={onRestore}
            disabled={isPurchasing}
          >
            <Text style={[styles.paywallRestoreBtnText, { color: colors.textMuted }]}>{t('ui.profile.paywall.restore_btn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paywallBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  paywallCard: { borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79,172,254,0.3)', maxHeight: '90%' },
  paywallHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottomWidth: 1, paddingBottom: 12 },
  paywallTitle: { fontSize: 22, fontWeight: 'bold' },
  closeBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  paywallSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20, fontWeight: '600', marginTop: 12 },
  paywallFeature: { flexDirection: 'row', marginBottom: 18, width: '100%', alignItems: 'flex-start' },
  paywallFeatureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(79,172,254,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(79,172,254,0.2)' },
  paywallFeatureInfo: { flex: 1 },
  paywallFeatureTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  paywallFeatureDesc: { fontSize: 13, lineHeight: 18 },
  priceContainer: { width: '100%', borderRadius: 12, padding: 16, alignItems: 'center', marginVertical: 12, borderWidth: 1 },
  priceLabel: { fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceValue: { fontSize: 26, fontWeight: 'bold' },
  priceSubtext: { fontSize: 12, marginTop: 4 },
  paywallBtnContainer: { width: '100%', gap: 10, marginTop: 12 },
  paywallUpgradeBtn: { width: '100%', minHeight: 48, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paywallUpgradeBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  paywallRestoreBtn: { width: '100%', minHeight: 44, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  paywallRestoreBtnText: { fontSize: 13, textDecorationLine: 'underline' },
});
