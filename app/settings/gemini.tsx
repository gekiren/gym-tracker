import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { AiCoachSection } from '../../components/profile/AiCoachSection';

export default function GeminiSettingsScreen() {
  const { t } = useTranslation();
  const settings = useWorkoutStore(state => state.settings);

  const isPremium = settings.premiumUntil === 'perpetual' || (settings.premiumUntil !== '' && !isNaN(Date.parse(settings.premiumUntil)) && Date.parse(settings.premiumUntil) > Date.now());
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;
  const maxTokens = (isPremium || isEarly) ? 20 : 5;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ui.profile.section_ai_coach') || 'Gemini連携 (AI Coach)'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AiCoachSection
          aiTokensBalance={settings.aiTokensBalance}
          maxTokens={maxTokens}
          isBasic={isBasic}
          t={t}
        />

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>連携モデル仕様</Text>
          </View>
          <Text style={styles.cardBody}>
            本アプリは Cloudflare Workers プロキシ経由で最新の高速・高性能AIモデル <Text style={styles.highlight}>Gemini 3.6 Flash</Text> と直接連携しています。
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success || '#4caf50'} style={{ marginRight: 6 }} />
              <Text style={styles.featureText}>個人のトレーニング履歴・セット内容に合わせたアドバイス</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success || '#4caf50'} style={{ marginRight: 6 }} />
              <Text style={styles.featureText}>安全なサーバープロキシ経由でAPIキーを漏洩させずに保護</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success || '#4caf50'} style={{ marginRight: 6 }} />
              <Text style={styles.featureText}>プレミアム・アーリーアダプターユーザーは毎月20回まで利用可能</Text>
            </View>
          </View>
        </View>

        {isBasic && (
          <TouchableOpacity 
            style={styles.upgradeBanner} 
            activeOpacity={0.8}
            onPress={() => router.push('/settings/account')}
          >
            <Ionicons name="ribbon-outline" size={24} color="#ffd700" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>利用枠を拡張する</Text>
              <Text style={styles.upgradeDesc}>プレミアムプランへアップグレードすると、AI利用枠が毎月20回に拡張されます。</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Theme.spacing.md, 
    paddingTop: 54, 
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  content: { padding: Theme.spacing.md, paddingBottom: 60 },
  infoCard: { 
    backgroundColor: Theme.colors.card, 
    borderRadius: Theme.borderRadius.md, 
    padding: Theme.spacing.md, 
    borderWidth: 1, 
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text },
  cardBody: { fontSize: 14, color: Theme.colors.textMuted, lineHeight: 20, marginBottom: 12 },
  highlight: { color: Theme.colors.primary, fontWeight: 'bold' },
  featureList: { gap: 8, marginTop: 4 },
  featureItem: { flexDirection: 'row', alignItems: 'center' },
  featureText: { fontSize: 13, color: Theme.colors.text, flex: 1 },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: '#ffd700',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
  },
  upgradeTitle: { fontSize: 15, fontWeight: 'bold', color: '#ffd700', marginBottom: 2 },
  upgradeDesc: { fontSize: 12, color: Theme.colors.textMuted },
});
