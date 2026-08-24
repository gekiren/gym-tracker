import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { FeatureId } from '../../src/store/settingsStore';
import { getSettings, saveSetting } from '../../src/db/database';

interface SlotConfig {
  id: FeatureId | 'empty';
  label: string;
  iconType?: 'ionic' | 'material';
  icon: string;
  description?: string;
}

const FEATURE_OPTIONS: SlotConfig[] = [
  { id: 'workout', label: '筋トレ', iconType: 'material', icon: 'arm-flex', description: 'ワークアウト記録' },
  { id: 'body', label: '体組成', icon: 'body', description: '体重・体脂肪率' },
  { id: 'water', label: '水分', icon: 'water', description: '水分補給記録' },
  { id: 'nutrition', label: '栄養', icon: 'restaurant', description: '食事・PFC管理' },
  { id: 'zikan', label: '時間', icon: 'time', description: '24H時間記録' },
  { id: 'routine', label: 'ルーティン', icon: 'repeat', description: 'ルーティン達成記録' },
  { id: 'habit', label: '習慣', icon: 'checkmark-circle', description: '習慣カウンター' },
  { id: 'voice_ai', label: 'AI音声アシスタント', icon: 'mic', description: 'AIトレーナー音声対話' },
  { id: 'empty', label: '(空欄)', icon: 'close-circle-outline', description: 'この枠を非表示' }
];

function SlotIcon({ config, size, color }: { config: SlotConfig; size: number; color: string }) {
  if (config.iconType === 'material') {
    return <MaterialCommunityIcons name={config.icon as any} size={size} color={color} />;
  }
  return <Ionicons name={config.icon as any} size={size} color={color} />;
}

