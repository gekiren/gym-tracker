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

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef({ x: 0, y: 0 });
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
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
    } else {
      baseScale.setValue(1);
      pinchScale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
    }
    lastOffset.current = { x: 0, y: 0 };
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
      // スケール制限 (1.0 〜 4.0)
      if (finalScale < 1) {
        finalScale = 1;
      } else if (finalScale > 4) {
        finalScale = 4;
      }

      baseScale.setValue(finalScale);
      pinchScale.setValue(1);

      if (finalScale === 1) {
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
        lastOffset.current = { x: 0, y: 0 };
      }
    }
  };

  // 2. ネイティブパン（ドラッグ）イベント
  const onPanGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    if (currentBaseScale.current <= 1) return;

    const { translationX, translationY } = event.nativeEvent;
    const maxTx = (SCREEN_WIDTH * (currentBaseScale.current - 1)) / 2;
    const maxTy = (SCREEN_HEIGHT * (currentBaseScale.current - 1)) / 2;

    const nextX = lastOffset.current.x + translationX;
    const nextY = lastOffset.current.y + translationY;

    const clampedX = Math.max(-maxTx, Math.min(maxTx, nextX));
    const clampedY = Math.max(-maxTy, Math.min(maxTy, nextY));

    translateX.setValue(clampedX);
    translateY.setValue(clampedY);
  };

  const onPanHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, translationY } = event.nativeEvent;
      const maxTx = (SCREEN_WIDTH * (currentBaseScale.current - 1)) / 2;
      const maxTy = (SCREEN_HEIGHT * (currentBaseScale.current - 1)) / 2;

      const nextX = lastOffset.current.x + translationX;
      const nextY = lastOffset.current.y + translationY;

      const clampedX = Math.max(-maxTx, Math.min(maxTx, nextX));
      const clampedY = Math.max(-maxTy, Math.min(maxTy, nextY));

      lastOffset.current = { x: clampedX, y: clampedY };
      translateX.setValue(clampedX);
      translateY.setValue(clampedY);
    }
  };

  // 3. ダブルタップイベント
  const onDoubleTapStateChange = (event: TapGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      if (currentBaseScale.current > 1.2) {
        resetAll(true);
      } else {
        const targetScale = 2.5;
        baseScale.setValue(targetScale);
        pinchScale.setValue(1);
        lastOffset.current = { x: 0, y: 0 };
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
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
                waitFor={doubleTapRef}
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
                              { translateX },
                              { translateY },
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
