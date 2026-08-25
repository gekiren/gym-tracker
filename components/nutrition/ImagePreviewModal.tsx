import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView,
} from 'react-native';
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

export default function ImagePreviewModal({
  visible,
  imageUri,
  log,
  onClose,
  onDeletePhoto,
}: Props) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const lastTapRef = useRef<number>(0);

  if (!visible || !imageUri) return null;

  // ダブルタップでの拡大・元サイズ切り替え
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (zoomScale > 1) {
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        setZoomScale(1);
      } else {
        setZoomScale(2.5);
      }
    }
    lastTapRef.current = now;
  };

  const handleScroll = (event: any) => {
    if (event.nativeEvent?.zoomScale) {
      setZoomScale(event.nativeEvent.zoomScale);
    }
  };

  const title = log?.name || '食事写真';
  const dateStr = log?.date
    ? `${log.date} ${log.meal_time || ''}`.trim()
    : undefined;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SafeAreaView style={styles.safeAreaHeader}>
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
              {Boolean(dateStr) && (
                <Text style={styles.headerSubTitle}>{dateStr}</Text>
              )}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={26} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* ズーム可能画像コンテナ */}
        <TouchableWithoutFeedback onPress={handleDoubleTap}>
          <View style={styles.imageWrapper}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              maximumZoomScale={4.0}
              minimumZoomScale={1.0}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              <Image
                source={{ uri: imageUri }}
                style={[
                  styles.image,
                  {
                    transform: [{ scale: zoomScale }],
                  },
                ]}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>

        {/* フッターアクションバー */}
        <SafeAreaView style={styles.safeAreaFooter}>
          <View style={styles.footer}>
            <Text style={styles.zoomHintText}>
              💡 ピンチ操作やダブルタップで拡大・移動できます
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
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000ee',
    justifyContent: 'space-between',
  },
  safeAreaHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  safeAreaFooter: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  zoomHintText: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
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
    marginLeft: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
});