export default function WidgetLauncherSettingsScreen() {
  const [slots, setSlots] = useState<(FeatureId | 'empty')[]>(['workout', 'water', 'nutrition', 'zikan', 'routine']);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectingSlotIndex, setSelectingSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const settings = await getSettings();
        const stored = settings['widget_launcher_slots'];
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Fill up to 5
            const loadedSlots = [...parsed];
            while (loadedSlots.length < 5) loadedSlots.push('empty');
            setSlots(loadedSlots.slice(0, 5));
          }
        }
      } catch (e) {
        console.error('Failed to load widget config', e);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newSlots = [...slots];
    const temp = newSlots[index];
    newSlots[index] = newSlots[index - 1];
    newSlots[index - 1] = temp;
    setSlots(newSlots);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === slots.length - 1) return;
    const newSlots = [...slots];
    const temp = newSlots[index];
    newSlots[index] = newSlots[index + 1];
    newSlots[index + 1] = temp;
    setSlots(newSlots);
    setHasChanges(true);
  };

  const openFeaturePicker = (index: number) => {
    setSelectingSlotIndex(index);
  };

  const selectFeature = (featureId: FeatureId | 'empty') => {
    if (selectingSlotIndex === null) return;
    const newSlots = [...slots];
    newSlots[selectingSlotIndex] = featureId;
    setSlots(newSlots);
    setHasChanges(true);
    setSelectingSlotIndex(null);
  };

  const handleSave = async () => {
    try {
      // Remove 'empty' before saving to DB
      const activeSlots = slots.filter(s => s !== 'empty');
      await saveSetting('widget_launcher_slots', JSON.stringify(activeSlots));
      setHasChanges(false);
      
      Alert.alert(
        '保存しました',
        '設定を保存しました。ウィジェットは数秒以内に更新されます。',
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '設定の保存に失敗しました。');
    }
  };

  if (loading) {
    return <View style={styles.container}><Text style={{color: 'white'}}>読み込み中...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ウィジェット設定 (5枠)</Text>
        <TouchableOpacity 
          style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]} 
          onPress={handleSave}
          disabled={!hasChanges}
        >
          <Text style={styles.saveBtnText}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.description}>
          ホーム画面の「クイックランチャー（縦1×横5）」ウィジェットに表示する機能とその順番を設定します。不要な枠は「(空欄)」に設定すると非表示になり、他のアイコンが詰めて表示されます。
        </Text>

        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>プレビュー</Text>
          <View style={styles.previewWidget}>
            {slots.map((s, i) => {
              if (s === 'empty') return null;
              const config = FEATURE_OPTIONS.find(f => f.id === s);
              if (!config) return null;
              return (
                <View key={`preview-${i}`} style={styles.previewSlot}>
                  <SlotIcon config={config} size={24} color={Theme.colors.primary} />
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.listContainer}>
          {slots.map((slotId, index) => {
            const config = FEATURE_OPTIONS.find(f => f.id === slotId) || FEATURE_OPTIONS[FEATURE_OPTIONS.length - 1];
            return (
              <View key={index} style={styles.listItem}>
                <View style={styles.slotNumber}>
                  <Text style={styles.slotNumberText}>{index + 1}</Text>
                </View>
                
                <TouchableOpacity style={styles.featureSelectBtn} onPress={() => openFeaturePicker(index)}>
                  <View style={styles.featureIconContainer}>
                    <SlotIcon 
                      config={config} 
                      size={20} 
                      color={config.id === 'empty' ? Theme.colors.textMuted : Theme.colors.primary} 
                    />
                  </View>
                  <Text style={[styles.featureText, config.id === 'empty' && styles.featureTextEmpty]}>
                    {config.label}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Theme.colors.textMuted} />
                </TouchableOpacity>

                <View style={styles.controls}>
                  <TouchableOpacity 
                    style={[styles.controlBtn, index === 0 && styles.controlBtnDisabled]} 
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    <Ionicons name="chevron-up" size={24} color={index === 0 ? Theme.colors.border : Theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.controlBtn, index === slots.length - 1 && styles.controlBtnDisabled]} 
                    onPress={() => moveDown(index)}
                    disabled={index === slots.length - 1}
                  >
                    <Ionicons name="chevron-down" size={24} color={index === slots.length - 1 ? Theme.colors.border : Theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 機能選択モーダル */}
      <Modal
        visible={selectingSlotIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectingSlotIndex(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectingSlotIndex(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectingSlotIndex !== null ? `スロット ${selectingSlotIndex + 1} の機能を選択` : '機能の選択'}
              </Text>
              <TouchableOpacity onPress={() => setSelectingSlotIndex(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {FEATURE_OPTIONS.map((item) => {
                const isSelected = selectingSlotIndex !== null && slots[selectingSlotIndex] === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => selectFeature(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalItemIconContainer, isSelected && styles.modalItemIconContainerSelected]}>
                      <SlotIcon 
                        config={item} 
                        size={22} 
                        color={item.id === 'empty' ? Theme.colors.textMuted : isSelected ? '#FFF' : Theme.colors.primary} 
                      />
                    </View>
                    <View style={styles.modalItemTextContainer}>
                      <Text style={[styles.modalItemLabel, isSelected && styles.modalItemLabelSelected]}>
                        {item.label}
                      </Text>
                      {item.description ? (
                        <Text style={styles.modalItemDescription}>{item.description}</Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: Theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  saveBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnDisabled: {
    backgroundColor: Theme.colors.border,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  previewContainer: {
    marginBottom: 32,
  },
  previewLabel: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewWidget: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewSlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  slotNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  slotNumberText: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  featureSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  featureIconContainer: {
    marginRight: 10,
    width: 24,
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 16,
  },
  featureTextEmpty: {
    color: Theme.colors.textMuted,
    fontStyle: 'italic',
  },
  controls: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  controlBtn: {
    padding: 8,
    marginLeft: 4,
    backgroundColor: Theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  controlBtnDisabled: {
    opacity: 0.5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  modalItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalItemIconContainerSelected: {
    backgroundColor: Theme.colors.primary,
  },
  modalItemTextContainer: {
    flex: 1,
  },
  modalItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: 2,
  },
  modalItemLabelSelected: {
    color: Theme.colors.primary,
  },
  modalItemDescription: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
});
