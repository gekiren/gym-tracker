import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { getMissingPresets, restorePresets } from '../../src/db/database';

interface RestorePresetsModalProps {
  visible: boolean;
  onClose: () => void;
  onRestore: () => void;
  t: (key: string, options?: any) => string;
}

export const RestorePresetsModal: React.FC<RestorePresetsModalProps> = ({
  visible,
  onClose,
  onRestore,
  t,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [activeTab, setActiveTab] = useState<'exercises' | 'routines'>('exercises');

  // Missing data from DB
  const [missingExercises, setMissingExercises] = useState<{ name: string; group: string; equip: string }[]>([]);
  const [missingRoutines, setMissingRoutines] = useState<{ title: string; description: string }[]>([]);

  // Selected names/titles to restore
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [selectedRoutines, setSelectedRoutines] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { missingExercises: exercises, missingRoutines: routines } = await getMissingPresets();
      setMissingExercises(exercises);
      setMissingRoutines(routines);
      
      // Default: select all by default to make it easy for user
      setSelectedExercises(exercises.map(e => e.name));
      setSelectedRoutines(routines.map(r => r.title));
    } catch (error) {
      console.error('Failed to load missing presets:', error);
      Alert.alert('Error', 'データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExercise = (name: string) => {
    setSelectedExercises(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const handleToggleRoutine = (title: string) => {
    setSelectedRoutines(prev =>
      prev.includes(title) ? prev.filter(x => x !== title) : [...prev, title]
    );
  };

  const handleSelectAll = () => {
    if (activeTab === 'exercises') {
      setSelectedExercises(missingExercises.map(e => e.name));
    } else {
      setSelectedRoutines(missingRoutines.map(r => r.title));
    }
  };

  const handleDeselectAll = () => {
    if (activeTab === 'exercises') {
      setSelectedExercises([]);
    } else {
      setSelectedRoutines([]);
    }
  };

  const handleRestore = async () => {
    if (selectedExercises.length === 0 && selectedRoutines.length === 0) {
      Alert.alert(
        t('ui.common.warning') || '警告',
        '復元する項目を選択してください。'
      );
      return;
    }

    setRestoring(true);
    try {
      await restorePresets(selectedExercises, selectedRoutines);
      Alert.alert(
        t('ui.profile.restore_success_title') || '復元完了',
        t('ui.profile.restore_success_message') || '選択した初期データが正常に復元されました。',
        [
          {
            text: 'OK',
            onPress: () => {
              onRestore();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to restore presets:', error);
      Alert.alert('Error', 'データの復元に失敗しました。');
    } finally {
      setRestoring(false);
    }
  };

  // Group exercises by muscle group
  const groupedExercises = missingExercises.reduce((acc, ex) => {
    if (!acc[ex.group]) {
      acc[ex.group] = [];
    }
    acc[ex.group].push(ex);
    return acc;
  }, {} as Record<string, typeof missingExercises>);

  const hasItems = missingExercises.length > 0 || missingRoutines.length > 0;

  const handleRequestClose = () => {
    if (!restoring) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleRequestClose}>
      <View style={styles.modalBg}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleRequestClose} />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('ui.profile.restore_modal_title') || 'デフォルトデータの復元'}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleRequestClose} disabled={restoring}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : !hasItems ? (
            <View style={styles.centerContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} style={{ marginBottom: 12 }} />
              <Text style={styles.noItemsText}>
                {t('ui.profile.restore_no_items') || '復元可能なデフォルトデータはありません（すべて登録済みです）。'}
              </Text>
            </View>
          ) : (
            <>
              {/* Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'exercises' && styles.activeTab]}
                  onPress={() => setActiveTab('exercises')}
                >
                  <Text style={[styles.tabText, activeTab === 'exercises' && styles.activeTabText]}>
                    {t('ui.profile.restore_tab_exercises') || '初期種目'} ({missingExercises.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'routines' && styles.activeTab]}
                  onPress={() => setActiveTab('routines')}
                >
                  <Text style={[styles.tabText, activeTab === 'routines' && styles.activeTabText]}>
                    {t('ui.profile.restore_tab_routines') || '初期ルーティン'} ({missingRoutines.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bulk Actions */}
              <View style={styles.bulkActions}>
                <TouchableOpacity style={styles.bulkBtn} onPress={handleSelectAll}>
                  <Text style={styles.bulkBtnText}>{t('ui.profile.restore_select_all') || 'すべて選択'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bulkBtn} onPress={handleDeselectAll}>
                  <Text style={styles.bulkBtnText}>{t('ui.profile.restore_deselect_all') || '選択解除'}</Text>
                </TouchableOpacity>
              </View>

              {/* List */}
              <ScrollView style={styles.scrollArea}>
                {activeTab === 'exercises' ? (
                  missingExercises.length === 0 ? (
                    <Text style={styles.emptyText}>復元可能な初期種目はありません。</Text>
                  ) : (
                    Object.entries(groupedExercises).map(([group, list]) => (
                      <View key={group} style={styles.groupContainer}>
                        <Text style={styles.groupHeader}>{group}</Text>
                        {list.map(ex => {
                          const isSelected = selectedExercises.includes(ex.name);
                          return (
                            <TouchableOpacity
                              key={ex.name}
                              style={styles.itemRow}
                              activeOpacity={0.7}
                              onPress={() => handleToggleExercise(ex.name)}
                            >
                              <Ionicons
                                name={isSelected ? 'checkbox' : 'square-outline'}
                                size={22}
                                color={isSelected ? colors.primary : colors.textMuted}
                                style={{ marginRight: 12 }}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{ex.name}</Text>
                                <Text style={styles.itemSub}>{ex.equip}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))
                  )
                ) : missingRoutines.length === 0 ? (
                  <Text style={styles.emptyText}>復元可能な初期ルーティンはありません。</Text>
                ) : (
                  missingRoutines.map(r => {
                    const isSelected = selectedRoutines.includes(r.title);
                    return (
                      <TouchableOpacity
                        key={r.title}
                        style={styles.itemRow}
                        activeOpacity={0.7}
                        onPress={() => handleToggleRoutine(r.title)}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isSelected ? colors.primary : colors.textMuted}
                          style={{ marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{r.title}</Text>
                          <Text style={styles.itemSub}>{r.description}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.cancelBtn, restoring && { opacity: 0.5 }]}
                  onPress={onClose}
                  disabled={restoring}
                >
                  <Text style={styles.cancelBtnText}>{t('ui.active_workout.cancel') || 'キャンセル'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, restoring && { opacity: 0.5 }]}
                  onPress={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>
                      {t('ui.profile.restore_btn_label') || '選択した項目を復元'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    modalBg: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 500,
      height: Dimensions.get('window').height * 0.8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    closeBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    noItemsText: {
      color: colors.textMuted,
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
    },
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 12,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    activeTabText: {
      color: colors.primary,
    },
    bulkActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    bulkBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 4,
      backgroundColor: colors.background,
    },
    bulkBtnText: {
      color: colors.text,
      fontSize: 13,
    },
    scrollArea: {
      flex: 1,
      marginBottom: 16,
    },
    groupContainer: {
      marginBottom: 16,
    },
    groupHeader: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      backgroundColor: colors.background,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      marginBottom: 8,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    itemSub: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    emptyText: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 24,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      minHeight: 48,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    confirmBtn: {
      flex: 1,
      minHeight: 48,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnText: {
      color: '#000',
      fontSize: 15,
      fontWeight: 'bold',
    },
  });
