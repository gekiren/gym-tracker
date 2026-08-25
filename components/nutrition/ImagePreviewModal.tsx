import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  PanResponder,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MealLog } from '../../src/db/types';

interface Props {
  visible: boolean;
  imageUri: string | null;
  log?: MealLog | null;
  onClose: () => void;
  onDeletePhoto?: (log: MealLog) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 2点間の距離計算ヘルパー（ピンチズーム用）
function getTouchesDistance(touches: any[]) {
  if (!touches || touches.length < 2) return 0;
  const [t1, t2] = touches;
  const dx = t1.pageX - t2.pageX;
  const dy = t1.pageY - t2.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function ImagePreviewModal({
  visible,
  imageUri,
  log,
  onClose,
  onDeletePhoto,
}: Props) {
  const insets = useSafeAreaInsets();

  // アニメーション・トランスフォーム値
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  // 現在の値を保持するRef
  const scaleRef = useRef(1);
  const translateXRef = useRef(0);
  const translateYRef = useRef(0);

  // ジェスチャー状態管理Ref
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Animated の値を State/Ref にリアルタイム同期
  useEffect(() => {
    const subScale = scaleAnim.addListener(({ value }) => {
      scaleRef.current = value;
    });
    const subX = translateXAnim.addListener(({ value }) => {
      translateXRef.current = value;
    });
    const subY = translateYAnim.addListener(({ value }) => {
      translateYRef.current = value;
    });

    return () => {
      scaleAnim.removeListener(subScale);
      translateXAnim.removeListener(subX);
      translateYAnim.removeListener(subY);
    };
  }, []);

  // モーダル非表示時に状態リセット
  useEffect(() => {
    if (!visible) {
      resetTransform();
    }
  }, [visible]);

  const resetTransform = (animated = false) => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.spring(translateXAnim, { toValue: 0, useNativeDriver: true }),
        Animated.spring(translateYAnim, { toValue: 0, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(1);
      translateXAnim.setValue(0);
      translateYAnim.setValue(0);
    }
    scaleRef.current = 1;
    translateXRef.current = 0;
    translateYRef.current = 0;
    initialPinchDistRef.current = null;
    lastTouchPosRef.current = null;
  };

  // ドラッグ可動域（バウンダリ）制限計算
  const clampTranslation = (tx: number, ty: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    const maxTx = (SCREEN_WIDTH * (currentScale - 1)) / 2;
    const maxTy = (SCREEN_HEIGHT * (currentScale - 1)) / 2;
    const clampedX = Math.max(-maxTx, Math.min(maxTx, tx));
    const clampedY = Math.max(-maxTy, Math.min(maxTy, ty));
    return { x: clampedX, y: clampedY };
  };

  // ダブルタップでの拡大・元サイズ切替
  const handleDoubleTap = () => {
    if (scaleRef.current > 1.2) {
      resetTransform(true);
    } else {
      const targetScale = 2.5;
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: targetScale, useNativeDriver: true }),
        Animated.spring(translateXAnim, { toValue: 0, useNativeDriver: true }),
        Animated.spring(translateYAnim, { toValue: 0, useNativeDriver: true }),
      ]).start();
    }
  };

  // PanResponder によるピンチ ＆ パン移動（リアルタイム2本指検出最適化版）
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          initialPinchDistRef.current = getTouchesDistance(touches);
          initialScaleRef.current = scaleRef.current;
        } else if (touches && touches.length === 1) {
          initialPinchDistRef.current = null;
          lastTouchPosRef.current = { x: touches[0].pageX, y: touches[0].pageY };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        // 1. 2本指ピンチ操作
        if (touches && touches.length >= 2) {
          const currentDist = getTouchesDistance(touches);
          if (currentDist > 0) {
            // 後から2本指になった場合の初期動的セット
            if (!initialPinchDistRef.current || initialPinchDistRef.current <= 0) {
              initialPinchDistRef.current = currentDist;
              initialScaleRef.current = scaleRef.current;
            } else {
              const ratio = currentDist / initialPinchDistRef.current;
              let newScale = initialScaleRef.current * ratio;
              newScale = Math.max(0.8, Math.min(4.5, newScale));
              scaleAnim.setValue(newScale);

              // スケール変更に伴うパン可動制限の適用
              const clamped = clampTranslation(
                translateXRef.current,
                translateYRef.current,
                newScale
              );
              translateXAnim.setValue(clamped.x);
              translateYAnim.setValue(clamped.y);
            }
          }
        }
        // 2. 1本指ドラッグ（パン移動）
        else if (touches && touches.length === 1) {
          initialPinchDistRef.current = null; // ピンチ解除

          if (scaleRef.current > 1) {
            if (lastTouchPosRef.current) {
              const dx = touches[0].pageX - lastTouchPosRef.current.x;
              const dy = touches[0].pageY - lastTouchPosRef.current.y;
              lastTouchPosRef.current = { x: touches[0].pageX, y: touches[0].pageY };

              const nextTx = translateXRef.current + dx;
              const nextTy = translateYRef.current + dy;
              const clamped = clampTranslation(nextTx, nextTy, scaleRef.current);

              translateXAnim.setValue(clamped.x);
              translateYAnim.setValue(clamped.y);
            } else {
              lastTouchPosRef.current = { x: touches[0].pageX, y: touches[0].pageY };
            }
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        initialPinchDistRef.current = null;
        lastTouchPosRef.current = null;

        // タップ判定 (ダブルタップ検知)
        const isTap = Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6;
        if (isTap && (!evt.nativeEvent.touches || evt.nativeEvent.touches.length === 0)) {
          const now = Date.now();
          if (now - lastTapTimeRef.current < 300) {
            handleDoubleTap();
            lastTapTimeRef.current = 0;
            return;
          }
          lastTapTimeRef.current = now;
        }

        // スケール端数クランプ (1.0 未満は 1.0 に戻す、4.0 超は 4.0 に固定)
        let finalScale = scaleRef.current;
        if (finalScale < 1) {
          finalScale = 1;
        } else if (finalScale > 4.0) {
          finalScale = 4.0;
        }

        const clamped = clampTranslation(
          translateXRef.current,
          translateYRef.current,
          finalScale
        );

        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: finalScale, useNativeDriver: true }),
          Animated.spring(translateXAnim, { toValue: clamped.x, useNativeDriver: true }),
          Animated.spring(translateYAnim, { toValue: clamped.y, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  if (!visible || !imageUri) return null;

  const title = log?.name || '食事写真';
  const dateStr = log?.date
    ? `${log.date} ${log.meal_time || ''}`.trim()
    : undefined;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* 不透過ヘッダー */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {Boolean(dateStr) && (
              <Text style={styles.headerSubTitle}>{dateStr}</Text>
            )}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* パン＆ズーム可能画像メイン領域 */}
        <View style={styles.imageViewerBox} {...panResponder.panHandlers}>
          <Animated.Image
            source={{ uri: imageUri }}
            style={[
              styles.image,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateX: translateXAnim },
                  { translateY: translateYAnim },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </View>

        {/* 不透過フッター */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Text style={styles.zoomHintText}>
            💡 2本指でピンチ拡大、またはダブルタップで拡大・ドラッグ移動できます
          </Text>

          {Boolean(onDeletePhoto && log) && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDeletePhoto!(log!)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
              <Text style={styles.deleteBtnText}>写真のみ削除</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#000000',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitleBox: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubTitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#262626',
  },
  imageViewerBox: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    zIndex: 10,
  },
  zoomHintText: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
    marginRight: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef444422',
    borderWidth: 1,
    borderColor: '#ef444466',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
});
