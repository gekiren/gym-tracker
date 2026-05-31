import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../src/theme';

// ==========================================
// 💡 FUTURE SPONSOR / AD BANNER FEATURE FLAG
// ==========================================
// 現在は「完全非表示（表示しない）」にするため、常に false に設定します。
// 将来的に広告枠を有効にする際は、ここを true に切り替えるだけで
// レイアウトがバナーサイズ（50px）分縮小され、広告が差し込まれます。
const ENABLE_SPONSOR_BANNER = false;

export default function SponsorBanner() {
  const { i18n } = useTranslation();

  // フラグが無効の場合は完全に非表示（何もレンダリングしない）
  if (!ENABLE_SPONSOR_BANNER) {
    return null;
  }

  const currentLang = i18n.language || 'ja';

  return (
    <View style={styles.bannerContainer}>
      {currentLang.startsWith('ja') ? (
        // 日本語環境用の表示（将来の純広告/自社スポンサー用プレースホルダー）
        <View style={[styles.innerBanner, styles.bannerJP]}>
          <Text style={styles.bannerText}>TreNote Sponsor Banner</Text>
        </View>
      ) : (
        // 海外環境（英語等）用の表示（将来のAdMob等のアドネットワーク用モックバナー）
        <View style={[styles.innerBanner, styles.bannerEN]}>
          <Text style={styles.bannerText}>Google AdMob Placeholder (320x50)</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    height: 50,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  innerBanner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerJP: {
    backgroundColor: 'rgba(79, 172, 254, 0.05)',
  },
  bannerEN: {
    backgroundColor: '#1e1e1e',
  },
  bannerText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
