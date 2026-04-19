import { View, Text, StyleSheet, TextInput, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../src/store/workoutStore';

export default function RMCalculatorScreen() {
  const { t } = useTranslation();
  const { settings } = useWorkoutStore();
  const [weight, setWeight] = useState('60');
  const [reps, setReps] = useState('10');

  // Epley Formula: 1RM = Weight * (1 + Reps / 30)
  const calculateRMList = (w: number, r: number) => {
    if (w <= 0 || r <= 0) return [];
    
    // Calculate 1RM base
    let oneRM = w;
    if (r > 1) {
       oneRM = w * (1 + r / 30);
    }

    const list = [];
    for (let i = 1; i <= 15; i++) {
        // Reverse Epley to find weight for given reps
        // Using common percentage or reverse epley
        const percentage = i === 1 ? 1 : (1 + i / 30);
        let estWeight = oneRM;
        if (i > 1) {
            estWeight = oneRM / percentage;
        }
        list.push({
            rep: i,
            weight: Math.round(estWeight * 10) / 10,
            percent: Math.round((1 / percentage) * 100)
        });
    }
    return list;
  };

  const wNum = parseFloat(weight);
  const rNum = parseInt(reps, 10);
  const isValid = !isNaN(wNum) && wNum > 0 && !isNaN(rNum) && rNum > 0;
  
  const rmList = isValid ? calculateRMList(wNum, rNum) : [];
  const estimated1RM = isValid && rmList.length > 0 ? rmList[0].weight : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'RM計算機', headerStyle: { backgroundColor: Theme.colors.background }, headerTintColor: Theme.colors.primary }} />
        
        <View style={styles.inputSection}>
            <Text style={styles.subtitle}>挙上重量と回数から、最大挙上重量（1RM）や各回数の適切な設定重量を推算します。</Text>
            
            <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('ui.rm_calc.weight')} ({settings.weightUnit})</Text>
                    <TextInput 
                        style={styles.input}
                        keyboardType="numeric"
                        value={weight}
                        onChangeText={setWeight}
                        maxLength={5}
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>回数</Text>
                    <TextInput 
                        style={styles.input}
                        keyboardType="numeric"
                        value={reps}
                        onChangeText={setReps}
                        maxLength={3}
                    />
                </View>
            </View>

            {isValid && (
                <View style={styles.resultBanner}>
                    <Text style={styles.resultLabel}>推定 1 RM</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={styles.resultValue}>{Math.round(estimated1RM)}</Text>
                        <Text style={styles.resultUnit}>{settings.weightUnit}</Text>
                    </View>
                </View>
            )}
        </View>

        <ScrollView 
          contentContainerStyle={styles.listSection}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
            {isValid ? (
                <View style={styles.tableCard}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, { width: 50 }]}>RM</Text>
                        <Text style={[styles.th, { flex: 1 }]}>推定重量</Text>
                        <Text style={[styles.th, { width: 70 }]}>1RM比</Text>
                    </View>
                    
                    {rmList.map((item) => (
                        <View key={item.rep} style={[styles.tableRow, item.rep === rNum && styles.highlightRow]}>
                            <Text style={styles.tdRep}>{item.rep}</Text>
                            <Text style={styles.tdWeight}>{item.weight} {settings.weightUnit}</Text>
                            <Text style={styles.tdPercent}>{item.percent}%</Text>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>有効な重量と回数を入力してください。</Text>
                </View>
            )}
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  inputSection: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.card, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  subtitle: { color: Theme.colors.textMuted, fontSize: 13, marginBottom: Theme.spacing.md, lineHeight: 18 },
  inputRow: { flexDirection: 'row', gap: 16, marginBottom: Theme.spacing.lg },
  inputGroup: { flex: 1 },
  label: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  input: { backgroundColor: '#1A1A1A', color: Theme.colors.text, fontSize: 24, fontWeight: 'bold', textAlign: 'center', paddingVertical: 12, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border },
  resultBanner: { backgroundColor: 'rgba(79, 172, 254, 0.1)', padding: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  resultLabel: { color: Theme.colors.primary, fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  resultValue: { color: Theme.colors.text, fontSize: 36, fontWeight: '900' },
  resultUnit: { color: Theme.colors.textMuted, fontSize: 16, fontWeight: 'bold', marginLeft: 4 },
  listSection: { padding: Theme.spacing.lg, paddingBottom: 60 },
  tableCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1A1A1A', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  th: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, alignItems: 'center' },
  highlightRow: { backgroundColor: 'rgba(79, 172, 254, 0.05)' },
  tdRep: { width: 50, color: Theme.colors.primary, fontSize: 16, fontWeight: 'bold' },
  tdWeight: { flex: 1, color: Theme.colors.text, fontSize: 16, fontWeight: '600' },
  tdPercent: { width: 70, color: Theme.colors.textMuted, fontSize: 14, textAlign: 'right' },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { color: Theme.colors.textMuted, fontSize: 14 }
});
