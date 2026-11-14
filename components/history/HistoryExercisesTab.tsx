import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, Modal, Switch, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { useAppTheme } from '../../src/theme';
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
  const { colors } = useAppTheme();
  const styleAnimation = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: drag.value + 80 }],
    };
  });

  return (
    <View style={{ width: 80, flexDirection: 'row', marginBottom: 10 }}>
      <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
        <GHTouchableOpacity 
          style={{ flex: 1, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', borderRadius: 16 }}
          onPress={onPress}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </GHTouchableOpacity>
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
  const { colors, spacing } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
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
          <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('ui.exercise_library.search_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setModalVisible(true); setUseDefaultStance(false); setNewDefaultStance(''); setIsUnilateral(false); }}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <View style={{ minHeight: 44, marginBottom: 8 }}>
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
      <View style={{ minHeight: 44, marginBottom: 12 }}>
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
              <GHTouchableOpacity 
                style={styles.exerciseCard}
                onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: String(item.id), _t: Date.now() } } as any)}
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
                <GHTouchableOpacity onPress={() => onToggleFavorite(item)} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons 
                    name={isFav ? "star" : "star-outline"} 
                    size={22} 
                    color={isFav ? '#ffd700' : colors.textMuted} 
                  />
                </GHTouchableOpacity>
              </GHTouchableOpacity>
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
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBg} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{t('ui.exercise_library.add_custom_title')}</Text>
              
              <Text style={styles.fieldLabel}>{t('ui.exercise_library.label_name')}</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder={t('ui.exercise_library.placeholder_name')}
                placeholderTextColor={colors.textMuted}
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
                  trackColor={{ false: colors.border, true: colors.primary }}
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
                  trackColor={{ false: colors.border, true: colors.primary }}
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
                    placeholderTextColor={colors.textMuted}
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
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  spacing: ReturnType<typeof useAppTheme>['spacing']
) => StyleSheet.create({
  subContainer: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 8, alignItems: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.text, fontSize: 16 },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  chipContainer: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, minHeight: 36, justifyContent: 'center' },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: colors.primary, fontWeight: 'bold' },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginHorizontal: spacing.md, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  exerciseName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  exerciseMeta: { color: colors.textMuted, fontSize: 12 },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },

  // Modal styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, maxHeight: '88%', borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16, textAlign: 'center' },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 6, width: '100%' },
  fieldDesc: { color: colors.textMuted, fontSize: 12, marginBottom: 6, lineHeight: 16 },
  modalInput: { backgroundColor: colors.background, color: colors.text, padding: 12, borderRadius: 12, fontSize: 16, minHeight: 44, borderWidth: 1, borderColor: colors.border, width: '100%', marginBottom: 16 },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', marginBottom: 16 },
  selectChip: { paddingHorizontal: 12, paddingVertical: 6, minHeight: 36, justifyContent: 'center', borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  selectChipActive: { backgroundColor: 'rgba(79,172,254,0.15)', borderColor: colors.primary },
  selectChipText: { color: colors.textMuted, fontSize: 12 },
  selectChipTextActive: { color: colors.primary, fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 },
  modalBtnContainer: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  modalCancelBtn: { flex: 1, minHeight: 48, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modalCancelBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, minHeight: 48, justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  modalConfirmBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' },
});
