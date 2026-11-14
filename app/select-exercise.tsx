import { View, Text, StyleSheet, SectionList, TouchableOpacity, Pressable, TextInput, Modal, Alert, ScrollView, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { useEffect, useState, useCallback } from 'react';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDB, addCustomExercise, getPreviousWorkoutSets, getPersonalRecords, getFavoriteIds, toggleFavorite, deleteExercise, saveSetting, getCustomExercisesCount } from '../src/db/database';
import { useAppTheme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useRoutineDraftStore } from '../src/store/routineDraftStore';
import { useTranslation } from 'react-i18next';
import { translateExercise, translateMuscleGroup, translateEquipment, translateStance } from '../src/i18n';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { openYouTubeSearch } from '../src/utils/youtubeUtils';

type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  is_unilateral?: number;
  default_variation?: string | null;
  default_stance?: string | null;
  rest_seconds?: number | null;
};

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
    <View style={{ width: 80, flexDirection: 'row' }}>
      <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
        <GHTouchableOpacity 
          style={[styles.deleteAction, { backgroundColor: colors.danger }]}
          onPress={onPress}
        >
          <Ionicons name="trash-outline" size={24} color="#ffffff" />
        </GHTouchableOpacity>
      </Reanimated.View>
    </View>
  );
}

