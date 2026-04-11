import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { Theme } from '../../src/theme';
import { getExercises, addCustomExercise } from '../../src/db/database';
import { useTranslation } from 'react-i18next';
import { translateExercise, translateMuscleGroup, translateEquipment } from '../../src/i18n';

type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
};

export default function ExercisesScreen() {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('すべて');
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('胸');
  const [newEquip, setNewEquip] = useState('ダンベル');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const data = await getExercises();
      setExercises(data as Exercise[]);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('エラー', '種目名を入力してください。');
      return;
    }
    try {
      await addCustomExercise(
        newName.trim(), 
        newGroup.trim() || 'その他', 
        newEquip.trim() || 'その他'
      );
      setModalVisible(false);
      setNewName('');
      setNewGroup('');
      setNewEquip('');
      fetchData();
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '追加に失敗しました');
    }
  };

  // Dynamically extract unique categories from existing exercises
  const dynamicCategories = Array.from(new Set(exercises.map(e => e.muscle_group).filter(Boolean)));
  // Ensure default standard ones exist for filtering and selection if they happen to miss
  const allCategories = Array.from(new Set(['胸', '背中', '肩', '腕', '脚', '腹筋', ...dynamicCategories])).filter(c => c !== 'その他');

  const filterCategories = ['すべて', ...allCategories, 'その他'];

  const filtered = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle_group?.includes(search);
    const matchCategory = selectedCategory === 'すべて' || 
                         (selectedCategory === 'その他' ? !allCategories.includes(e.muscle_group) : e.muscle_group === selectedCategory);
    return matchSearch && matchCategory;
  });

  const allEquipments = Array.from(new Set(['バーベル', 'ダンベル', 'マシン', 'ケーブル', 'スミスマシン', 'EZバー', '自重', 'ウエイト', ...exercises.map(e => e.equipment).filter(Boolean)])).filter(e => e !== 'その他');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>種目辞典</Text>
        <Text style={styles.subtitle}>登録されているトレーニング種目の管理</Text>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="種目を検索..."
            placeholderTextColor={Theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
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

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.id } } as any)}
          >
            <View>
              <Text style={styles.name}>{translateExercise(item.name)}</Text>
              <Text style={styles.meta}>{translateMuscleGroup(item.muscle_group)} • {translateEquipment(item.equipment)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
        )}
      />

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
                <Text style={styles.saveBtnText}>保存して追加</Text>
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
  header: { padding: Theme.spacing.md, paddingTop: Theme.spacing.lg },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  subtitle: { fontSize: 16, color: Theme.colors.textMuted },
  actionRow: { flexDirection: 'row', paddingHorizontal: Theme.spacing.md, marginBottom: 8 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.card, paddingHorizontal: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, marginRight: Theme.spacing.md },
  searchInput: { flex: 1, color: Theme.colors.text, paddingVertical: 10, fontSize: 16 },
  addBtn: { backgroundColor: Theme.colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  chipContainer: { paddingHorizontal: Theme.spacing.md, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  name: { fontSize: 16, color: Theme.colors.text, fontWeight: 'bold', marginBottom: 4 },
  meta: { fontSize: 13, color: Theme.colors.textMuted },
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
