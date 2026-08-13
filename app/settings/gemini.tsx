import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { AiCoachSection } from '../../components/profile/AiCoachSection';

export default function GeminiSettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore(state => state.settings);
  const setPreferredAiModel = useSettingsStore(state => state.setPreferredAiModel);

  const isPremium = settings.isPremium;
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;
  const maxTokens = (isPremium || isEarly) ? 20 : 5;
  const preferredModel = settings.preferredAiModel || 'gemini';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ui.profile.section_ai_coach') || 'AI Coach 設定'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AiCoachSection
          aiTokensBalance={settings.aiTokensBalance}
          maxTokens={maxTokens}
          isBasic={isBasic}
          t={t}
        />

        {/* AI Model Selector Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="options-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>使用AIモデルの選択</Text>
          </View>
          <Text style={styles.cardSubText}>
            AI Coach がアドバイスを作成する際に優先して使用するモデルを選択できます。
          </Text>

          <View style={styles.modelOptionsContainer}>
            {/* Gemini Option */}
            <TouchableOpacity
              style={[
                styles.modelCard,
                preferredModel === 'gemini' && styles.modelCardActive
              ]}
              activeOpacity={0.8}
              onPress={() => setPreferredAiModel('gemini')}
            >
              <View style={styles.modelCardTop}>
                <View style={styles.modelTitleRow}>
                  <Ionicons 
                    name={preferredModel === 'gemini' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={preferredModel === 'gemini' ? Theme.colors.primary : Theme.colors.textMuted} 
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.modelName}>Gemini 3.6 Flash</Text>
                </View>
                <View style={styles.badgeRecommended}>
                  <Text style={styles.badgeRecommendedText}>推奨・高速</Text>
                </View>
              </View>
              <Text style={styles.modelDescription}>
                Googleの最新軽量AI。超高速な応答速度と高いトレーニング理解度でスマートにアドバイスします。
              </Text>
            </TouchableOpacity>

            {/* DeepSeek Option */}
            <TouchableOpacity
              style={[
                styles.modelCard,
                preferredModel === 'deepseek' && styles.modelCardActive
              ]}
              activeOpacity={0.8}
              onPress={() => setPreferredAiModel('deepseek')}
            >
              <View style={styles.modelCardTop}>
                <View style={styles.modelTitleRow}>
                  <Ionicons 
                    name={preferredModel === 'deepseek' ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    color={preferredModel === 'deepseek' ? Theme.colors.primary : Theme.colors.textMuted} 
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.modelName}>DeepSeek V4 Pro</Text>
                </View>
                <View style={styles.badgeAnalytical}>
                  <Text style={styles.badgeAnalyticalText}>深層分析</Text>
                </View>
              </View>
              <Text style={styles.modelDescription}>
                高度な論理推論に強いオープン重みAI。トレーニングプログラムや理論の深い解説・分析が得意です。
              </Text>
            </TouchableOpacity>
          </View>

          {/* Redundancy Note */}
          <View style={styles.fallbackNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.fallbackNoticeText}>
              障害・混雑時には自動でもう一方のモデルに相互フォールバックし、中断なく応答を提供します。
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>連携仕様・セキュリティ</Text>
          </View>
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
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text },
  cardSubText: { fontSize: 13, color: Theme.colors.textMuted, lineHeight: 18, marginBottom: 14 },
  modelOptionsContainer: { gap: 10, marginBottom: 12 },
  modelCard: {
    backgroundColor: '#121214',
    borderRadius: Theme.borderRadius.sm || 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 12,
  },
  modelCardActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: 'rgba(79, 172, 254, 0.08)',
  },
  modelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  modelDescription: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 17,
    paddingLeft: 28,
  },
  badgeRecommended: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeRecommendedText: {
    fontSize: 11,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  badgeAnalytical: {
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeAnalyticalText: {
    fontSize: 11,
    color: '#ba68c8',
    fontWeight: 'bold',
  },
  fallbackNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
  },
  fallbackNoticeText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  infoCard: { 
    backgroundColor: Theme.colors.card, 
    borderRadius: Theme.borderRadius.md, 
    padding: Theme.spacing.md, 
    borderWidth: 1, 
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg
  },
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
