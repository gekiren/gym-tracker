import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeatureUnlockStore } from '../src/store/featureUnlockStore';
import { Theme } from '../src/theme';

const TOAST_DURATION = 2600; // 表示時間 (ms)

export const PointAwardToast: React.FC = () => {
  const insets = useSafeAreaInsets();
  const pendingPointNotice = useFeatureUnlockStore((state) => state.pendingPointNotice);
  const clearPendingPointNotice = useFeatureUnlockStore((state) => state.clearPendingPointNotice);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      clearPendingPointNotice();
    });
  };

  useEffect(() => {
    if (pendingPointNotice) {
      // 既存のタイマーをクリア
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // 出現アニメーション
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

      // 自動消去タイマー
      timerRef.current = setTimeout(() => {
        dismissToast();
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
  }, [pendingPointNotice]);

  if (!pendingPointNotice) {
    return null;
  }

  const topPosition = Math.max(insets.top + 8, 16);

  return (
    <View style={[styles.overlayContainer, { top: topPosition }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toastCard,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.touchableArea}
          activeOpacity={0.9}
          onPress={dismissToast}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="diamond" size={22} color="#ffd700" />
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText} numberOfLines={1}>
                {pendingPointNotice.title}
              </Text>
              <View style={styles.pointBadge}>
                <Text style={styles.pointBadgeText}>+{pendingPointNotice.points}P</Text>
              </View>
            </View>
            <Text style={styles.descText} numberOfLines={1}>
              {pendingPointNotice.desc || `+${pendingPointNotice.points} P を獲得しました`}
            </Text>
          </View>

          <Ionicons name="close" size={18} color={Theme.colors.textMuted} style={styles.closeIcon} />
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
    zIndex: 99999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toastCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1e2029',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  touchableArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  pointBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  pointBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  descText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  closeIcon: {
    marginLeft: 4,
    opacity: 0.8,
  },
});
