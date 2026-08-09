import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { ObsidianSection } from '../../components/profile/ObsidianSection';

export default function ObsidianSettingsScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>データ出力 & Obsidian連携</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── データ出力カード ── */}
        <TouchableOpacity
          id="btn-data-export"
          style={styles.exportCard}
          onPress={() => router.push('/settings/export' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.exportCardLeft}>
            <View style={styles.exportIconBox}>
              <Ionicons name="document-text-outline" size={24} color="#4caf50" />
            </View>
            <View style={styles.exportTextBox}>
              <Text style={styles.exportCardTitle}>日次ログ Markdown 出力</Text>
              <Text style={styles.exportCardDesc}>
                筋トレ・ライフログのサマリー生成・クリップボードコピー・ファイル共有
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} />
        </TouchableOpacity>

        {/* ── Obsidian連携セクション ── */}
        <ObsidianSection t={t} />

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
    borderBottomColor: Theme.colors.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  content: { padding: Theme.spacing.md, paddingBottom: 80 },

  // データ出力カード
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  exportCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  exportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportTextBox: { flex: 1 },
  exportCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 3,
  },
  exportCardDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 16,
  },
});
