import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../src/theme';
import { ObsidianSection } from '../../components/profile/ObsidianSection';

export default function ObsidianSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
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
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ── Googleドライブ AI双方向同期カード ── */}
        <TouchableOpacity
          style={styles.exportCard}
          onPress={() => router.push('/settings/google-drive-sync' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.exportCardLeft}>
            <View style={[styles.exportIconBox, { backgroundColor: 'rgba(66, 133, 244, 0.14)' }]}>
              <Ionicons name="logo-google" size={24} color="#4285f4" />
            </View>
            <View style={styles.exportTextBox}>
              <Text style={styles.exportCardTitle}>Googleドライブ AI双方向同期</Text>
              <Text style={styles.exportCardDesc}>
                記録の随時アップロード・AIエージェント提案の随時読み込み
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ── Obsidian連携セクション ── */}
        <ObsidianSection t={t} />

      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 54,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    content: { padding: 16, paddingBottom: 80 },

    // データ出力カード
    exportCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
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
      color: colors.text,
      marginBottom: 3,
    },
    exportCardDesc: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
  });
