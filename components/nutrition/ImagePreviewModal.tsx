import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  GestureHandlerRootView,
  State,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
  TapGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { MealLog } from '../../src/db/types';

interface Props {
  visible: boolean;
  imageUri: string | null;
  log?: MealLog | null;
  onClose: () => void;
  onDeletePhoto?: (log: MealLog) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ImagePreviewModal({
  visible,
  imageUri,
  log,
  onClose,
  onDeletePhoto,
}: Props) {
  const insets = useSafeAreaInsets();

  // ジェスチャーRef
  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);
  const doubleTapRef = useRef<TapGestureHandler>(null);

  // Animated 値 (ネイティブアタッチメント用)
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = Animated.multiply(baseScale, pinchScale);

  // ドラッグ用: setOffset + flattenOffset パターン（リアルタイム追従の正攻法）
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const currentBaseScale = useRef(1);

  // Animated 値の記録
  useEffect(() => {
    const sub = baseScale.addListener(({ value }) => {
      currentBaseScale.current = value;
    });
    return () => baseScale.removeListener(sub);
  }, []);

  // モーダル非表示時のリセット
  useEffect(() => {
    if (!visible) {
      resetAll();
    }
  }, [visible]);

  const resetAll = (animated = false) => {
    if (animated) {
      Animated.parallel([
        Animated.spring(baseScale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(pinchScale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(panX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(panY, { toValue: 0, useNativeDriver: true }),
      ]).start(() => {
        panX.setOffset(0);
        panX.setValue(0);
        panY.setOffset(0);
        panY.setValue(0);
      });
    } else {
      baseScale.setValue(1);
      pinchScale.setValue(1);
      panX.setOffset(0);
      panX.setValue(0);
      panY.setOffset(0);
      panY.setValue(0);
    }
    currentBaseScale.current = 1;
  };

  // 1. ネイティブピンチイベント
  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true }
  );

  const onPinchHandlerStateChange = (event: PinchGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      let finalScale = currentBaseScale.current * event.nativeEvent.scale;
      if (finalScale < 1) finalScale = 1;
      else if (finalScale > 4) finalScale = 4;

      baseScale.setValue(finalScale);
      pinchScale.setValue(1);

      if (finalScale === 1) {
        Animated.parallel([
          Animated.spring(panX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }),
        ]).start(() => {
          panX.setOffset(0);
          panX.setValue(0);
          panY.setOffset(0);
          panY.setValue(0);
        });
      }
    }
  };

  // 2. ネイティブパン: Animated.event 直結でリアルタイム追従
  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: panX, translationY: panY } }],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { state } = event.nativeEvent;

    if (state === State.BEGAN) {
      // ジェスチャー開始時: 現在の累積位置をオフセットにセットし、
      // translationX/Y をゼロから再カウントさせる
      panX.flattenOffset();
      panX.setOffset((panX as any)._value ?? 0);
      panX.setValue(0);
      panY.flattenOffset();
      panY.setOffset((panY as any)._value ?? 0);
      panY.setValue(0);
    }

    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      // オフセットに累積し、次のドラッグに備える
      panX.flattenOffset();
      panY.flattenOffset();

      // バウンダリクランプ: 拡大中のみ適用
      if (currentBaseScale.current > 1) {
        const maxTx = (SCREEN_WIDTH * (currentBaseScale.current - 1)) / 2;
        const maxTy = (SCREEN_HEIGHT * (currentBaseScale.current - 1)) / 2;
        // 内部値を取得してクランプ
        const currentX = (panX as any)._value ?? 0;
        const currentY = (panY as any)._value ?? 0;
        const clampedX = Math.max(-maxTx, Math.min(maxTx, currentX));
        const clampedY = Math.max(-maxTy, Math.min(maxTy, currentY));
        if (clampedX !== currentX || clampedY !== currentY) {
          Animated.parallel([
            Animated.spring(panX, { toValue: clampedX, useNativeDriver: true }),
            Animated.spring(panY, { toValue: clampedY, useNativeDriver: true }),
          ]).start(() => {
            panX.setOffset(clampedX);
            panX.setValue(0);
            panY.setOffset(clampedY);
            panY.setValue(0);
          });
        }
      } else {
        // 等倍以下なら中央へ戻す
        Animated.parallel([
          Animated.spring(panX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }),
        ]).start(() => {
          panX.setOffset(0);
          panX.setValue(0);
          panY.setOffset(0);
          panY.setValue(0);
        });
      }
    }
  };

  // 3. ダブルタップイベント
  const onDoubleTapStateChange = (event: TapGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      if (currentBaseScale.current > 1.2) {
        resetAll(true);
      } else {
        baseScale.setValue(2.5);
        pinchScale.setValue(1);
        panX.setOffset(0);
        panX.setValue(0);
        panY.setOffset(0);
        panY.setValue(0);
      }
    }
  };

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
      <GestureHandlerRootView style={styles.container}>
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

        {/* ネイティブジェスチャーメイン領域 (Pinch + Pan + DoubleTap) */}
        <View style={styles.imageViewerBox}>
          <TapGestureHandler
            ref={doubleTapRef}
            numberOfTaps={2}
            onHandlerStateChange={onDoubleTapStateChange}
          >
            <Animated.View style={styles.gestureContainer}>
              <PanGestureHandler
                ref={panRef}
                simultaneousHandlers={[pinchRef]}
                minDist={10}
                onGestureEvent={onPanGestureEvent}
                onHandlerStateChange={onPanHandlerStateChange}
              >
                <Animated.View style={styles.gestureContainer}>
                  <PinchGestureHandler
                    ref={pinchRef}
                    simultaneousHandlers={[panRef]}
                    onGestureEvent={onPinchGestureEvent}
                    onHandlerStateChange={onPinchHandlerStateChange}
                  >
                    <Animated.View style={styles.gestureContainer}>
                      <Animated.Image
                        source={{ uri: imageUri }}
                        style={[
                          styles.image,
                          {
                            transform: [
                              { scale },
                              { translateX: panX },
                              { translateY: panY },
                            ],
                          },
                        ]}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </PinchGestureHandler>
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </TapGestureHandler>
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
      </GestureHandlerRootView>
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
  gestureContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
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
