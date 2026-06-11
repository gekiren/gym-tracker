import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, TextInput, Modal } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { format, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { getDB, loadFullWorkoutData, deleteWorkout, getExercises, addCustomExercise, deleteExercise, getFavoriteIds, toggleFavorite } from '../../src/db/database';
import { Theme } from '../../src/theme';
import { useFocusEffect, router } from 'expo-router';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTranslation } from 'react-i18next';
import { AI_CONFIG } from '../../src/config/aiConfig';
import { translateExercise, translateMuscleGroup, translateEquipment } from '../../src/i18n';
import WorkoutShareModal from '../../components/WorkoutShareModal';

type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
};

export default function HistoryScreen() {
  const settings = useWorkoutStore(state => state.settings);
  const chartScrollRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const { t, i18n } = useTranslation();

  // カレンダー用のステートとRef
  const cardOffsets = useRef<{ [key: number]: number }>({});
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedWorkoutId, setHighlightedWorkoutId] = useState<number | null>(null);

  // 指定した月の日付一覧を取得
  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  // 指定した月のワークアウト統計（サマリー）を計算
  const getMonthlyStats = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    let count = 0;
    let volume = 0;
    let calories = 0;

    workouts.forEach(w => {
      const date = new Date(w.start_time);
      if (date >= monthStart && date <= monthEnd) {
        count++;
        volume += w.volume || 0;
        calories += w.calories || 0;
      }
    });

    return { count, volume, calories };
  };

  // カレンダーの日付タップ時のスクロール＆ハイライト
  const handleDatePress = (dateStr: string) => {
    const targetWorkout = workouts.find(w => {
      const wDate = format(new Date(w.start_time), 'yyyy-MM-dd');
      return wDate === dateStr;
    });

    if (targetWorkout) {
      setCalendarVisible(false);
      const yOffset = cardOffsets.current[targetWorkout.id];
      if (yOffset !== undefined) {
        const scrollTarget = Math.max(0, yOffset - 20);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: scrollTarget, animated: true });
          setHighlightedWorkoutId(targetWorkout.id);
          setTimeout(() => {
            setHighlightedWorkoutId(null);
          }, 1500);
        }, 100);
      }
    }
  };

  // カレンダーモーダルの描画
  const renderCalendarModal = () => {
    const days = getCalendarDays();
    const { count, volume, calories } = getMonthlyStats();
    const isJa = i18n.language === 'ja';

    const monthYearText = isJa
      ? format(currentMonth, 'yyyy年 M月')
      : format(currentMonth, 'MMMM yyyy');

    const weekdays = isJa
      ? ['月', '火', '水', '木', '金', '土', '日']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const workoutsMap: { [key: string]: boolean } = {};
    workouts.forEach(w => {
      const dStr = format(new Date(w.start_time), 'yyyy-MM-dd');
      workoutsMap[dStr] = true;
    });

    return (
      <Modal
        visible={isCalendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>
                {isJa ? 'ワークアウト履歴カレンダー' : 'Workout Calendar'}
              </Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthSelector}>
              <TouchableOpacity
                onPress={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                style={styles.monthNavButton}
              >
                <Ionicons name="chevron-back" size={22} color={Theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.monthText}>{monthYearText}</Text>
              <TouchableOpacity
                onPress={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                style={styles.monthNavButton}
              >
                <Ionicons name="chevron-forward" size={22} color={Theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdaysContainer}>
              {weekdays.map((day, idx) => (
                <Text key={idx} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((day, idx) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const hasWorkout = workoutsMap[dayStr];
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dayCell}
                    disabled={!hasWorkout}
                    onPress={() => handleDatePress(dayStr)}
                  >
                    <View style={[
                      styles.dayBox,
                      hasWorkout && styles.workoutDayBox
                    ]}>
                      <Text style={[
                        styles.dayText,
                        !isCurrentMonth && styles.dimmedDayText,
                        hasWorkout && styles.workoutDayText
                      ]}>
                        {format(day, 'd')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>
                {isJa ? '月間サマリー' : 'Monthly Summary'}
              </Text>
              <View style={styles.summaryStatsRow}>
                <View style={styles.summaryStatBlock}>
                  <Text style={styles.summaryStatLabel}>{isJa ? '実施日数' : 'Workouts'}</Text>
                  <Text style={styles.summaryStatValue}>{count}{isJa ? '日' : ''}</Text>
                </View>
                <View style={styles.summaryStatBlock}>
                  <Text style={styles.summaryStatLabel}>{isJa ? '総ボリューム' : 'Total Volume'}</Text>
                  <Text style={styles.summaryStatValue}>
                    {volume > 0 ? `${volume.toLocaleString()} ${settings.weightUnit}` : '-'}
                  </Text>
                </View>
                <View style={styles.summaryStatBlock}>
                  <Text style={styles.summaryStatLabel}>{isJa ? '総消費カロリー' : 'Total Calories'}</Text>
                  <Text style={styles.summaryStatValue}>
                    {calories > 0 ? `${Math.round(calories).toLocaleString()} kcal` : '-'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // タブ切り替え用のステート
  const [activeTab, setActiveTab] = useState<'workouts' | 'exercises'>('workouts');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedWorkoutForShare, setSelectedWorkoutForShare] = useState<any>(null);
  const [chartScale, setChartScale] = useState<'day' | 'week' | 'month'>('day');
  const [chartMetric, setChartMetric] = useState<'volume' | 'calories'>('volume');

  // 種目一覧用のステート
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('すべて');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('すべて');
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('胸');
  const [newEquip, setNewEquip] = useState('ダンベル');

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
      fetchExercises();
    }, [])
  );

  const fetchWorkouts = async () => {
    try {
      const db = getDB();
      const rows = await db.getAllAsync(`
        SELECT w.*, 
               (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id) as exercise_count,
               (SELECT SUM(weight * reps) FROM workout_sets ws JOIN workout_exercises we ON ws.workout_exercise_id = we.id WHERE we.workout_id = w.id) as volume
        FROM workouts w 
        ORDER BY start_time DESC
      `);
      setWorkouts(rows as any[]);
    } catch (e) {
      console.warn('Failed to fetch workouts', e);
    }
  };

  const fetchExercises = async () => {
    try {
      const [data, favs] = await Promise.all([
        getExercises(),
        getFavoriteIds()
      ]);
      setExercises(data as Exercise[]);
      setFavoriteIds(favs);
    } catch (e) {
      console.warn('Failed to fetch exercises', e);
    }
  };

  const handleDeleteWorkout = (id: number, title: string) => {
    Alert.alert(
      t('ui.history.delete_alert_title'),
      t('ui.history.delete_alert_message', { title }),
      [
        { text: t('ui.common.cancel'), style: 'cancel' },
        { 
          text: t('ui.history.delete_confirm'), 
          style: 'destructive',
          onPress: async () => {
            await deleteWorkout(id);
            fetchWorkouts();
          }
        }
      ]
    );
  };

  const handleSNSSharePress = async (workoutId: number) => {
    const data = await loadFullWorkoutData(workoutId);
    if (data) {
      setSelectedWorkoutForShare(data);
      setShareModalVisible(true);
    }
  };

  const handleAICoachHistory = async (workoutId: number, title: string) => {
    const data = await loadFullWorkoutData(workoutId);
    if (!data) return;

    let contextStr = `【過去のワークアウト履歴データ】\n`;
    const dateStr = data.start_time.split('T')[0];
    contextStr += `■ 日付: ${dateStr} | タイトル: ${data.title}\n`;
    if (data.notes) contextStr += `全体メモ: "${data.notes}"\n`;
    
    for (const ex of data.exercises) {
      contextStr += `- ${ex.exercise_name}`;
      if (ex.notes) contextStr += ` (種目メモ: "${ex.notes}")`;
      contextStr += `: `;
      
      const setDescs = ex.sets.map((s: any) => {
        let sd = `${s.weight ?? 0}${settings.weightUnit} x ${s.reps ?? 0}回`;
        if (s.side) sd = `[${s.side === 'L' ? '左' : '右'}] ` + sd;
        if (s.variation) sd += ` (${s.variation})`;
        if (s.rpe) sd += ` (RPE: ${s.rpe})`;
        return sd;
      });
      contextStr += setDescs.join(', ') + '\n';
    }

    router.push({
      pathname: '/(tabs)/coach',
      params: {
        contextPrompt: contextStr,
        prefillMessage: `${dateStr}に実施した「${data.title}」の記録を分析し、アドバイスや評価をください。`,
        title: data.title
      }
    });
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

  const handleCreateExercise = async () => {
    if (!newName.trim()) {
      Alert.alert(t('ui.common.error'), t('ui.exercise_library.error_no_name'));
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
      setNewGroup('胸');
      setNewEquip('ダンベル');
      fetchExercises();
    } catch (e) {
      console.error(e);
      Alert.alert(t('ui.common.error'), t('ui.exercise_library.error_add_failed'));
    }
  };

  const handleDeleteExercise = async (ex: Exercise) => {
    Alert.alert(
      t('ui.exercise_select.delete_title'),
      t('ui.exercise_select.delete_message', { name: translateExercise(ex.name) }),
      [
        { text: t('ui.common.cancel'), style: 'cancel' },
        { 
          text: t('ui.common.delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(ex.id);
              fetchExercises();
            } catch (e) {
              Alert.alert(t('ui.common.error'), t('ui.exercise_select.delete_error'));
            }
          }
        }
      ]
    );
  };

  const renderRightActions = (progress: SharedValue<number>, drag: SharedValue<number>, item: Exercise) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 80 }],
      };
    });

    return (
      <View style={{ width: 80, flexDirection: 'row' }}>
        <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
          <TouchableOpacity 
            style={styles.deleteAction}
            onPress={() => handleDeleteExercise(item)}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </Reanimated.View>
      </View>
    );
  };

  const getChartData = () => {
    if (workouts.length === 0) return null;

    const getValue = (w: any) => {
      const val = chartMetric === 'volume' ? w.volume : w.calories;
      return (val && val > 0) ? val : 0;
    };

    if (chartScale === 'day') {
      const wRev = [...workouts].reverse();
      if (wRev.length < 2) return null;
      return {
        labels: wRev.map(w => format(new Date(w.start_time), 'MM/dd')).slice(-50),
        datasets: [
          {
            data: wRev.map(w => getValue(w)).slice(-50)
          }
        ]
      };
    }

    if (chartScale === 'week') {
      const weeklyData: { [key: string]: { date: Date; value: number } } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const key = weekStart.toISOString();
        if (!weeklyData[key]) {
          weeklyData[key] = { date: weekStart, value: 0 };
        }
        weeklyData[key].value += getValue(w);
      });

      const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedWeeks.length < 2) return null;

      const recentWeeks = sortedWeeks.slice(-50);
      return {
        labels: recentWeeks.map(w => format(w.date, 'MM/dd')),
        datasets: [
          {
            data: recentWeeks.map(w => w.value)
          }
        ]
      };
    }

    if (chartScale === 'month') {
      const monthlyData: { [key: string]: { date: Date; value: number } } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const monthStart = startOfMonth(date);
        const key = monthStart.toISOString();
        if (!monthlyData[key]) {
          monthlyData[key] = { date: monthStart, value: 0 };
        }
        monthlyData[key].value += getValue(w);
      });

      const sortedMonths = Object.values(monthlyData).sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedMonths.length < 2) return null;

      const recentMonths = sortedMonths.slice(-50);
      return {
        labels: recentMonths.map(w => format(w.date, 'yyyy/MM')),
        datasets: [
          {
            data: recentMonths.map(w => w.value)
          }
        ]
      };
    }

    return null;
  };

  const chartData = getChartData();

  // 種目のフィルタ＆ソート
  const dynamicCategories = Array.from(new Set(exercises.map(e => e.muscle_group).filter(Boolean)));
  const allCategories = Array.from(new Set(['胸', '背中', '肩', '腕', '脚', '腹筋', '有酸素', ...dynamicCategories])).filter(c => c !== 'その他');

  const filterCategories = ['すべて', ...allCategories, 'その他'];
  const allEquipments = Array.from(new Set(['バーベル', 'ダンベル', 'マシン', 'ケーブル', 'スミスマシン', 'EZバー', '自重', 'ウエイト', ...exercises.map(e => e.equipment).filter(Boolean)])).filter(e => e !== 'その他');
  const filterEquipments = ['すべて', ...allEquipments, 'その他'];

  const filteredExercises = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle_group?.includes(search);
    const matchCategory = selectedCategory === 'すべて' || 
                         (selectedCategory === 'その他' ? !allCategories.includes(e.muscle_group) : e.muscle_group === selectedCategory);
    const matchEquipment = selectedEquipment === 'すべて' ||
                         (selectedEquipment === 'その他' ? !allEquipments.includes(e.equipment) : e.equipment === selectedEquipment);
    return matchSearch && matchCategory && matchEquipment;
  }).sort((a, b) => {
    const aFav = favoriteIds.has(a.id);
    const bFav = favoriteIds.has(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* 上部タブ切り替えバー */}
          <View style={[styles.tabContainer, { flex: 1 }]}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'workouts' && styles.tabButtonActive]}
              onPress={() => setActiveTab('workouts')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'workouts' && styles.tabButtonTextActive]}>
                {t('ui.tabs.workout') || 'ワークアウト'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'exercises' && styles.tabButtonActive]}
              onPress={() => setActiveTab('exercises')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'exercises' && styles.tabButtonTextActive]}>
                {t('ui.tabs.exercises') || '種目'}
              </Text>
            </TouchableOpacity>
          </View>
          {activeTab === 'workouts' && (
            <TouchableOpacity 
              style={styles.calendarBtn}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={22} color={Theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activeTab === 'workouts' ? (
        <ScrollView ref={scrollViewRef} style={styles.subContainer} contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>{t('ui.history.subtitle')}</Text>
          
          {chartData && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>
                {chartMetric === 'volume' 
                  ? t('ui.history.chart_title', { unit: settings.weightUnit }) 
                  : t('ui.history.chart_title_calories')}
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.md }}>
                {/* 期間切り替え */}
                <View style={styles.scaleContainer}>
                  {(['day', 'week', 'month'] as const).map(scale => (
                    <TouchableOpacity
                      key={scale}
                      style={[styles.scaleButton, chartScale === scale && styles.scaleButtonActive]}
                      onPress={() => {
                        setChartScale(scale);
                      }}
                    >
                      <Text style={[styles.scaleButtonText, chartScale === scale && styles.scaleButtonTextActive]}>
                        {t(`ui.history.scale_${scale}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* メトリクス切り替え */}
                <View style={styles.scaleContainer}>
                  {(['volume', 'calories'] as const).map(metric => (
                    <TouchableOpacity
                      key={metric}
                      style={[styles.scaleButton, chartMetric === metric && styles.scaleButtonActive]}
                      onPress={() => {
                        setChartMetric(metric);
                      }}
                    >
                      <Text style={[styles.scaleButtonText, chartMetric === metric && styles.scaleButtonTextActive]}>
                        {metric === 'volume' ? t('ui.history.volume_label') : (t('ui.common.calories') || 'Calories')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, overflow: 'hidden' }}>
                {/* スクロールするグラフ本体部分 */}
                <ScrollView
                  key={`${chartScale}_${chartMetric}`}
                  ref={chartScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onContentSizeChange={() => chartScrollRef.current?.scrollToEnd({ animated: false })}
                  contentContainerStyle={{ paddingLeft: 15, paddingRight: 20 }}
                >
                  <BarChart
                    data={chartData}
                    width={Math.max(180, chartData.labels.length * 48)}
                    height={220}
                    chartConfig={{
                      backgroundColor: Theme.colors.card,
                      backgroundGradientFrom: Theme.colors.card,
                      backgroundGradientTo: Theme.colors.card,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      barPercentage: 0.55,
                      propsForBackgroundLines: {
                        stroke: 'rgba(255, 255, 255, 0.05)',
                        strokeDasharray: '3',
                      }
                    }}
                    withHorizontalLabels={false}
                    withVerticalLabels={true}
                    showValuesOnTopOfBars={true}
                    yAxisLabel=""
                    yAxisSuffix=""
                    style={{
                      marginLeft: -10,
                      paddingRight: 16,
                      paddingTop: 12,
                    }}
                  />
                </ScrollView>
              </View>
            </View>
          )}

          {workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('ui.history.empty_state')}</Text>
            </View>
          ) : (
            workouts.map(w => {
              const isHighlighted = w.id === highlightedWorkoutId;
              return (
                <TouchableOpacity 
                  key={w.id} 
                  style={[
                    styles.card,
                    isHighlighted && { borderColor: Theme.colors.primary, borderWidth: 2 }
                  ]}
                  activeOpacity={0.7}
                  onLayout={(e) => {
                    cardOffsets.current[w.id] = e.nativeEvent.layout.y;
                  }}
                  onPress={() => router.push({ pathname: '/workout-details/[id]', params: { id: w.id } } as any)}
                >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{w.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {AI_CONFIG.status === 'active' && (
                      <TouchableOpacity onPress={() => handleAICoachHistory(w.id, w.title)} style={[styles.exportIcon, { marginRight: 8 }]}>
                        <Ionicons name="sparkles" size={18} color={Theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleSNSSharePress(w.id)} style={[styles.exportIcon, { marginRight: 8 }]}>
                      <Ionicons name="share-social" size={18} color={Theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteWorkout(w.id, w.title)} style={[styles.exportIcon, { backgroundColor: 'rgba(255,50,50,0.1)' }]}>
                      <Ionicons name="trash" size={18} color={Theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.dateText}>{format(new Date(w.start_time), 'yyyy-MM-dd HH:mm')}</Text>
                  {w.end_time && (
                    <Text style={styles.durationText}>
                      ・{t('ui.history.duration_label')}: {Math.max(1, Math.round((new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000))}{t('ui.common.min_unit')}
                    </Text>
                  )}
                </View>
                
                {w.notes && (
                  <View style={styles.notesPreview}>
                    <Ionicons name="document-text-outline" size={14} color={Theme.colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.notesPreviewText} numberOfLines={2}>{w.notes}</Text>
                  </View>
                )}
                
                <View style={styles.statsRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>{t('ui.history.exercises_count')}</Text>
                    <Text style={styles.statValue}>{w.exercise_count}</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>{t('ui.history.volume_label')}</Text>
                    <Text style={styles.statValue}>{w.volume ? `${w.volume} ${settings.weightUnit}` : '-'}</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>{t('ui.common.calories') || 'Calories'}</Text>
                    <Text style={styles.statValue}>{w.calories ? `${w.calories} kcal` : '-'}</Text>
                  </View>
                </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        <View style={styles.subContainer}>
          <View style={styles.actionRow}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('ui.exercise_library.search_placeholder')}
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
          <View style={{ height: 40, marginBottom: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
              {filterCategories.map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{translateMuscleGroup(cat)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Equipment Filter Chips */}
          <View style={{ height: 40, marginBottom: Theme.spacing.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
              {filterEquipments.map(equip => (
                <TouchableOpacity 
                  key={equip} 
                  style={[styles.chip, selectedEquipment === equip && { backgroundColor: 'rgba(79, 172, 254, 0.1)', borderColor: 'rgba(79, 172, 254, 0.5)' }]}
                  onPress={() => setSelectedEquipment(equip)}
                >
                  <Text style={[styles.chipText, selectedEquipment === equip && styles.chipTextActive]}>{translateEquipment(equip)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={filteredExercises}
            keyExtractor={item => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => (
              <Swipeable
                renderRightActions={(prog, drag) => renderRightActions(prog, drag, item)}
                friction={2}
                rightThreshold={40}
              >
                <TouchableOpacity 
                  style={styles.item}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.id } } as any)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{translateExercise(item.name)}</Text>
                    <Text style={styles.meta}>{translateMuscleGroup(item.muscle_group)} • {translateEquipment(item.equipment)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleFavorite(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.starBtn}
                  >
                    <Ionicons
                      name={favoriteIds.has(item.id) ? 'star' : 'star-outline'}
                      size={22}
                      color={favoriteIds.has(item.id) ? '#f5a623' : Theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
                </TouchableOpacity>
              </Swipeable>
            )}
          />
        </View>
      )}

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('ui.exercise_library.create_custom_title')}</Text>
            
            <Text style={styles.label}>{t('ui.exercise_library.exercise_name_label')}</Text>
            <TextInput style={styles.modalInput} placeholder={t('ui.exercise_library.exercise_name_placeholder')} placeholderTextColor={Theme.colors.textMuted} value={newName} onChangeText={setNewName} />
            
            <Text style={styles.label}>{t('ui.exercise_library.target_muscle_label')}</Text>
            <View style={styles.choiceContainer}>
              {allCategories.map(g => (
                <TouchableOpacity key={g} onPress={() => setNewGroup(g)} style={[styles.choiceChip, newGroup === g && styles.choiceChipActive]}>
                  <Text style={[styles.choiceChipText, newGroup === g && styles.choiceChipTextActive]}>{translateMuscleGroup(g)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.modalInput, { marginTop: 8 }]} placeholder={t('ui.exercise_library.manual_input_placeholder')} placeholderTextColor={Theme.colors.textMuted} value={newGroup} onChangeText={setNewGroup} />
            
            <Text style={styles.label}>{t('ui.exercise_library.equipment_label')}</Text>
            <View style={styles.choiceContainer}>
              {allEquipments.map(e => (
                <TouchableOpacity key={e} onPress={() => setNewEquip(e)} style={[styles.choiceChip, newEquip === e && styles.choiceChipActive]}>
                  <Text style={[styles.choiceChipText, newEquip === e && styles.choiceChipTextActive]}>{translateEquipment(e)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.modalInput, { marginTop: 8 }]} placeholder={t('ui.exercise_library.manual_input_placeholder')} placeholderTextColor={Theme.colors.textMuted} value={newEquip} onChangeText={setNewEquip} />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('ui.common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateExercise}>
                <Text style={styles.saveBtnText}>{t('ui.exercise_library.save_and_add_btn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {renderCalendarModal()}
      {selectedWorkoutForShare && (
        <WorkoutShareModal
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false);
            setSelectedWorkoutForShare(null);
          }}
          workout={selectedWorkoutForShare}
          settings={settings}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { paddingHorizontal: Theme.spacing.md, paddingTop: Theme.spacing.sm, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.text, marginTop: Theme.spacing.md, marginBottom: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: Theme.borderRadius.md, padding: 4, marginTop: 0 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Theme.borderRadius.md - 2 },
  tabButtonActive: { backgroundColor: Theme.colors.card },
  tabButtonText: { color: Theme.colors.textMuted, fontWeight: '600', fontSize: 15 },
  tabButtonTextActive: { color: Theme.colors.primary },
  subContainer: { flex: 1, marginTop: Theme.spacing.md },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  subtitle: { fontSize: 16, color: Theme.colors.textMuted, marginBottom: Theme.spacing.xl },
  emptyState: { padding: Theme.spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, borderColor: Theme.colors.border, borderWidth: 1 },
  emptyStateText: { color: Theme.colors.textMuted, fontSize: 16 },
  card: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  exportIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a3a4a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Theme.borderRadius.md },
  exportText: { color: Theme.colors.primary, marginLeft: 4, fontWeight: 'bold' },
  dateText: { color: Theme.colors.textMuted },
  durationText: { color: Theme.colors.textMuted, marginLeft: 4 },
  statsRow: { flexDirection: 'row' },
  statBlock: { marginRight: 24 },
  statLabel: { color: Theme.colors.textMuted, fontSize: 12, marginBottom: 2 },
  statValue: { color: Theme.colors.text, fontSize: 16, fontWeight: '600' },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12
  },
  notesPreviewText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    flex: 1,
    lineHeight: 18
  },
  chartContainer: { marginBottom: Theme.spacing.xl },
  chartTitle: { color: Theme.colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: Theme.spacing.md },
  scaleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Theme.borderRadius.sm,
    padding: 2,
    marginBottom: Theme.spacing.md,
    alignSelf: 'flex-start',
  },
  scaleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm - 2,
  },
  scaleButtonActive: {
    backgroundColor: Theme.colors.card,
  },
  scaleButtonText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  scaleButtonTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  tooltipContainer: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderColor: 'rgba(79, 172, 254, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  tooltipText: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  tooltipValue: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  chart: { borderRadius: Theme.borderRadius.md },
  // 種目用のスタイル
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
  starBtn: { paddingHorizontal: 12 },
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
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteAction: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  // カレンダー用のスタイル
  calendarBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Theme.borderRadius.sm,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  monthNavButton: {
    padding: Theme.spacing.xs,
  },
  monthText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: Theme.spacing.xs,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  workoutDayBox: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
  },
  dayText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dimmedDayText: {
    color: '#444444',
  },
  workoutDayText: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  summaryContainer: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryStatBlock: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginBottom: 2,
  },
  summaryStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.text,
  }
});
