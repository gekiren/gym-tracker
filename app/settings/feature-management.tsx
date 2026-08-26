import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { useSettingsStore, FeatureId } from '../../src/store/settingsStore';
import { useFeatureUnlockStore, isFeatureUnlockedHelper } from '../../src/store/featureUnlockStore';
import { ALL_FEATURE_IDS, FEATURE_UNLOCK_METAS, getUnlockCost } from '../../src/constants/featureUnlockConstants';
import { PointBadge } from '../../components/PointBadge';
import { FeatureUnlockModal } from '../../components/FeatureUnlockModal';

const DEFAULT_ORDER: FeatureId[] = ['workout', 'body', 'water', 'nutrition', 'zikan', 'routine', 'habit', 'voice_ai'];
const DEFAULT_VISIBILITY: Record<FeatureId, boolean> = {
  workout: true,
  body: true,
  water: true,
  nutrition: true,
  zikan: true,
  routine: true,
  habit: true,
  voice_ai: true,
};

export default function FeatureManagementScreen() {
  const currentOrder = useSettingsStore(state => state.settings.featureOrder);
  const currentVisibility = useSettingsStore(state => state.settings.featureVisibility);
  const setFeatureConfig = useSettingsStore(state => state.setFeatureConfig);
  const isPremium = useSettingsStore(state => state.settings.isPremium);
  const isEarlyAdopter = useSettingsStore(state => state.settings.isEarlyAdopter);

  // Feature Unlock Store
  const pointsBalance = useFeatureUnlockStore(state => state.pointsBalance);
  const unlockedFeatures = useFeatureUnlockStore(state => state.unlockedFeatures);
  const forceUnlockAll = useFeatureUnlockStore(state => state.forceUnlockAll);
  const unlockFeature = useFeatureUnlockStore(state => state.unlockFeature);
  const setForceUnlockAll = useFeatureUnlockStore(state => state.setForceUnlockAll);
  const pendingUnlockFeature = useFeatureUnlockStore(state => state.pendingUnlockFeature);
  const setPendingUnlockFeature = useFeatureUnlockStore(state => state.setPendingUnlockFeature);

  const [order, setOrder] = useState<FeatureId[]>(currentOrder || DEFAULT_ORDER);
  const [visibility, setVisibility] = useState<Record<FeatureId, boolean>>(
    currentVisibility || DEFAULT_VISIBILITY
  );

  useEffect(() => {
    if (currentOrder && currentOrder.length > 0) {
      const mergedOrder = [...currentOrder];
      DEFAULT_ORDER.forEach(id => {
        if (!mergedOrder.includes(id)) {
          mergedOrder.push(id);
        }
      });
      setOrder(mergedOrder);
    }
    if (currentVisibility) {
      setVisibility({ ...DEFAULT_VISIBILITY, ...currentVisibility });
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

  const handleUnlockFeature = (id: FeatureId) => {
    const meta = FEATURE_UNLOCK_METAS[id];
    const cost = getUnlockCost(unlockedFeatures.length);

    if (pointsBalance < cost) {
      Alert.alert(
        'Pポイントが不足しています',
        `「${meta.title}」の開放には ${cost} P が必要です。（現在の所持: ${pointsBalance} P）\n\n日々の筋トレや水分補給などを記録してPポイントを獲得しましょう！`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      '新機能の開放確認',
      `${cost} P を消費して「${meta.title}」を開放しますか？\n（開放後の残高: ${pointsBalance - cost} P）`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '開放する',
          style: 'default',
          onPress: () => {
            const success = unlockFeature(id);
            if (success) {
              // 有効化も同時にONにする
              const updatedVisibility = { ...visibility, [id]: true };
              setVisibility(updatedVisibility);
              setFeatureConfig(order, updatedVisibility);
            }
          },
        },
      ]
    );
  };

  const handleReset = useCallback(() => {
    Alert.alert(
      '表示設定のリセット',
      '表示順と表示/非表示の切り替えを初期状態に戻しますか？（※開放済みポイントや機能は維持されます）',
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

  const unlockedCount = isPremium || isEarlyAdopter || forceUnlockAll
    ? ALL_FEATURE_IDS.length
    : unlockedFeatures.length;

  const nextUnlockCost = getUnlockCost(unlockedFeatures.length);

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
        <Text style={styles.headerTitle}>機能管理 ＆ 解放</Text>
        <PointBadge />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusTitle}>機能開放ステータス</Text>
              <Text style={styles.statusSubtitle}>
                {isPremium || isEarlyAdopter
                  ? 'プレミアムプラン: 全機能フル解放中'
                  : `解放済み: ${unlockedCount} / ${ALL_FEATURE_IDS.length} 機能`}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons name="lock-open" size={16} color={Theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.statusBadgeText}>{unlockedCount}/{ALL_FEATURE_IDS.length}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, (unlockedCount / ALL_FEATURE_IDS.length) * 100)}%` },
              ]}
            />
          </View>

          {!isPremium && !isEarlyAdopter && unlockedCount < ALL_FEATURE_IDS.length && !forceUnlockAll && (
            <Text style={styles.nextCostHint}>
              💡 次の機能開放に必要なポイント: <Text style={{ color: '#ffd700', fontWeight: 'bold' }}>{nextUnlockCost} P</Text>
            </Text>
          )}
        </View>

        {/* Force Unlock Toggle (Manual Setting) */}
        {!isPremium && !isEarlyAdopter && (
          <View style={styles.forceUnlockCard}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.forceUnlockTitle}>すべての機能を常に解放</Text>
              <Text style={styles.forceUnlockDesc}>
                ポイントを消費せずに全機能を常に有効化します
              </Text>
            </View>
            <Switch
              value={forceUnlockAll}
              onValueChange={setForceUnlockAll}
              trackColor={{ false: '#3a3a3c', true: Theme.colors.primary }}
              thumbColor={forceUnlockAll ? '#ffffff' : '#8e8e93'}
            />
          </View>
        )}

        {/* Feature Item List */}
        <View style={styles.listContainer}>
          {order.map((id, index) => {
            const meta = FEATURE_UNLOCK_METAS[id];
            if (!meta) return null;

            const isUnlocked = isFeatureUnlockedHelper(
              id,
              unlockedFeatures,
              forceUnlockAll,
              isPremium,
              isEarlyAdopter
            );
            const isVisible = visibility[id] !== false;
            const isFirst = index === 0;
            const isLast = index === order.length - 1;

            return (
              <View
                key={id}
                style={[
                  styles.featureCard,
                  !isUnlocked && styles.featureCardLocked,
                  isUnlocked && !isVisible && styles.featureCardDisabled,
                ]}
              >
                <View style={styles.iconColumn}>
                  <View style={[styles.iconBox, { backgroundColor: meta.badgeColor }]}>
                    <Ionicons name={meta.icon} size={22} color={meta.iconColor} />
                  </View>
                  {isUnlocked ? (
                    <View style={styles.unlockedTag}>
                      <Text style={styles.unlockedTagText}>解放済</Text>
                    </View>
                  ) : (
                    <View style={styles.lockedTag}>
                      <Ionicons name="lock-closed" size={9} color="#ff9800" style={{ marginRight: 2 }} />
                      <Text style={styles.lockedTagText}>未解放</Text>
                    </View>
                  )}
                </View>

                <View style={styles.featureInfo}>
                  <Text style={[styles.featureTitle, (!isUnlocked || !isVisible) && styles.textDisabled]}>
                    {meta.title}
                  </Text>
                  <Text style={styles.featureDesc} numberOfLines={2}>
                    {meta.shortDesc}
                  </Text>
                </View>

                {isUnlocked ? (
                  <>
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
                  </>
                ) : (
                  /* Unlock Action Button */
                  <TouchableOpacity
                    style={styles.unlockActionBtn}
                    onPress={() => handleUnlockFeature(id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="key-outline" size={14} color="#ffd700" style={{ marginRight: 4 }} />
                    <Text style={styles.unlockActionBtnText}>{nextUnlockCost} P で解放</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.resetButtonText}>表示設定を初期化</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Feature Unlock Celebration Modal */}
      <FeatureUnlockModal
        featureId={pendingUnlockFeature}
        onClose={() => setPendingUnlockFeature(null)}
      />
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
  statusCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: 16,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: 3,
  },
  nextCostHint: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 10,
  },
  forceUnlockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  forceUnlockTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  forceUnlockDesc: {
    fontSize: 11,
    color: Theme.colors.textMuted,
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
  featureCardLocked: {
    borderColor: 'rgba(255, 152, 0, 0.3)',
    backgroundColor: 'rgba(255, 152, 0, 0.03)',
  },
  featureCardDisabled: {
    opacity: 0.55,
  },
  iconColumn: {
    alignItems: 'center',
    width: 44,
    marginRight: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureInfo: {
    flex: 1,
    marginRight: 8,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 2,
  },
  textDisabled: {
    color: Theme.colors.textMuted,
  },
  featureDesc: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    lineHeight: 15,
  },
  unlockedTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginTop: 4,
    alignItems: 'center',
  },
  unlockedTagText: {
    color: '#4caf50',
    fontSize: 9,
    fontWeight: 'bold',
  },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  lockedTagText: {
    color: '#ff9800',
    fontSize: 9,
    fontWeight: 'bold',
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
  unlockActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  unlockActionBtnText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
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
