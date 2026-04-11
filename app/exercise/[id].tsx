import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getExerciseById, getExerciseHistory } from '../../src/db/database';
import { Theme } from '../../src/theme';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        const exItem = await getExerciseById(parseInt(id, 10));
        setExercise(exItem);
        const histData = await getExerciseHistory(parseInt(id, 10));
        setHistory(histData);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const handleExportMarkdown = async () => {
    if (history.length === 0) return;

    let md = `## ${exercise.name} 記録履歴\n\n`;
    md += "| 日付 | セット | 重量 | 回数 | RPE |\n";
    md += "| :--- | :--- | :--- | :--- | :--- |\n";

    history.forEach(item => {
      const dateStr = formatDate(item.start_time);
      item.sets.forEach((s: any) => {
        md += `| ${dateStr} | ${s.set_number} | ${s.weight ? s.weight + 'kg' : '-'} | ${s.reps ? s.reps + '回' : '-'} | ${s.rpe || '-'} |\n`;
      });
    });

    await Clipboard.setStringAsync(md);
    Alert.alert('コピー完了', '履歴をMarkdown形式でクリップボードにコピーしました。');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Theme.colors.textMuted }}>種目が見つかりません。</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: '詳細',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.primary,
        }} 
      />
      
      {/* Exercise Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{exercise.name}</Text>
        <View style={styles.badges}>
          <View style={styles.badge}><Text style={styles.badgeText}>{exercise.muscle_group}</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{exercise.equipment}</Text></View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>過去の履歴</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleExportMarkdown} style={styles.exportBtn}>
            <Ionicons name="copy-outline" size={14} color={Theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.exportBtnText}>MD形式でコピー</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={48} color={Theme.colors.border} />
          <Text style={styles.emptyText}>まだ完了済みの記録がありません。</Text>
          <Text style={styles.emptySubtext}>ワークアウトで記録をつけるとここに履歴が並びます。</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.workout_id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.historyCardHeader}>
                <Ionicons name="calendar-outline" size={16} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.historyDate}>{formatDate(item.start_time)}</Text>
              </View>
              
              <View style={styles.tableHeader}>
                <Text style={styles.thSet}>セット</Text>
                <Text style={styles.thVal}>記録</Text>
              </View>
              
              {item.sets.map((s: any, idx: number) => (
                <View key={idx} style={styles.setRow}>
                  <Text style={styles.tdSet}>{s.set_number}</Text>
                  <Text style={styles.tdVal}>
                    {s.weight ? `${s.weight} kg` : '-'}  ×  {s.reps ? `${s.reps} 回` : '-'}
                  </Text>
                  {s.rpe && <Text style={styles.tdRpe}>@RPE {s.rpe}</Text>}
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.card, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  title: { fontSize: 24, fontWeight: 'bold', color: Theme.colors.text, marginBottom: Theme.spacing.sm },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  badgeText: { color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
  sectionHeader: { paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.lg, paddingBottom: Theme.spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.xl },
  emptyText: { color: Theme.colors.textMuted, fontSize: 16, marginTop: 12, fontWeight: 'bold' },
  emptySubtext: { color: Theme.colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  listContent: { paddingHorizontal: Theme.spacing.md, paddingBottom: 40 },
  historyCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  historyCardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: 8, marginBottom: 8 },
  historyDate: { color: Theme.colors.text, fontSize: 15, fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', marginBottom: 4 },
  thSet: { width: 50, color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  thVal: { flex: 1, color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  tdSet: { width: 50, color: Theme.colors.text, fontSize: 16, fontWeight: '500' },
  tdVal: { flex: 1, color: Theme.colors.text, fontSize: 16 },
  tdRpe: { color: Theme.colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.2)' },
  exportBtnText: { color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold' }
});
