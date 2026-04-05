import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { saveSetting } from '../../src/db/database';

const REST_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300]; // in seconds

export default function ProfileScreen() {
  const { settings, loadSettings } = useWorkoutStore();
  const [defaultRest, setDefaultRest] = useState(settings.defaultRest);
  const [autoRest, setAutoRest] = useState(settings.autoRest);

  useEffect(() => {
    setDefaultRest(settings.defaultRest);
    setAutoRest(settings.autoRest);
  }, [settings]);

  const handleUpdateRest = async (secs: number) => {
    setDefaultRest(secs);
    loadSettings(secs, autoRest);
    await saveSetting('default_rest_timer', secs.toString());
  };

  const handleUpdateAuto = async (val: boolean) => {
    setAutoRest(val);
    loadSettings(defaultRest, val);
    await saveSetting('auto_rest_timer', val ? '1' : '0');
  };

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}秒`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}分${s}秒` : `${m}分`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>設定・ツール</Text>
      </View>

      {/* Tools Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="construct-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>ツール</Text>
        </View>
        
        <View style={styles.settingCard}>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/rm-calculator')}>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Ionicons name="calculator" size={22} color={Theme.colors.text} style={{ marginRight: 12 }} />
               <View>
                 <Text style={styles.settingLabel}>RM計算機</Text>
                 <Text style={[styles.settingDesc, { paddingRight: 0 }]}>重量と回数から最大挙上重量を推算</Text>
               </View>
             </View>
             <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Timer Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="timer-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>タイマー設定</Text>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>インターバルタイマーの自動開始</Text>
              <Text style={styles.settingDesc}>ワークアウトでセットを完了した時に、自動的にタイマーを開始します。</Text>
            </View>
            <Switch
              value={autoRest}
              onValueChange={handleUpdateAuto}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={styles.settingLabel}>デフォルトのインターバル時間</Text>
            <Text style={styles.settingDesc}>タイマー開始時にセットされる基準の休憩時間です。</Text>
            
            <View style={styles.chipContainer}>
              {REST_OPTIONS.map((secs) => (
                <TouchableOpacity
                  key={secs}
                  style={[styles.chip, defaultRest === secs && styles.chipActive]}
                  onPress={() => handleUpdateRest(secs)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, defaultRest === secs && styles.chipTextActive]}>
                    {formatTime(secs)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={24} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>アプリ情報</Text>
        </View>
        <View style={styles.settingCard}>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.settingLabel}>バージョン</Text>
            <Text style={{ color: Theme.colors.textMuted }}>1.0.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  header: { marginBottom: Theme.spacing.lg, marginTop: Theme.spacing.md },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.text },
  section: { marginBottom: Theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.md },
  sectionTitle: { fontSize: 18, color: Theme.colors.text, fontWeight: 'bold' },
  settingCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  settingLabel: { color: Theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  settingDesc: { color: Theme.colors.textMuted, fontSize: 13, paddingRight: 40, lineHeight: 18 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: Theme.colors.border },
  chipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  chipText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' }
});
