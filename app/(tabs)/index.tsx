import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { getRoutines, getPreviousWorkoutSets, getPersonalRecords, saveSetting } from '../../src/db/database';
import { translateExercise } from '../../src/i18n';

export default function WorkoutScreen() {
  const { t } = useTranslation();
  const { startWorkout, addExercise, isActive, title, settings, loadSettings } = useWorkoutStore();
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const fetchRoutines = async () => {
    try {
      const data = await getRoutines();
      setRoutines(data);
    } catch (e) {
      console.error('Failed to fetch routines', e);
    }
  };

  const handleStartEmpty = () => {
    startWorkout(t('ui.home.free_workout_title'));
    router.push('/active-workout');
  };

  const handleStartRoutine = async (routine: any) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      startWorkout(routine.title);
      for (const ex of routine.exercises) {
        const prevSets = await getPreviousWorkoutSets(ex.id);
        const personalRecords = await getPersonalRecords(ex.id);
        addExercise({ id: ex.id, name: ex.name, previousSets: prevSets, personalRecords });
      }
      router.push('/active-workout');
    } catch (e) {
      console.error('Failed to start routine', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUnit = async (unit: 'kg' | 'lbs') => {
    await saveSetting('weight_unit', unit);
    loadSettings(settings.defaultRest, settings.autoRest, unit, false);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('ui.home.home_header_title')}</Text>
          <Text style={styles.subtitle}>{t('ui.home.home_header_subtitle')}</Text>
        </View>

      {isActive ? (
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: Theme.colors.success || '#4caf50' }]} activeOpacity={0.8} onPress={() => router.push('/active-workout')}>
          <Ionicons name="play" size={24} color="#fff" style={{ marginRight: 8 }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.primaryButtonText}>{t('ui.home.return_to_active')}</Text>
            {title && <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>{title}</Text>}
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={handleStartEmpty}>
          <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>{t('ui.home.start_free_workout')}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('ui.home.my_routines')}</Text>
          <TouchableOpacity onPress={() => router.push('/routines')}>
            <Text style={styles.linkText}>{t('ui.home.view_all')}</Text>
          </TouchableOpacity>
        </View>

        {routines.map(r => (
          <TouchableOpacity 
            key={r.id} 
            style={styles.routineCard} 
            activeOpacity={0.7} 
            onPress={() => handleStartRoutine(r)}
            disabled={isLoading}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineTitle}>{r.title}</Text>
                <Text style={styles.routineDesc} numberOfLines={2}>
                  {r.exercises?.map((e: any) => translateExercise(e.name)).join(', ') || t('ui.home.no_exercises')}
                </Text>
              </View>
              <Ionicons name="play-circle" size={32} color={Theme.colors.primary} style={{ marginLeft: 16 }} />
            </View>
          </TouchableOpacity>
        ))}

        {routines.length === 0 && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: Theme.colors.textMuted }}>{t('ui.home.no_routines')}</Text>
          </View>
        )}
      </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      )}

      {/* Onboarding Unit Selection Modal */}
      <Modal visible={settings.needsUnitSelection} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Ionicons name="barbell" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.home.onboarding_unit_title')}</Text>
            <Text style={styles.modalDesc}>
              {t('ui.home.onboarding_unit_desc')}
            </Text>
            <View style={styles.modalBtnContainer}>
              <TouchableOpacity style={styles.unitBtn} onPress={() => handleSelectUnit('kg')}>
                <Text style={styles.unitBtnText}>{t('ui.home.unit_kg_desc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.unitBtn} onPress={() => handleSelectUnit('lbs')}>
                <Text style={styles.unitBtnText}>{t('ui.home.unit_lbs_desc')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.md,
  },
  header: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Theme.colors.textMuted,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.xl,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5, // Android shadow
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginTop: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  linkText: {
    color: Theme.colors.primary,
    fontSize: 16,
  },
  routineCard: {
    backgroundColor: Theme.colors.card,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  routineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  routineDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Theme.colors.card, width: '100%', borderRadius: Theme.borderRadius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 12 },
  modalDesc: { fontSize: 14, color: Theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtnContainer: { width: '100%', gap: 12 },
  unitBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center' },
  unitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
