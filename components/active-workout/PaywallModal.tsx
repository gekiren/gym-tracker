import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface PaywallModalProps {
  isPurchasing: boolean;
  isPremium: boolean;
  isEarly: boolean;
  onClose: () => void;
  onPurchase: () => void;
  onRestore: () => void;
}

export function PaywallModal({
  isPurchasing,
  isPremium,
  isEarly,
  onClose,
  onPurchase,
  onRestore
}: PaywallModalProps) {
  return (
    <View style={styles.paywallBg}>
      <View style={styles.paywallCard}>
        {/* Header */}
        <View style={styles.paywallHeader}>
          <Text style={styles.paywallTitle}>👑 TreNote Premium</Text>
          <TouchableOpacity onPress={onClose} disabled={isPurchasing}>
            <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ width: '100%', marginVertical: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.paywallSubtitle}>
            プレミアムプランへアップグレードして、すべての機能制限を解除しましょう！
          </Text>

          {/* Feature 1 */}
          <View style={styles.paywallFeature}>
            <View style={styles.paywallFeatureIcon}>
              <Ionicons name="sparkles" size={24} color="#4facfe" />
            </View>
            <View style={styles.paywallFeatureInfo}>
              <Text style={styles.paywallFeatureTitle}>AIトレーナー利用枠の拡張</Text>
              <Text style={styles.paywallFeatureDesc}>ベーシックプランの月5回制限から、月20回までに利用枠が拡張されます。</Text>
            </View>
          </View>

          {/* Feature 2 */}
          <View style={styles.paywallFeature}>
            <View style={styles.paywallFeatureIcon}>
              <Ionicons name="copy" size={24} color="#4facfe" />
            </View>
            <View style={styles.paywallFeatureInfo}>
              <Text style={styles.paywallFeatureTitle}>インポート機能の解放</Text>
              <Text style={styles.paywallFeatureDesc}>既存のルーティンや過去のワークアウト履歴から、コピーして新しいルーティンを作成できるようになります。</Text>
            </View>
          </View>

          {/* Feature 3 */}
          <View style={styles.paywallFeature}>
            <View style={styles.paywallFeatureIcon}>
              <Ionicons name="cloud-upload-outline" size={24} color="#4facfe" />
            </View>
            <View style={styles.paywallFeatureInfo}>
              <Text style={styles.paywallFeatureTitle}>バックアップ・復元機能の解放</Text>
              <Text style={styles.paywallFeatureDesc}>履歴や設定をファイルとして安全にエクスポート/インポートできるようになります。</Text>
            </View>
          </View>

          {/* Feature 4 */}
          <View style={styles.paywallFeature}>
            <View style={styles.paywallFeatureIcon}>
              <Ionicons name="heart" size={24} color="#4facfe" />
            </View>
            <View style={styles.paywallFeatureInfo}>
              <Text style={styles.paywallFeatureTitle}>アプリの開発支援</Text>
              <Text style={styles.paywallFeatureDesc}>より便利な機能の追加や安定したサーバー運用のための開発継続をサポートできます。</Text>
            </View>
          </View>
        </ScrollView>

        {/* Price tag */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>プレミアムプラン (買い切り型)</Text>
          <Text style={styles.priceValue}>¥500</Text>
          <Text style={styles.priceSubtext}>※一度の購入で永久にご利用いただけます</Text>
        </View>

        {/* Actions */}
        <View style={styles.paywallBtnContainer}>
          <TouchableOpacity 
            style={[
              styles.paywallUpgradeBtn, 
              isPurchasing && { opacity: 0.5 },
              (isPremium && !isEarly) && { backgroundColor: '#555', shadowColor: 'transparent', elevation: 0 }
            ]} 
            onPress={onPurchase}
            disabled={isPurchasing || (isPremium && !isEarly)}
          >
            <Text style={styles.paywallUpgradeBtnText}>
              {(isPremium && !isEarly) ? 'プレミアムプラン適用済み' : 'プレミアムにアップグレードする'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.paywallRestoreBtn, isPurchasing && { opacity: 0.5 }]} 
            onPress={onRestore}
            disabled={isPurchasing}
          >
            <Text style={styles.paywallRestoreBtnText}>購入情報を復元する (Restore)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paywallBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  paywallCard: { backgroundColor: Theme.colors.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 420, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79,172,254,0.3)', maxHeight: '90%' },
  paywallHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: 12 },
  paywallTitle: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text },
  paywallSubtitle: { fontSize: 14, color: Theme.colors.text, textAlign: 'center', lineHeight: 22, marginBottom: 20, fontWeight: '600', marginTop: 12 },
  paywallFeature: { flexDirection: 'row', marginBottom: 18, width: '100%', alignItems: 'flex-start' },
  paywallFeatureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(79,172,254,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(79,172,254,0.2)' },
  paywallFeatureInfo: { flex: 1 },
  paywallFeatureTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  paywallFeatureDesc: { fontSize: 13, color: Theme.colors.textMuted, lineHeight: 18 },
  priceContainer: { backgroundColor: '#1c1c1e', width: '100%', borderRadius: 12, padding: 16, alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: Theme.colors.border },
  priceLabel: { fontSize: 12, color: Theme.colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceValue: { fontSize: 26, fontWeight: 'bold', color: '#4facfe' },
  priceSubtext: { fontSize: 11, color: Theme.colors.textMuted, marginTop: 4 },
  paywallBtnContainer: { width: '100%', gap: 10, marginTop: 12 },
  paywallUpgradeBtn: { backgroundColor: Theme.colors.primary, width: '100%', paddingVertical: 14, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: Theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  paywallUpgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  paywallRestoreBtn: { width: '100%', paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  paywallRestoreBtnText: { color: Theme.colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
