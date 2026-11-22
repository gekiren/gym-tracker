import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/theme';
import { useGamificationStore } from '../src/store/gamificationStore';
import { useFeatureUnlockStore } from '../src/store/featureUnlockStore';
import { MEDAL_RARITY_REWARDS } from '../src/constants/gamificationConstants';

const TOAST_DURATION = 3200;

export const MedalUnlockToast: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const pendingMedalNotice = useGamificationStore((state) => state.pendingMedalNotice);
  const clearPendingMedalNotice = useGamificationStore((state) => state.clearPendingMedalNotice);
  const pendingPointNotice = useFeatureUnlockStore((state) => state.pendingPointNotice);

  // PointAwardToast と表示が重ならないよう待機する
  const activeNotice = !pendingPointNotice ? pendingMedalNotice : null;

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback((navigateToGamification = false) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      clearPendingMedalNotice();
      if (navigateToGamification) {
        router.push('/gamification' as any);
      }
    });
  }, [clearPendingMedalNotice, opacity, translateY]);

  useEffect(() => {
    if (activeNotice && activeNotice.medals.length > 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      translateY.setValue(-100);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        dismissToast(false);
      }, TOAST_DURATION);
    } else {
      translateY.setValue(-120);
      opacity.setValue(0);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [activeNotice, dismissToast, opacity, translateY]);

  if (!activeNotice || activeNotice.medals.length === 0) {
    return null;
  }

  const primaryMedal = activeNotice.medals[0];
  const rarityMeta = MEDAL_RARITY_REWARDS[primaryMedal.rarity];
  const extraCount = activeNotice.medals.length - 1;
  const medalTitle = isEn ? primaryMedal.titleEn : primaryMedal.titleJa;
  const displayTitle =
    extraCount > 0
      ? isEn
        ? `${medalTitle} +${extraCount} more`
        : `${medalTitle} 他${extraCount}個`
      : medalTitle;

  const topPosition = Math.max(insets.top + 8, 16);

  return (
    <View style={[styles.overlayContainer, { top: topPosition }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toastCard,
          {
            backgroundColor: colors.card,
            borderColor: rarityMeta.color,
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.touchableArea}
          activeOpacity={0.88}
          onPress={() => dismissToast(true)}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: rarityMeta.bgColor, borderColor: rarityMeta.color },
            ]}
          >
            <Ionicons
              name={primaryMedal.icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color={rarityMeta.color}
            />
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.eyebrowText, { color: rarityMeta.color }]}>
                {isEn ? 'MEDAL UNLOCKED!' : '実績メダル獲得！'}
              </Text>
              <View style={styles.rewardBadges}>
                <View style={styles.xpBadge}>
                  <Text style={styles.xpBadgeText}>+{activeNotice.totalBonusXp} XP</Text>
                </View>
                <View style={styles.pointBadge}>
                  <Text style={styles.pointBadgeText}>+{activeNotice.totalBonusPoints} P</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
              {displayTitle}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99998,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toastCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  touchableArea: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 6,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  rewardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpBadge: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  xpBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4facfe',
  },
  pointBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  pointBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  titleText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
