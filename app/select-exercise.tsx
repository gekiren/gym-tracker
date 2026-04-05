import { View, Text, StyleSheet, SectionList, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDB, addCustomExercise, getPreviousWorkoutSets, getFavoriteIds, toggleFavorite } from '../src/db/database';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';

type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
};

export default function SelectExerciseScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('すべて');
  const [isModalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('胸');
  const [newEquip, setNewEquip] = useState('ダンベル');

  const { addExercise, addDraftExercise } = useWorkoutStore();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const db = getDB();
      const rows = await db.getAllAsync('SELECT * FROM exercises ORDER BY name') as Exercise[];
      setExercises(rows);
      const favs = await getFavoriteIds();
      setFavoriteIds(favs);
    } catch (e: any) {
      Alert.alert('エラー詳細', `取得失敗: ${e?.message || String(e)}`);
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
      addDraftExercise({ id: ex.id, name: ex.name });
      router.back();
      return;
    }
    try {
      const prevSets = await getPreviousWorkoutSets(ex.id);
      addExercise({ id: ex.id, name: ex.name, previousSets: prevSets });
    } catch (e) {
      addExercise({ id: ex.id, name: ex.name });
    }
    router.back();
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('エラー', '種目名を入力してください。');
      return;
    }
    try {
      const newId = await addCustomExercise(
        newName.trim(),
        newGroup.trim() || 'その他',
        newEquip.trim() || 'その他'
      );
      setModalVisible(false);
      setSearch('');
      await fetchAll();
      handleSelect({ id: newId, name: newName.trim(), muscle_group: newGroup, equipment: newEquip });
    } catch (e) {
      Alert.alert('エラー', '追加に失敗しました');
    }
  };

  const dynamicCategories = Array.from(new Set(exercises.map(e => e.muscle_group).filter(Boolean)));
  const allCategories = Array.from(new Set(['胸', '背中', '肩', '腕', '脚', '腹筋', ...dynamicCategories])).filter(c => c !== 'その他');
  const filterCategories = ['すべて', ...allCategories, 'その他'];
  const allEquipments = Array.from(new Set(['バーベル', 'ダンベル', 'マシン', 'ケーブル', 'スミスマシン', 'EZバー', '自重', 'ウエイト', ...exercises.map(e => e.equipment).filter(Boolean)])).filter(e => e !== 'その他');

  const filtered = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle_group?.includes(search);
    const matchCategory = selectedCategory === 'すべて' ||
      (selectedCategory === 'その他' ? !allCategories.includes(e.muscle_group) : e.muscle_group === selectedCategory);
    return matchSearch && matchCategory;
  });

  const favItems = filtered.filter(e => favoriteIds.has(e.id));
  const otherItems = filtered.filter(e => !favoriteIds.has(e.id));

  const sections = [];
  if (favItems.length > 0) sections.push({ title: 'お気に入り', data: favItems });
  if (otherItems.length > 0) sections.push({ title: favItems.length > 0 ? 'その他の種目' : '種目', data: otherItems });

  const renderItem = ({ item }: { item: Exercise }) => {
    const isFav = favoriteIds.has(item.id);
    return (
      <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{item.muscle_group} • {item.equipment}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleToggleFavorite(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.starBtn}
        >
          <Ionicons
            name={isFav ? 'star' : 'star-outline'}
            size={22}
            color={isFav ? '#f5a623' : Theme.colors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleSelect(item)} style={{ paddingLeft: 8 }}>
          <Ionicons name="add-circle" size={24} color={Theme.colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="種目を検索..."
            placeholderTextColor={Theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setNewName(search); setModalVisible(true); }}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <View style={{ height: 40, marginBottom: Theme.spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
          {filterCategories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.chipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {sections.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Theme.colors.textMuted }}>種目が見つかりません</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              {section.title === 'お気に入り' && (
                <Ionicons name="star" size={14} color="#f5a623" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
        />
      )}

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>オリジナル種目の作成</Text>

            <Text style={styles.label}>種目名 *</Text>
            <TextInput style={styles.modalInput} placeholder="例: ダンベルプレス" placeholderTextColor={Theme.colors.textMuted} value={newName} onChangeText={setNewName} />

            <Text style={styles.label}>対象部位</Text>
            <View style={styles.choiceContainer}>
              {allCategories.map(g => (
                <TouchableOpacity key={g} onPress={() => setNewGroup(g)} style={[styles.choiceChip, newGroup === g && styles.choiceChipActive]}>
                  <Text style={[styles.choiceChipText, newGroup === g && styles.choiceChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.modalInput, { marginTop: 8 }]} placeholder="リストにない場合は入力..." placeholderTextColor={Theme.colors.textMuted} value={newGroup} onChangeText={setNewGroup} />

            <Text style={styles.label}>使用器具</Text>
            <View style={styles.choiceContainer}>
              {allEquipments.map(e => (
                <TouchableOpacity key={e} onPress={() => setNewEquip(e)} style={[styles.choiceChip, newEquip === e && styles.choiceChipActive]}>
                  <Text style={[styles.choiceChipText, newEquip === e && styles.choiceChipTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.modalInput, { marginTop: 8 }]} placeholder="リストにない場合は入力..." placeholderTextColor={Theme.colors.textMuted} value={newEquip} onChangeText={setNewEquip} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                <Text style={styles.saveBtnText}>作成して追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  actionRow: { flexDirection: 'row', paddingHorizontal: Theme.spacing.md, marginVertical: 8 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.card, paddingHorizontal: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, marginRight: Theme.spacing.md },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Theme.colors.text, paddingVertical: 10, fontSize: 16 },
  addBtn: { backgroundColor: Theme.colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  chipContainer: { paddingHorizontal: Theme.spacing.md, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.background, paddingHorizontal: Theme.spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  sectionHeaderText: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  name: { fontSize: 16, color: Theme.colors.text, fontWeight: 'bold', marginBottom: 4 },
  meta: { fontSize: 13, color: Theme.colors.textMuted },
  starBtn: { paddingHorizontal: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.text, marginBottom: Theme.spacing.md },
  label: { color: Theme.colors.textMuted, marginBottom: 6, marginTop: 12, fontWeight: '600' },
  modalInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 12, borderRadius: Theme.borderRadius.sm, fontSize: 16, borderWidth: 1, borderColor: Theme.colors.border },
  choiceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#121212', borderWidth: 1, borderColor: Theme.colors.border },
  choiceChipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  choiceChipText: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  choiceChipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  cancelBtn: { padding: 12, marginRight: 8 },
  cancelBtnText: { color: Theme.colors.textMuted, fontSize: 16 },
  saveBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: Theme.borderRadius.md },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
