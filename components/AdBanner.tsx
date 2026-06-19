import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AD_CONFIG } from '../src/config/adConfig';
import { useWorkoutStore } from '../src/store/workoutStore';

function AdBannerInternal() {
  const settings = useWorkoutStore(state => state.settings);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [adFailed, setAdFailed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [promoIndex, setPromoIndex] = useState(0);

  // Define self-promotions for Premium subscription
  const promos = [
    {
      title: t('ui.ads.promo_ai_title') || 'AIパーソナルトレーナー解放',
      desc: t('ui.ads.promo_ai_desc') || 'あなた専用のメニュー作成や指導を受けましょう！',
      icon: 'sparkles'
    },
    {
      title: t('ui.ads.promo_backup_title') || 'クラウドバックアップ機能',
      desc: t('ui.ads.promo_backup_desc') || '大切なトレーニング履歴を安全に保存・移行できます。',
      icon: 'cloud-upload'
    },
    {
      title: t('ui.ads.promo_limit_title') || '無制限のルーティン作成',
      desc: t('ui.ads.promo_limit_desc') || '作成上限を解除して、自由なメニュー設定を。',
      icon: 'barbell'
    }
  ];

  useEffect(() => {
    // Fade in banner once mounted
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Rotate promotional campaigns every 6 seconds
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % promos.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  // Retry loading Google AdMob after 30 seconds if it previously failed (e.g. offline)
  useEffect(() => {
    if (!adFailed) return;

    const retryTimeout = setTimeout(() => {
      setAdFailed(false);
    }, 30000);

    return () => clearTimeout(retryTimeout);
  }, [adFailed]);

  // プレミアム・アーリーアダプターには広告を一切表示しない（フック群の後に配置）
  const isPremiumOrEarly = settings.isPremium || settings.isEarlyAdopter;
  if (isPremiumOrEarly) {
    return null;
  }

  const handlePromoPress = () => {
    router.navigate('/(tabs)/profile');
  };

  const adUnitId = AD_CONFIG.getBannerAdUnitId();

  const bannerPaddingBottom = Platform.OS === 'android'
    ? Math.max(insets.bottom + 12, 32)
    : insets.bottom;

  if (adFailed) {
    const currentPromo = promos[promoIndex];
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim, height: 52 + bannerPaddingBottom, paddingBottom: bannerPaddingBottom }]}>
        <TouchableOpacity
          style={styles.promoPressable}
          onPress={handlePromoPress}
          activeOpacity={0.85}
        >
          <View style={styles.promoContent}>
            <View style={styles.iconCircle}>
              <Ionicons name={currentPromo.icon as any} size={15} color={Theme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.promoTag}>PREMIUM</Text>
                <Text style={styles.promoTitle} numberOfLines={1}>{currentPromo.title}</Text>
              </View>
              <Text style={styles.promoDesc} numberOfLines={1}>{currentPromo.desc}</Text>
            </View>
            <View style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>{t('ui.ads.upgrade_btn') || '詳細'}</Text>
              <Ionicons name="chevron-forward" size={12} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, height: 52 + bannerPaddingBottom, paddingBottom: bannerPaddingBottom }]}>
      <View style={styles.adWrapper}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={(error) => {
            console.warn('AdMob Banner failed to load. Displaying Premium promo banner instead.', error);
            setAdFailed(true);
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 52,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  adWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoPressable: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(79, 172, 254, 0.04)',
  },
  promoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  promoTag: {
    fontSize: 8,
    fontWeight: '900',
    color: Theme.colors.primary,
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginRight: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  promoDesc: {
    fontSize: 10,
    color: Theme.colors.textMuted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    marginRight: 1,
  },
});

class AdBannerErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('AdBanner component crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default function AdBanner() {
  return (
    <AdBannerErrorBoundary>
      <AdBannerInternal />
    </AdBannerErrorBoundary>
  );
}
