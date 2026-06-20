import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, Modal, Switch, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Theme } from '../../src/theme';
import { translateExercise, translateMuscleGroup, translateEquipment } from '../../src/i18n';
import { router } from 'expo-router';

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
}

interface SwipeDeleteActionProps {
  drag: SharedValue<number>;
  onPress: () => void;
}

function SwipeDeleteAction({ drag, onPress }: SwipeDeleteActionProps) {
  const styleAnimation = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: drag.value + 80 }],
    };
  });

  return (
    <View style={{ width: 80, flexDirection: 'row' }}>
      <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
        <TouchableOpacity 
          style={styles.deleteAction}
          onPress={onPress}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </Reanimated.View>
    </View>
  );
}

interface HistoryExercisesTabProps {
  exercises: Exercise[];
  favoriteIds: Set<number>;
  onToggleFavorite: (ex: Exercise) => void;
  onDeleteExercise: (ex: Exercise) => void;
  onAddCustomExercise: (name: string, group: string, equipment: string, unilateral: boolean, defaultStance: string | null) => Promise<void>;
  isBasic: boolean;
  t: (key: string, options?: any) => string;
}

export const HistoryExercisesTab: React.FC<HistoryExercisesTabProps> = ({
  exercises,
  favoriteIds,
  onToggleFavorite,
  onDeleteExercise,
  onAddCustomExercise,
  isBasic,
  t,
}) => {
  const [search, setSearch] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('すべて');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('すべて');
  
  // Custom Exercise creation state
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('胸');
  const [newEquip, setNewEquip] = useState('ダンベル');
  const [isUnilateral, setIsUnilateral] = useState(false);
  const [useDefaultStance, setUseDefaultStance] = useState(false);
  const [newDefaultStance, setNewDefaultStance] = useState('');

  const dynamicCategories = Array.from(new Set(exercises.map(e => e.muscle_group).filter(Boolean)));
  const allCategories = Array.from(new Set(['胸', '背中', '肩', '腕', '脚', '腹筋', '有酸素', ...dynamicCategories])).filter(c => c !== 'その他');

  const filterCategories = ['すべて', ...allCategories, 'その他'];
  const allEquipments = Array.from(new Set(['バーベル', 'ダンベル', 'マシン', 'ケーブル', 'スミスマシン', 'EZバー', '自重', 'ウエイト', ...exercises.map(e => e.equipment).filter(Boolean)])).filter(e => e !== 'その他');
  const filterEquipments = ['すべて', ...allEquipments, 'その他'];

  const filteredExercises = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle_group?.includes(search);
    const matchCategory = selectedCategory === 'すべて' || 
                         (selectedCategory === 'その他' ? !allCategories.includes(e.muscle_group) : e.muscle_group === selectedCategory);
    const matchEquipment = selectedEquipment === 'すべて' ||
                         (selectedEquipment === 'その他' ? !allEquipments.includes(e.equipment) : e.equipment === selectedEquipment);
    return matchSearch && matchCategory && matchEquipment;
  }).sort((a, b) => {
    const aFav = favoriteIds.has(a.id);
    const bFav = favoriteIds.has(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  const handleCreateExerciseLocal = async () => {
    if (!newName.trim()) {
      Alert.alert(t('ui.common.error'), t('ui.exercise_library.error_no_name'));
      return;
    }

    try {
      const defaultVar = useDefaultStance && newDefaultStance.trim() ? newDefaultStance.trim() : null;
      await onAddCustomExercise(
        newName.trim(), 
        newGroup.trim() || 'その他', 
        newEquip.trim() || 'その他',
        isUnilateral,
        defaultVar
      );
      setModalVisible(false);
      setNewName('');
      setNewGroup('胸');
      setNewEquip('ダンベル');
      setIsUnilateral(false);
      setUseDefaultStance(false);
      setNewDefaultStance('');
    } catch (e) {
      console.error(e);
      Alert.alert(t('ui.common.error'), t('ui.exercise_library.error_add_failed'));
    }
  };

  const renderRightActions = (progress: SharedValue<number>, drag: SharedValue<number>, item: Exercise) => {
    return (
      <SwipeDeleteAction 
        drag={drag}
        onPress={() => onDeleteExercise(item)}
      />
    );
  };

  return (
    <View style={styles.subContainer}>
      <View style={styles.actionRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('ui.exercise_library.search_placeholder')}
            placeholderTextColor={Theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setModalVisible(true); setUseDefaultStance(false); setNewDefaultStance(''); setIsUnilateral(false); }}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <View style={{ height: 40, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
          {filterCategories.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{translateMuscleGroup(cat)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Equipment Filter Chips */}
      <View style={{ height: 40, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
          {filterEquipments.map(eq => (
            <TouchableOpacity 
              key={eq} 
              style={[styles.chip, selectedEquipment === eq && styles.chipActive]}
              onPress={() => setSelectedEquipment(eq)}
            >
              <Text style={[styles.chipText, selectedEquipment === eq && styles.chipTextActive]}>{translateEquipment(eq)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => {
          const isFav = favoriteIds.has(item.id);
          return (
            <Swipeable
              renderRightActions={(progress, drag) => renderRightActions(progress, drag, item)}
              rightThreshold={40}
            >
              <TouchableOpacity 
                style={styles.exerciseCard}
                onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.id } } as any)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{translateExercise(item.name)}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <Text style={styles.exerciseMeta}>{translateMuscleGroup(item.muscle_group)}</Text>
                    <Text style={styles.exerciseMeta}>•</Text>
                    <Text style={styles.exerciseMeta}>{translateEquipment(item.equipment)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => onToggleFavorite(item)} style={{ padding: 6 }}>
                  <Ionicons 
                    name={isFav ? "star" : "star-outline"} 
                    size={22} 
                    color={isFav ? '#ffd700' : Theme.colors.textMuted} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('ui.exercise_select.empty_state')}</Text>
          </View>
        }
      />

      {/* Add Custom Exercise Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t('ui.exercise_library.add_custom_title')}</Text>
              
              <Text style={styles.fieldLabel}>{t('ui.exercise_library.label_name')}</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder={t('ui.exercise_library.placeholder_name')}
                placeholderTextColor="rgba(255,255,255,0.3)"
              />

              <Text style={styles.fieldLabel}>{t('ui.exercise_library.label_muscle')}</Text>
              <View style={styles.selectRow}>
                {['胸', '背中', '肩', '腕', '脚', '腹筋', '有酸素', 'その他'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.selectChip, newGroup === g && styles.selectChipActive]}
                    onPress={() => setNewGroup(g)}
                  >
                    <Text style={[styles.selectChipText, newGroup === g && styles.selectChipTextActive]}>
                      {translateMuscleGroup(g)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t('ui.exercise_library.label_equipment')}</Text>
              <View style={styles.selectRow}>
                {['バーベル', 'ダンベル', 'マシン', 'ケーブル', 'スミスマシン', 'EZバー', '自重', 'ウエイト', 'その他'].map(eq => (
                  <TouchableOpacity
                    key={eq}
                    style={[styles.selectChip, newEquip === eq && styles.selectChipActive]}
                    onPress={() => setNewEquip(eq)}
                  >
                    <Text style={[styles.selectChipText, newEquip === eq && styles.selectChipTextActive]}>
                      {translateEquipment(eq)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.fieldLabel}>{t('ui.exercise_library.label_unilateral') || '片側ずつの計測'}</Text>
                  <Text style={styles.fieldDesc}>{t('ui.exercise_library.desc_unilateral') || 'チェックすると、左右個別のセットとして記録できるようになります。'}</Text>
                </View>
                <Switch
                  value={isUnilateral}
                  onValueChange={setIsUnilateral}
                  trackColor={{ false: '#333', true: Theme.colors.primary }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.fieldLabel}>{t('ui.exercise_library.label_default_stance') || 'デフォルトバリエーション'}</Text>
                  <Text style={styles.fieldDesc}>{t('ui.exercise_library.desc_default_stance') || 'スタンスやグリップ（例: ナロー, ワイド）をデフォルト値として自動設定します。'}</Text>
                </View>
                <Switch
                  value={useDefaultStance}
                  onValueChange={setUseDefaultStance}
                  trackColor={{ false: '#333', true: Theme.colors.primary }}
                  thumbColor={'#fff'}
                />
              </View>

              {useDefaultStance && (
                <View style={{ width: '100%', marginTop: 8 }}>
                  <Text style={styles.fieldLabel}>{t('ui.exercise_library.label_stance_name') || 'バリエーション名'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newDefaultStance}
                    onChangeText={setNewDefaultStance}
                    placeholder="例: ナロー"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>
              )}

              <View style={styles.modalBtnContainer}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCancelBtnText}>{t('ui.common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreateExerciseLocal}>
                  <Text style={styles.modalConfirmBtnText}>{t('ui.common.add')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  subContainer: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: Theme.spacing.md, paddingVertical: 8, alignItems: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.card, borderRadius: 8, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: Theme.colors.border },
  searchInput: { flex: 1, color: Theme.colors.text, fontSize: 16 },
  addBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: Theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  chipContainer: { flexDirection: 'row', gap: 6, paddingHorizontal: Theme.spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.border, height: 32, justifyContent: 'center' },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.card, borderRadius: 8, padding: 16, marginHorizontal: Theme.spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Theme.colors.border },
  exerciseName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  exerciseMeta: { color: Theme.colors.textMuted, fontSize: 12 },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { color: Theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
  
  deleteAction: { backgroundColor: Theme.colors.danger, justifyContent: 'center', alignItems: 'center', width: 80, height: '88%', borderRadius: 8 },

  // Modal styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: Theme.colors.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: Theme.colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 16, textAlign: 'center' },
  fieldLabel: { color: Theme.colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 6, width: '100%' },
  fieldDesc: { color: Theme.colors.textMuted, fontSize: 11, marginBottom: 6, lineHeight: 15 },
  modalInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 10, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: Theme.colors.border, width: '100%', marginBottom: 16 },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%', marginBottom: 16 },
  selectChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  selectChipActive: { backgroundColor: 'rgba(79,172,254,0.15)', borderColor: Theme.colors.primary },
  selectChipText: { color: Theme.colors.textMuted, fontSize: 12 },
  selectChipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: 12 },
  modalBtnContainer: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center' },
  modalCancelBtnText: { color: Theme.colors.text, fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: Theme.colors.primary, alignItems: 'center' },
  modalConfirmBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' },
});
