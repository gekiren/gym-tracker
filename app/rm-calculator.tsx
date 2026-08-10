import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { Theme } from '../src/theme';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore } from '../src/store/settingsStore';
import SwipeableNumericInput from '../components/SwipeableNumericInput';
import { saveSetting, getSettings } from '../src/db/database';

export default function RMCalculatorScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore(state => state.settings);
  const [weight, setWeight] = useState('60');
  const [reps, setReps] = useState('10');
  const [formula, setFormula] = useState<'epley' | 'brzycki'>('epley');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLastValues = async () => {
      try {
        const dbSettings = await getSettings();
        if (dbSettings['last_rm_weight']) setWeight(dbSettings['last_rm_weight']);
        if (dbSettings['last_rm_reps']) setReps(dbSettings['last_rm_reps']);
        if (dbSettings['last_rm_formula'] === 'brzycki') setFormula('brzycki');
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadLastValues();
  }, []);

  useEffect(() => {
    if (isLoaded && weight && reps) {
      saveSetting('last_rm_weight', weight).catch(() => {});
      saveSetting('last_rm_reps', reps).catch(() => {});
      saveSetting('last_rm_formula', formula).catch(() => {});
    }
  }, [weight, reps, formula, isLoaded]);

  const handleWeightChange = (val: string) => {
    if (val === '' || /^\d{0,3}([.,]\d{0,1})?$/.test(val)) {
      setWeight(val);
    }
  };

  const handleRepsChange = (val: string) => {
    if (val === '' || /^\d{0,3}$/.test(val)) {
      const num = parseInt(val, 10);
      if (isNaN(num) || num <= 100) {
        setReps(val);
      }
    }
  };

  const getZoneInfo = (rep: number) => {
    if (rep === 1) return { label: '最大筋力', color: '#ef4444', bg: '#ef444415' };
    if (rep >= 2 && rep <= 5) return { label: '筋力向上', color: '#f59e0b', bg: '#f59e0b15' };
    if (rep >= 6 && rep <= 12) return { label: '筋肥大', color: '#10b981', bg: '#10b98115' };
    return { label: '筋持久力', color: '#06b6d4', bg: '#06b6d415' };
  };

  const calculateRMList = (w: number, r: number, formulaType: 'epley' | 'brzycki') => {
    if (w <= 0 || r <= 0) return [];
    
    // Calculate 1RM base
    let oneRM = w;
    if (r > 1) {
      if (formulaType === 'epley') {
        oneRM = w * (1 + r / 30);
      } else {
        // Brzycki formula: 1RM = W * (36 / (37 - R))
        const safeReps = Math.min(36, r);
        oneRM = w * (36 / (37 - safeReps));
      }
    }

    const list = [];
    for (let i = 1; i <= 15; i++) {
      let estWeight = oneRM;
      let percent = 100;

      if (i > 1) {
        if (formulaType === 'epley') {
          const ratio = 1 + i / 30;
          estWeight = oneRM / ratio;
          percent = Math.round((1 / ratio) * 100);
        } else {
          const ratio = 36 / (37 - i);
          estWeight = oneRM / ratio;
          percent = Math.round((1 / ratio) * 100);
        }
      }
      
      const zone = getZoneInfo(i);

      list.push({
        rep: i,
        weight: Math.round(estWeight * 10) / 10,
        percent,
        zone,
      });
    }
    return list;
  };

  const wNum = parseFloat(weight.replace(',', '.'));
  const rNum = parseInt(reps, 10);
  const isValid = !isNaN(wNum) && wNum > 0 && !isNaN(rNum) && rNum > 0;
  
  const rmList = isValid ? calculateRMList(wNum, rNum, formula) : [];
  const estimated1RM = isValid && rmList.length > 0 ? rmList[0].weight : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('ui.rm_calc.title'), headerStyle: { backgroundColor: Theme.colors.background }, headerTintColor: Theme.colors.primary }} />
        
        <View style={styles.inputSection}>
            <View style={styles.headerRow}>
              <Text style={styles.subtitle}>{t('ui.rm_calc.subtitle')}</Text>
              
              {/* 公式切り替えタブ */}
              <View style={styles.formulaTabGroup}>
                <TouchableOpacity
                  style={[styles.formulaTab, formula === 'epley' && styles.formulaTabActive]}
                  onPress={() => setFormula('epley')}
                >
                  <Text style={[styles.formulaTabText, formula === 'epley' && styles.formulaTabTextActive]}>Epley</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formulaTab, formula === 'brzycki' && styles.formulaTabActive]}
                  onPress={() => setFormula('brzycki')}
                >
                  <Text style={[styles.formulaTabText, formula === 'brzycki' && styles.formulaTabTextActive]}>Brzycki</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputRow}>
                <SwipeableNumericInput 
                    label={`${t('ui.rm_calc.weight')} (${settings.weightUnit})`}
                    value={weight}
                    onChangeText={handleWeightChange}
                    step={settings.weightUnit === 'kg' ? 0.5 : 1}
                    sensitivity={12}
                    minValue={0.5}
                    maxValue={999.9}
                    keyboardType="decimal-pad"
                />
                <SwipeableNumericInput 
                    label={t('ui.rm_calc.reps')}
                    value={reps}
                    onChangeText={handleRepsChange}
                    step={1}
                    sensitivity={18}
                    minValue={1}
                    maxValue={100}
                />
            </View>

            {/* Helper Text explaining both Tap and Swipe actions */}
            <Text style={{ color: Theme.colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: -8, marginBottom: Theme.spacing.md, fontStyle: 'italic' }}>
                💡 {t('ui.rm_calc.interaction_hint')} (公式: {formula === 'epley' ? 'Epley式 [1RM = W × (1 + R/30)]' : 'Brzycki式 [1RM = W × 36/(37-R)]'})
            </Text>

            {isValid && (
                <View style={styles.resultBanner}>
                    <Text style={styles.resultLabel}>{t('ui.rm_calc.estimated_1rm')} ({formula.toUpperCase()})</Text>
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
                        <Text style={[styles.th, { width: 45 }]}>RM</Text>
                        <Text style={[styles.th, { flex: 1 }]}>{t('ui.rm_calc.estimated_weight')}</Text>
                        <Text style={[styles.th, { width: 60 }]}>{t('ui.rm_calc.ratio_1rm')}</Text>
                        <Text style={[styles.th, { width: 75, textAlign: 'right' }]}>目的に適合</Text>
                    </View>
                    
                    {rmList.map((item) => (
                        <View key={item.rep} style={[styles.tableRow, item.rep === rNum && styles.highlightRow]}>
                            <Text style={styles.tdRep}>{item.rep}</Text>
                            <Text style={styles.tdWeight}>{item.weight} {settings.weightUnit}</Text>
                            <Text style={styles.tdPercent}>{item.percent}%</Text>
                            <View style={[styles.zoneBadge, { backgroundColor: item.zone.bg }]}>
                              <Text style={[styles.zoneText, { color: item.zone.color }]}>{item.zone.label}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>{t('ui.rm_calc.invalid_input')}</Text>
                </View>
            )}
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  inputSection: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.card, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.md },
  subtitle: { color: Theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  formulaTabGroup: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: Theme.colors.border },
  formulaTab: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  formulaTabActive: { backgroundColor: Theme.colors.primary },
  formulaTabText: { color: Theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  formulaTabTextActive: { color: '#000', fontWeight: '700' },
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
  tdRep: { width: 45, color: Theme.colors.primary, fontSize: 16, fontWeight: 'bold' },
  tdWeight: { flex: 1, color: Theme.colors.text, fontSize: 16, fontWeight: '600' },
  tdPercent: { width: 60, color: Theme.colors.textMuted, fontSize: 14 },
  zoneBadge: { width: 75, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6, alignItems: 'center' },
  zoneText: { fontSize: 10, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { color: Theme.colors.textMuted, fontSize: 14 }
});
