import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { useSettingsStore, FeatureId } from '../../src/store/settingsStore';

interface FeatureMeta {
  id: FeatureId;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

const FEATURE_METAS: Record<FeatureId, FeatureMeta> = {
  workout: {
    id: 'workout',
    title: '筋トレ',
    desc: 'ワークアウトの記録・タイマー・履歴',
    icon: 'barbell',
    iconColor: '#4facfe',
  },
  body: {
    id: 'body',
    title: '体組成＆筋肥大限界',
    desc: '体重・体脂肪率・骨格限界モデルの追跡',
    icon: 'body',
    iconColor: '#38bdf8',
  },
  water: {
    id: 'water',
    title: '水分管理',
    desc: '毎日の水分摂取・カフェイン量の記録',
    icon: 'water',
    iconColor: '#00d2ff',
  },
  nutrition: {
    id: 'nutrition',
    title: '栄養＆食事管理',
    desc: 'カロリーおよびPFCバランスの記録',
    icon: 'restaurant',
    iconColor: '#10b981',
  },
  zikan: {
    id: 'zikan',
    title: '24時間管理',
    desc: '1日の時間内訳・行動ログ',
    icon: 'time',
    iconColor: '#ff9800',
  },
  routine: {
    id: 'routine',
    title: 'ルーティン管理',
    desc: '日々の習慣・ルーティンの達成記録',
    icon: 'repeat',
    iconColor: '#4caf50',
  },
  voice_ai: {
    id: 'voice_ai',
    title: '音声AIアシスタント',
    desc: 'Gemini Live API による音声リアルタイム対話・自動記録',
    icon: 'mic',
    iconColor: '#64b4ff',
  },
};

const DEFAULT_ORDER: FeatureId[] = ['workout', 'body', 'water', 'nutrition', 'zikan', 'routine', 'voice_ai'];
const DEFAULT_VISIBILITY: Record<FeatureId, boolean> = {
  workout: true,
  body: true,
  water: true,
  nutrition: true,
  zikan: true,
  routine: true,
  voice_ai: true,
};

export default function FeatureManagementScreen() {
  const currentOrder = useSettingsStore(state => state.settings.featureOrder);
  const currentVisibility = useSettingsStore(state => state.settings.featureVisibility);
  const setFeatureConfig = useSettingsStore(state => state.setFeatureConfig);

  const [order, setOrder] = useState<FeatureId[]>(currentOrder || DEFAULT_ORDER);
  const [visibility, setVisibility] = useState<Record<FeatureId, boolean>>(
    currentVisibility || DEFAULT_VISIBILITY
  );

  useEffect(() => {
    if (currentOrder && currentOrder.length > 0) {
      setOrder(currentOrder);
    }
    if (currentVisibility) {
      setVisibility(currentVisibility);
    }
  }, [currentOrder, currentVisibility]);

  const handleToggleVisibility = useCallback((id: FeatureId, value: boolean) => {
    const updatedVisibility = { ...visibility, [id]: value };
    setVisibility(updatedVisibility);
    setFeatureConfig(order, updatedVisibility);
  }, [order, visibility, setFeatureConfig]);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    const newOrder = [...order];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setOrder(newOrder);
    setFeatureConfig(newOrder, visibility);
  }, [order, visibility, setFeatureConfig]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= order.length - 1) return;
    const newOrder = [...order];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setOrder(newOrder);
    setFeatureConfig(newOrder, visibility);
  }, [order, visibility, setFeatureConfig]);

  const handleReset = useCallback(() => {
    Alert.alert(
      '設定のリセット',
      '表示順と表示/非表示の切り替えを初期状態（全表示・標準順）に戻しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            setOrder(DEFAULT_ORDER);
            setVisibility(DEFAULT_VISIBILITY);
            setFeatureConfig(DEFAULT_ORDER, DEFAULT_VISIBILITY);
          },
        },
      ]
    );
  }, [setFeatureConfig]);

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
        <Text style={styles.headerTitle}>機能管理</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Description Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>
            ダッシュボードに表示する機能の選択（ON/OFF）と、表示順序を入れ替えることができます。
          </Text>
        </View>

        {/* Feature Item List */}
        <View style={styles.listContainer}>
          {order.map((id, index) => {
            const meta = FEATURE_METAS[id];
            if (!meta) return null;
            const isVisible = visibility[id] !== false;
            const isFirst = index === 0;
            const isLast = index === order.length - 1;

            return (
              <View key={id} style={[styles.featureCard, !isVisible && styles.featureCardDisabled]}>
                <View style={[styles.iconBox, { backgroundColor: `${meta.iconColor}20` }]}>
                  <Ionicons name={meta.icon} size={22} color={meta.iconColor} />
                </View>

                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, !isVisible && styles.textDisabled]}>
                    {meta.title}
                  </Text>
                  <Text style={styles.featureDesc} numberOfLines={1}>
                    {meta.desc}
                  </Text>
                </View>

                {/* Move Up / Down Buttons */}
                <View style={styles.orderControls}>
                  <TouchableOpacity
                    style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
                    onPress={() => handleMoveUp(index)}
                    disabled={isFirst}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={18}
                      color={isFirst ? '#444' : Theme.colors.text}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
                    onPress={() => handleMoveDown(index)}
                    disabled={isLast}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={isLast ? '#444' : Theme.colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {/* ON/OFF Switch */}
                <Switch
                  value={isVisible}
                  onValueChange={(val) => handleToggleVisibility(id, val)}
                  trackColor={{ false: '#3a3a3c', true: Theme.colors.primary }}
                  thumbColor={isVisible ? '#ffffff' : '#8e8e93'}
                />
              </View>
            );
          })}
        </View>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.resetButtonText}>初期設定に戻す</Text>
        </TouchableOpacity>
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
  content: { padding: Theme.spacing.md, paddingBottom: 60 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.2)',
  },
  infoText: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  listContainer: { gap: 12 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  featureCardDisabled: {
    opacity: 0.55,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
    marginRight: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 2,
  },
  textDisabled: {
    color: Theme.colors.textMuted,
  },
  featureDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  orderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 2,
  },
  reorderBtn: {
    padding: 6,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  resetButtonText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