export default function SelectExerciseScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('すべて');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('すべて');
  const [isModalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('胸');
  const [newEquip, setNewEquip] = useState('バーベル');
  const [deletingExerciseTarget, setDeletingExerciseTarget] = useState<Exercise | null>(null);
  const [isUnilateral, setIsUnilateral] = useState(false);
  const [useDefaultStance, setUseDefaultStance] = useState(false);
  const [newDefaultStance, setNewDefaultStance] = useState('');

  const settings = useSettingsStore(state => state.settings);
  const addExercise = useWorkoutStore((state) => state.addExercise);
  const alwaysOneSet = useSettingsStore((state) => state.settings.alwaysOneSet);
  const addDraftExercise = useRoutineDraftStore(state => state.addDraftExercise);
  const customStances = settings.customStances;
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const isPremium = settings.isPremium;
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;

  const presetStances = customStances || [];

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const db = getDB();
      const [rows, favs] = await Promise.all([
        db.getAllAsync('SELECT * FROM exercises ORDER BY name'),
        getFavoriteIds()
      ]);
      setFavoriteIds(favs);
      setExercises(rows as Exercise[]);
    } catch (e: any) {
      Alert.alert(t('ui.common.error'), `${t('ui.exercise_select.error_add_failed')}: ${e?.message || String(e)}`);
    }
  };

  const handleToggleFavorite = async (ex: Exercise) => {
    const isFav = favoriteIds.has(ex.id);
    await toggleFavorite(ex.id, isFav);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(ex.id);
      else next.add(ex.id);
      return next;
    });
  };

  const handleSelect = async (ex: Exercise) => {
    if (mode === 'routine') {
      addDraftExercise({
        id: ex.id,
        name: ex.name,
        is_unilateral: ex.is_unilateral,
        equipment: ex.equipment,
        default_stance: ex.default_stance,
        default_variation: ex.default_variation,
      });
      router.back();
      return;
    }
    try {
      const prevSets = await getPreviousWorkoutSets(ex.id);
      const personalRecords = await getPersonalRecords(ex.id);
      addExercise({ id: ex.id, name: ex.name, previousSets: prevSets, personalRecords, is_unilateral: ex.is_unilateral, default_variation: ex.default_variation, default_stance: ex.default_stance, equipment: ex.equipment, muscle_group: ex.muscle_group, rest_seconds: ex.rest_seconds }, alwaysOneSet);
    } catch (e) {
      addExercise({ id: ex.id, name: ex.name, is_unilateral: ex.is_unilateral, default_variation: ex.default_variation, default_stance: ex.default_stance, equipment: ex.equipment, muscle_group: ex.muscle_group, rest_seconds: ex.rest_seconds }, alwaysOneSet);
    }
    router.back();
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert(t('ui.common.error'), t('ui.exercise_select.error_no_name'));
      return;
    }

    if (isBasic) {
      try {
        const count = await getCustomExercisesCount();
        if (count >= 20) {
          Alert.alert(
            'カスタム種目追加制限',
            'ベーシックプランでは最大20個までカスタム種目を登録できます。登録上限を増やすにはプレミアムプランへのアップグレードが必要です。',
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: 'アップグレードする', onPress: () => {
                setModalVisible(false);
                router.push('/(tabs)/profile');
              }}
            ]
          );
          return;
        }
      } catch (e) {
        console.warn('Failed to check custom exercises count', e);
      }
    }

    try {
      const defaultVar = useDefaultStance && newDefaultStance.trim() ? newDefaultStance.trim() : null;
      if (defaultVar) {
        useSettingsStore.getState().addCustomStance(defaultVar);
        saveSetting('custom_stances', JSON.stringify(Array.from(new Set([...(customStances || []), defaultVar]))));
      }
      const newId = await addCustomExercise(
        newName.trim(),
        newGroup.trim() || 'その他',
        newEquip.trim() || 'その他',
        isUnilateral,
        defaultVar,
        defaultVar
      );
      setModalVisible(false);
      setSearch('');
      await fetchAll();
      handleSelect({ id: newId, name: newName.trim(), muscle_group: newGroup, equipment: newEquip, is_unilateral: isUnilateral ? 1 : 0, default_variation: defaultVar, default_stance: defaultVar });
    } catch (e) {
      Alert.alert(t('ui.common.error'), t('ui.exercise_select.error_add_failed'));
    }
  };

  const dynamicCategories = Array.from(new Set(exercises.map(e => e.muscle_group).filter(Boolean)));
  const allCategories = Array.from(new Set(['胸', '背中', '肩', '腕', '脚', '腹筋', ...dynamicCategories])).filter(c => c !== 'その他');
  const filterCategories = ['すべて', ...allCategories, 'その他'];
  const allEquipments = Array.from(new Set(['バーベル', 'ダンベル', 'マシン', 'ケーブル', 'スミスマシン', 'EZバー', '自重', 'ウエイト', ...exercises.map(e => e.equipment).filter(Boolean)])).filter(e => e !== 'その他');
  const filterEquipments = ['すべて', ...allEquipments, 'その他'];

  const filtered = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle_group?.includes(search);
    const matchCategory = selectedCategory === 'すべて' ||
      (selectedCategory === 'その他' ? !allCategories.includes(e.muscle_group) : e.muscle_group === selectedCategory);
    const matchEquipment = selectedEquipment === 'すべて' ||
      (selectedEquipment === 'その他' ? !allEquipments.includes(e.equipment) : e.equipment === selectedEquipment);
    return matchSearch && matchCategory && matchEquipment;
  });

  const favItems = filtered.filter(e => favoriteIds.has(e.id));
  const otherItems = filtered.filter(e => !favoriteIds.has(e.id));

  const sections = [];
  if (favItems.length > 0) sections.push({ title: t('ui.exercise_select.section_favorites'), data: favItems });
  if (otherItems.length > 0) sections.push({ title: favItems.length > 0 ? t('ui.exercise_select.section_others') : t('ui.exercise_select.section_all'), data: otherItems });

  const handleDelete = async (ex: Exercise) => {
    setDeletingExerciseTarget(ex);
  };

  const renderRightActions = (progress: SharedValue<number>, drag: SharedValue<number>, item: Exercise) => {
    return (
      <SwipeDeleteAction 
        drag={drag}
        onPress={() => handleDelete(item)}
      />
    );
  };

  const renderItem = ({ item }: { item: Exercise }) => {
    const isFav = favoriteIds.has(item.id);
    return (
      <Swipeable
        renderRightActions={(prog, drag) => renderRightActions(prog, drag, item)}
        friction={2}
        rightThreshold={40}
      >
        <GHTouchableOpacity 
          style={[styles.item, { borderBottomColor: colors.border }]} 
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.name, { color: colors.text }]}>{translateExercise(item.name)}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>{translateMuscleGroup(item.muscle_group)} • {translateEquipment(item.equipment)}</Text>
          </View>
          <GHTouchableOpacity
            style={styles.listHowToBtn}
            onPress={() => openYouTubeSearch(item.name)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            activeOpacity={0.7}
          >
            <Ionicons name="play" size={11} color={colors.primary} />
            <Text style={[styles.listHowToText, { color: colors.primary }]}>How To</Text>
          </GHTouchableOpacity>
          <GHTouchableOpacity
            onPress={() => handleToggleFavorite(item)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={styles.starBtn}
          >
            <Ionicons
              name={isFav ? 'star' : 'star-outline'}
              size={22}
              color={isFav ? '#f5a623' : colors.textMuted}
            />
          </GHTouchableOpacity>
          <View style={{ paddingLeft: 4 }}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </View>
        </GHTouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('ui.profile.screen_title_select_exercise'), headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <View style={styles.actionRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('ui.exercise_select.search_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => { setNewName(search); setModalVisible(true); setUseDefaultStance(false); setNewDefaultStance(''); }}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <View style={{ height: 40, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
          {filterCategories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedCategory === cat && [styles.chipActive, { borderColor: colors.primary }]
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                styles.chipText,
                { color: colors.textMuted },
                selectedCategory === cat && { color: colors.primary, fontWeight: 'bold' }
              ]}>
                {translateMuscleGroup(cat)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Equipment Filter Chips */}
      <View style={{ height: 40, marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
          {filterEquipments.map(equip => (
            <TouchableOpacity
              key={equip}
              style={[
                styles.chip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedEquipment === equip && { backgroundColor: 'rgba(79, 172, 254, 0.1)', borderColor: colors.primary }
              ]}
              onPress={() => setSelectedEquipment(equip)}
            >
              <Text style={[
                styles.chipText,
                { color: colors.textMuted },
                selectedEquipment === equip && { color: colors.primary, fontWeight: 'bold' }
              ]}>
                {translateEquipment(equip)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {sections.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted }}>{t('ui.exercise_select.not_found')}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
              {section.title === t('ui.exercise_select.section_favorites') && (
                <Ionicons name="star" size={14} color="#f5a623" style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.sectionHeaderText, { color: colors.textMuted }]}>{section.title}</Text>
            </View>
          )}
        />
      )}

      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '85%' }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('ui.exercise_select.create_modal_title')}</Text>

              <ScrollView 
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                <Text style={[styles.label, { color: colors.textMuted }]}>{t('ui.exercise_select.label_name')}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder={t('ui.exercise_select.label_name_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={newName}
                  onChangeText={setNewName}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>{t('ui.exercise_select.label_group')}</Text>
                <View style={styles.choiceContainer}>
                  {allCategories.map(g => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setNewGroup(g)}
                      style={[
                        styles.choiceChip,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        newGroup === g && [styles.choiceChipActive, { borderColor: colors.primary }]
                      ]}
                    >
                      <Text style={[
                        styles.choiceChipText,
                        { color: colors.textMuted },
                        newGroup === g && { color: colors.primary, fontWeight: 'bold' }
                      ]}>
                        {translateMuscleGroup(g)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                  placeholder={t('ui.exercise_select.label_other_input')}
                  placeholderTextColor={colors.textMuted}
                  value={translateMuscleGroup(newGroup)}
                  onChangeText={setNewGroup}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>{t('ui.exercise_select.label_equip')}</Text>
                <View style={styles.choiceContainer}>
                  {allEquipments.map(e => (
                    <TouchableOpacity
                      key={e}
                      onPress={() => setNewEquip(e)}
                      style={[
                        styles.choiceChip,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        newEquip === e && [styles.choiceChipActive, { borderColor: colors.primary }]
                      ]}
                    >
                      <Text style={[
                        styles.choiceChipText,
                        { color: colors.textMuted },
                        newEquip === e && { color: colors.primary, fontWeight: 'bold' }
                      ]}>
                        {translateEquipment(e)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                  placeholder={t('ui.exercise_select.label_other_input')}
                  placeholderTextColor={colors.textMuted}
                  value={translateEquipment(newEquip)}
                  onChangeText={setNewEquip}
                />

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 8 }}>
                  {t('ui.exercise_library.label_scroll_more')}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>{t('ui.exercise_select.label_unilateral')}</Text>
                  <Switch value={isUnilateral} onValueChange={setIsUnilateral} trackColor={{ true: colors.primary }} />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>{t('ui.exercise_select.label_default_stance')}</Text>
                  <Switch value={useDefaultStance} onValueChange={setUseDefaultStance} trackColor={{ true: colors.primary }} />
                </View>
                
                {useDefaultStance && (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      {presetStances.map((preset: string) => (
                        <TouchableOpacity
                          key={preset}
                          style={[
                            styles.choiceChip,
                            { backgroundColor: colors.background, borderColor: colors.border },
                            newDefaultStance === preset && [styles.choiceChipActive, { borderColor: colors.primary }]
                          ]}
                          onPress={() => setNewDefaultStance(preset)}
                        >
                          <Text style={[
                            styles.choiceChipText,
                            { color: colors.textMuted },
                            newDefaultStance === preset && { color: colors.primary, fontWeight: 'bold' }
                          ]}>
                            {translateStance(preset)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput 
                      style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} 
                      placeholder={t('ui.exercise_select.label_other_input_stance')} 
                      placeholderTextColor={colors.textMuted} 
                      value={translateStance(newDefaultStance)} 
                      onChangeText={setNewDefaultStance} 
                    />
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>{t('ui.common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}>
                  <Text style={styles.saveBtnText}>{t('ui.exercise_select.create_and_add')}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={deletingExerciseTarget !== null}
        title={t('ui.exercise_select.delete_title')}
        message={deletingExerciseTarget ? t('ui.exercise_select.delete_message', { name: translateExercise(deletingExerciseTarget.name) }) : ''}
        confirmText={t('ui.common.delete')}
        cancelText={t('ui.common.cancel')}
        type="danger"
        onConfirm={async () => {
          if (deletingExerciseTarget) {
            try {
              await deleteExercise(deletingExerciseTarget.id);
              await fetchAll();
            } catch (e) {
              Alert.alert(t('ui.common.error'), t('ui.exercise_select.delete_error'));
            } finally {
              setDeletingExerciseTarget(null);
            }
          }
        }}
        onCancel={() => setDeletingExerciseTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 120 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, marginVertical: 8 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginRight: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  chipContainer: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)' },
  chipText: { fontSize: 14, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  sectionHeaderText: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  name: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  meta: { fontSize: 13 },
  listHowToBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.2)',
    marginRight: 4,
  },
  listHowToText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  starBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 420, borderRadius: 16, borderWidth: 1, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { marginBottom: 6, marginTop: 12, fontWeight: '600' },
  modalInput: { padding: 12, borderRadius: 12, fontSize: 16, borderWidth: 1 },
  choiceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  choiceChipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)' },
  choiceChipText: { fontSize: 13, fontWeight: '500' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  cancelBtn: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center', marginRight: 8 },
  cancelBtnText: { fontSize: 16 },
  saveBtn: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  }
});
