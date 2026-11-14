import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../src/theme';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../src/store/settingsStore';
import SwipeableNumericInput from '../components/SwipeableNumericInput';
import { saveSetting, getSettings } from '../src/db/database';

export default function RMCalculatorScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const settings = useSettingsStore(state => state.settings);
  const [weight, setWeight] = useState('60');
  const [reps, setReps] = useState('10');
  const [formula, setFormula] = useState<'epley' | 'brzycki'>('epley');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('ui.rm_calc.title'), headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.primary }} />
        
        <View style={[styles.inputSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.headerRow}>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('ui.rm_calc.subtitle')}</Text>
              
              <View style={styles.headerControls}>
                {/* 公式切り替えタブ */}
                <View style={[styles.formulaTabGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.formulaTab, formula === 'epley' && { backgroundColor: colors.primary }]}
                    onPress={() => setFormula('epley')}
                  >
                    <Text style={[styles.formulaTabText, { color: colors.textMuted }, formula === 'epley' && styles.formulaTabTextActive]}>Epley</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formulaTab, formula === 'brzycki' && { backgroundColor: colors.primary }]}
                    onPress={() => setFormula('brzycki')}
                  >
                    <Text style={[styles.formulaTabText, { color: colors.textMuted }, formula === 'brzycki' && styles.formulaTabTextActive]}>Brzycki</Text>
                  </TouchableOpacity>
                </View>

                {/* ヘルプボタン */}
                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => setIsHelpModalVisible(true)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
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
            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: -8, marginBottom: 16, fontStyle: 'italic' }}>
                💡 {t('ui.rm_calc.interaction_hint')} (公式: {formula === 'epley' ? 'Epley式 [1RM = W × (1 + R/30)]' : 'Brzycki式 [1RM = W × 36/(37-R)]'})
            </Text>

            {isValid && (
                <View style={styles.resultBanner}>
                    <Text style={[styles.resultLabel, { color: colors.primary }]}>{t('ui.rm_calc.estimated_1rm')} ({formula.toUpperCase()})</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.resultValue, { color: colors.text }]}>{Math.round(estimated1RM)}</Text>
                        <Text style={[styles.resultUnit, { color: colors.textMuted }]}>{settings.weightUnit}</Text>
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
                <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.tableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                        <Text style={[styles.th, { width: 45, color: colors.textMuted }]}>RM</Text>
                        <Text style={[styles.th, { flex: 1, color: colors.textMuted }]}>{t('ui.rm_calc.estimated_weight')}</Text>
                        <Text style={[styles.th, { width: 60, color: colors.textMuted }]}>{t('ui.rm_calc.ratio_1rm')}</Text>
                        <Text style={[styles.th, { width: 80, textAlign: 'right', color: colors.textMuted }]}>目的に適合</Text>
                    </View>
                    
                    {rmList.map((item) => (
                        <View key={item.rep} style={[styles.tableRow, { borderBottomColor: colors.border }, item.rep === rNum && styles.highlightRow]}>
                            <Text style={[styles.tdRep, { color: colors.primary }]}>{item.rep}</Text>
                            <Text style={[styles.tdWeight, { color: colors.text }]}>{item.weight} {settings.weightUnit}</Text>
                            <Text style={[styles.tdPercent, { color: colors.textMuted }]}>{item.percent}%</Text>
                            <View style={[styles.zoneBadge, { backgroundColor: item.zone.bg }]}>
                              <Text style={[styles.zoneText, { color: item.zone.color }]}>{item.zone.label}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('ui.rm_calc.invalid_input')}</Text>
                </View>
            )}
        </ScrollView>

        {/* 1RM・公式解説モーダル */}
        <Modal
          visible={isHelpModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsHelpModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setIsHelpModalVisible(false)}>
            <Pressable
              style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>💡 1RM計算と公式の解説</Text>
                <TouchableOpacity onPress={() => setIsHelpModalVisible(false)} style={styles.modalHeaderCloseBtn}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalSectionTitle, { color: colors.primary }]}>🏋️‍♂️ 1RM (1 Rep Maximum) とは？</Text>
                <Text style={[styles.modalText, { color: colors.textMuted }]}>
                  「1回だけ正しく挙げることができる限界の最大重量」のことです。筋トレの強度設定や成長の指標として使われます。
                </Text>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <Text style={[styles.modalSectionTitle, { color: colors.primary }]}>⚡ Epley（エプリー）式</Text>
                <Text style={[styles.modalFormulaText, { backgroundColor: colors.background }]}>公式: 1RM = 重量 × (1 + 回数 / 30)</Text>
                <Text style={[styles.modalText, { color: colors.textMuted }]}>
                  ・1〜8回程度の低〜中レップ数で特に高い精度を発揮します。{"\n"}
                  ・世界中で最も広く使われている定番の推算式です。{"\n"}
                  ・やや積極的（高め）な数値が算出される傾向があります。
                </Text>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <Text style={[styles.modalSectionTitle, { color: colors.primary }]}>🛡️ Brzycki（ブリジッキ）式</Text>
                <Text style={[styles.modalFormulaText, { backgroundColor: colors.background }]}>公式: 1RM = 重量 × 36 / (37 - 回数)</Text>
                <Text style={[styles.modalText, { color: colors.textMuted }]}>
                  ・5〜10回程度の中〜高レップ数からの推定に適しています。{"\n"}
                  ・Epley式に比べて高回数での数値が過大評価されにくく、保守的（控えめ・安全）な推測値を出します。
                </Text>

                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                <Text style={[styles.modalSectionTitle, { color: colors.primary }]}>🎯 どちらを選ぶべき？</Text>
                <Text style={[styles.modalText, { color: colors.textMuted }]}>
                  基本的にはデフォルトの「Epley式」で問題ありません。高回数のセットから安全に目標設定を行いたい場合は「Brzycki式」に切り替えるのがおすすめです。
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
                onPress={() => setIsHelpModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>閉じる</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inputSection: { padding: 20, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  subtitle: { flex: 1, fontSize: 12, lineHeight: 17, marginRight: 8 },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helpButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  formulaTabGroup: { flexDirection: 'row', borderRadius: 8, padding: 2, borderWidth: 1 },
  formulaTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  formulaTabText: { fontSize: 12, fontWeight: '600' },
  formulaTabTextActive: { color: '#000', fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  resultBanner: { backgroundColor: 'rgba(79, 172, 254, 0.1)', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  resultLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  resultValue: { fontSize: 36, fontWeight: '900' },
  resultUnit: { fontSize: 16, fontWeight: 'bold', marginLeft: 4 },
  listSection: { padding: 20, paddingBottom: 60 },
  tableCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  th: { fontSize: 13, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, alignItems: 'center' },
  highlightRow: { backgroundColor: 'rgba(79, 172, 254, 0.05)' },
  tdRep: { width: 45, fontSize: 16, fontWeight: 'bold' },
  tdWeight: { flex: 1, fontSize: 16, fontWeight: '600' },
  tdPercent: { width: 60, fontSize: 14 },
  zoneBadge: { width: 80, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, alignItems: 'center' },
  zoneText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14 },

  // モーダル用スタイル
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 420, maxHeight: '82%', borderRadius: 16, borderWidth: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1 },
  modalHeaderCloseBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  modalBody: { marginBottom: 16 },
  modalSectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  modalFormulaText: { color: '#38ef7d', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginVertical: 6, alignSelf: 'flex-start', overflow: 'hidden' },
  modalText: { fontSize: 13, lineHeight: 19 },
  modalDivider: { height: 1, marginVertical: 14 },
  modalCloseButton: { minHeight: 48, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalCloseButtonText: { color: '#000', fontWeight: 'bold', fontSize: 15 }
});
