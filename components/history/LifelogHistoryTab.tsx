import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import {
  getAllWaterLogs,
  getAllTimeLogs,
  getAllHabitLogs,
  getHabitItems,
  getSettingValue,
  getWaterGoal,
  WaterLog,
  TimeLog,
  HabitLog,
  HabitItem,
} from '../../src/db/database';

interface LifelogHistoryTabProps {
  type: 'water' | 'time' | 'habit' | 'routine';
  t: (key: string, options?: any) => string;
}

export const LifelogHistoryTab: React.FC<LifelogHistoryTabProps> = ({ type, t }) => {
  const [loading, setLoading] = useState(true);
  const [chartScale, setChartScale] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [chartMetric, setChartMetric] = useState<'amount' | 'caffeine'>('amount'); // for water
  const [selectedFilter, setSelectedFilter] = useState<string>('all'); // tag, habitId, or routineId
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Raw Database Data
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [waterGoal, setWaterGoal] = useState<number>(2000);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [habitItems, setHabitItems] = useState<HabitItem[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);

  const chartScrollRef = useRef<ScrollView>(null);

  // Fetch Data on mount / type change
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (type === 'water') {
          const [wLogs, wGoal] = await Promise.all([getAllWaterLogs(), getWaterGoal()]);
          if (isMounted) {
            setWaterLogs(wLogs);
            setWaterGoal(wGoal);
          }
        } else if (type === 'time') {
          const tLogs = await getAllTimeLogs();
          if (isMounted) {
            setTimeLogs(tLogs);
          }
        } else if (type === 'habit') {
          const [hItems, hLogs] = await Promise.all([getHabitItems(), getAllHabitLogs()]);
          if (isMounted) {
            setHabitItems(hItems);
            setHabitLogs(hLogs);
          }
        } else if (type === 'routine') {
          const value = await getSettingValue('routine_tracker_data');
          if (isMounted) {
            setRoutines(value ? JSON.parse(value) : []);
          }
        }
      } catch (err) {
        console.warn('Failed to load history data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [type]);

  // Safe date parser
  const parseLogDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parsed = new Date(dateStr.replace(/\//g, '-'));
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // 1. Available Filters list
  const filtersList = useMemo(() => {
    const list: Array<{ id: string; name: string; color?: string }> = [{ id: 'all', name: t('ui.history.filter_all') || 'すべて' }];
    if (type === 'time') {
      const tags = new Set<string>();
      timeLogs.forEach((log) => {
        if (log.activity_name) tags.add(log.activity_name);
      });
      tags.forEach((tag) => list.push({ id: tag, name: tag }));
    } else if (type === 'habit') {
      habitItems.forEach((item) => {
        list.push({ id: String(item.id), name: item.name, color: item.color });
      });
    } else if (type === 'routine') {
      routines.forEach((r) => {
        list.push({ id: r.id, name: r.title || r.name });
      });
    }
    return list;
  }, [type, timeLogs, habitItems, routines, t]);

  const selectedFilterName = useMemo(() => {
    const matched = filtersList.find((f) => f.id === selectedFilter);
    return matched ? matched.name : t('ui.history.filter_all') || 'すべて';
  }, [selectedFilter, filtersList, t]);

  // Reset filter when type changes
  useEffect(() => {
    setSelectedFilter('all');
  }, [type]);

  // 2. Filtered & Aggregated Data for Chart
  const chartData = useMemo(() => {
    const aggregated: { [key: string]: { date: Date; value: number } } = {};

    const addVal = (key: string, date: Date, val: number) => {
      if (!aggregated[key]) {
        aggregated[key] = { date, value: 0 };
      }
      aggregated[key].value += val;
    };

    if (type === 'water') {
      waterLogs.forEach((log) => {
        const val = chartMetric === 'amount' ? log.amount : log.caffeine || 0;
        const date = parseLogDate(log.date);
        let key = '';

        if (chartScale === 'day') {
          key = log.date;
        } else if (chartScale === 'week') {
          key = startOfWeek(date, { weekStartsOn: 1 }).toISOString();
        } else if (chartScale === 'month') {
          key = startOfMonth(date).toISOString();
        } else if (chartScale === 'year') {
          key = new Date(date.getFullYear(), 0, 1).toISOString();
        }
        addVal(key, date, val);
      });
    } else if (type === 'time') {
      timeLogs.forEach((log) => {
        if (selectedFilter !== 'all' && log.activity_name !== selectedFilter) return;
        const date = parseLogDate(log.date);
        const hours = log.duration_minutes / 60;
        let key = '';

        if (chartScale === 'day') {
          key = log.date;
        } else if (chartScale === 'week') {
          key = startOfWeek(date, { weekStartsOn: 1 }).toISOString();
        } else if (chartScale === 'month') {
          key = startOfMonth(date).toISOString();
        } else if (chartScale === 'year') {
          key = new Date(date.getFullYear(), 0, 1).toISOString();
        }
        addVal(key, date, hours);
      });
    } else if (type === 'habit') {
      habitLogs.forEach((log) => {
        if (selectedFilter !== 'all' && log.habit_item_id !== parseInt(selectedFilter, 10)) return;
        const date = parseLogDate(log.date);
        let key = '';

        if (chartScale === 'day') {
          key = log.date;
        } else if (chartScale === 'week') {
          key = startOfWeek(date, { weekStartsOn: 1 }).toISOString();
        } else if (chartScale === 'month') {
          key = startOfMonth(date).toISOString();
        } else if (chartScale === 'year') {
          key = new Date(date.getFullYear(), 0, 1).toISOString();
        }
        addVal(key, date, 1);
      });
    } else if (type === 'routine') {
      routines.forEach((r) => {
        if (selectedFilter !== 'all' && r.id !== selectedFilter) return;
        if (r.history && Array.isArray(r.history)) {
          r.history.forEach((h: any) => {
            const date = new Date(h.timestamp);
            const dateStr = format(date, 'yyyy/MM/dd');
            let key = '';

            if (chartScale === 'day') {
              key = dateStr;
            } else if (chartScale === 'week') {
              key = startOfWeek(date, { weekStartsOn: 1 }).toISOString();
            } else if (chartScale === 'month') {
              key = startOfMonth(date).toISOString();
            } else if (chartScale === 'year') {
              key = new Date(date.getFullYear(), 0, 1).toISOString();
            }
            addVal(key, date, 1);
          });
        }
      });
    }

    const sorted = Object.values(aggregated).sort((a, b) => a.date.getTime() - b.date.getTime());
    if (sorted.length === 0) return null;

    const recent = sorted.slice(-50);
    const fmtStr =
      chartScale === 'day'
        ? 'MM/dd'
        : chartScale === 'week'
        ? 'MM/dd'
        : chartScale === 'month'
        ? 'yyyy/MM'
        : 'yyyy';

    return {
      labels: recent.map((item) => format(item.date, fmtStr)),
      datasets: [
        {
          data: recent.map((item) => parseFloat(item.value.toFixed(1))),
        },
      ],
    };
  }, [type, waterLogs, timeLogs, habitLogs, routines, chartScale, chartMetric, selectedFilter]);

  // 3. Detailed List Data Grouped by Date (for List display)
  const listItems = useMemo(() => {
    const list: any[] = [];
    const dateMap: { [key: string]: any } = {};

    const getOrCreateGroup = (dateStr: string) => {
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { dateStr, items: [], totalAmount: 0, totalCaffeine: 0, totalHours: 0 };
        list.push(dateMap[dateStr]);
      }
      return dateMap[dateStr];
    };

    if (type === 'water') {
      waterLogs.forEach((log) => {
        const group = getOrCreateGroup(log.date);
        group.totalAmount += log.amount;
        group.totalCaffeine += log.caffeine || 0;
        group.items.push(log);
      });
    } else if (type === 'time') {
      timeLogs.forEach((log) => {
        if (selectedFilter !== 'all' && log.activity_name !== selectedFilter) return;
        const group = getOrCreateGroup(log.date);
        group.totalHours += log.duration_minutes / 60;
        group.items.push(log);
      });
    } else if (type === 'habit') {
      habitLogs.forEach((log) => {
        if (selectedFilter !== 'all' && log.habit_item_id !== parseInt(selectedFilter, 10)) return;
        const group = getOrCreateGroup(log.date);
        const itemInfo = habitItems.find((hi) => hi.id === log.habit_item_id);
        group.items.push({ ...log, name: itemInfo ? itemInfo.name : 'Unknown Habit', color: itemInfo ? itemInfo.color : '#fff' });
      });
    } else if (type === 'routine') {
      routines.forEach((r) => {
        if (selectedFilter !== 'all' && r.id !== selectedFilter) return;
        if (r.history && Array.isArray(r.history)) {
          r.history.forEach((h: any) => {
            const date = new Date(h.timestamp);
            const dateStr = format(date, 'yyyy/MM/dd');
            const group = getOrCreateGroup(dateStr);
            group.items.push({ ...h, title: r.title || r.name });
          });
        }
      });
    }

    // Sort list by date descending
    list.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    return list;
  }, [type, waterLogs, timeLogs, habitLogs, habitItems, routines, selectedFilter]);

  // Scroll to end of chart when data loads or changes
  useEffect(() => {
    if (chartData && chartScrollRef.current) {
      setTimeout(() => {
        chartScrollRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [chartData, chartScale, chartMetric, selectedFilter]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  const renderFilterModal = () => {
    return (
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('ui.history.select_filter') || 'フィルター選択'}</Text>
            <FlatList
              data={filtersList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    selectedFilter === item.id && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedFilter(item.id);
                    setFilterModalVisible(false);
                  }}
                >
                  {item.color && (
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  )}
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedFilter === item.id && styles.filterOptionTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const getChartTitle = () => {
    if (type === 'water') {
      return chartMetric === 'amount'
        ? t('ui.history.chart_title_water') || '水分摂取量 (ml)'
        : t('ui.history.chart_title_caffeine') || 'カフェイン摂取量 (mg)';
    } else if (type === 'time') {
      return selectedFilter === 'all'
        ? t('ui.history.chart_title_time') || '時間管理 - 合計記録時間 (時間)'
        : `時間管理 - 「${selectedFilter}」の時間 (時間)`;
    } else if (type === 'habit') {
      return selectedFilter === 'all'
        ? t('ui.history.chart_title_habit') || '習慣 - 総達成回数 (回)'
        : `習慣 - 「${selectedFilterName}」達成回数 (回)`;
    } else {
      return selectedFilter === 'all'
        ? t('ui.history.chart_title_routine') || 'ルーティン - 総完了回数 (回)'
        : `ルーティン - 「${selectedFilterName}」完了回数 (回)`;
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={listItems}
        keyExtractor={(item) => item.dateStr}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            {/* Header / Metric & Filter Selector */}
            <View style={styles.selectorsRow}>
              {/* Type-Specific metric or item filter selectors */}
              {type === 'water' ? (
                <View style={styles.scaleContainer}>
                  {(['amount', 'caffeine'] as const).map((metric) => (
                    <TouchableOpacity
                      key={metric}
                      style={[
                        styles.scaleButton,
                        chartMetric === metric && styles.scaleButtonActive,
                      ]}
                      onPress={() => setChartMetric(metric)}
                    >
                      <Text
                        style={[
                          styles.scaleButtonText,
                          chartMetric === metric && styles.scaleButtonTextActive,
                        ]}
                      >
                        {metric === 'amount'
                          ? t('ui.history.metric_water') || '水分量'
                          : t('ui.history.metric_caffeine') || 'カフェイン'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setFilterModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="funnel-outline" size={14} color={Theme.colors.primary} />
                  <Text style={styles.dropdownBtnText} numberOfLines={1}>
                    {selectedFilterName}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              )}

              {/* Day, Week, Month, Year Scale selector */}
              <View style={styles.scaleContainer}>
                {(['day', 'week', 'month', 'year'] as const).map((scale) => (
                  <TouchableOpacity
                    key={scale}
                    style={[styles.scaleButton, chartScale === scale && styles.scaleButtonActive]}
                    onPress={() => setChartScale(scale)}
                  >
                    <Text
                      style={[
                        styles.scaleButtonText,
                        chartScale === scale && styles.scaleButtonTextActive,
                      ]}
                    >
                      {t(`ui.history.scale_${scale}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Chart Title */}
            <Text style={styles.chartTitle}>{getChartTitle()}</Text>

            {/* Chart Render */}
            {chartData ? (
              <View style={styles.chartWrapper}>
                <ScrollView
                  key={`${chartScale}_${chartMetric}_${selectedFilter}`}
                  ref={chartScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartScrollContent}
                >
                  <BarChart
                    data={chartData}
                    width={Math.max(340, chartData.labels.length * 48)}
                    height={220}
                    chartConfig={{
                      backgroundColor: Theme.colors.card,
                      backgroundGradientFrom: Theme.colors.card,
                      backgroundGradientTo: Theme.colors.card,
                      decimalPlaces: type === 'time' ? 1 : 0,
                      color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      barPercentage: 0.55,
                      propsForBackgroundLines: {
                        stroke: 'rgba(255, 255, 255, 0.05)',
                        strokeDasharray: '3',
                      },
                    }}
                    withHorizontalLabels={false}
                    withVerticalLabels={true}
                    showValuesOnTopOfBars={true}
                    yAxisLabel=""
                    yAxisSuffix=""
                    style={styles.barChartStyle}
                  />
                </ScrollView>
              </View>
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyText}>データがありません</Text>
              </View>
            )}

            {/* History List Header */}
            <Text style={styles.listSectionTitle}>
              {t('ui.history.section_history') || '過去の履歴'}
            </Text>
          </>
        }
        renderItem={({ item }) => {
          return (
            <View style={styles.historyCard}>
              <View style={styles.historyCardHeader}>
                <Text style={styles.historyDateText}>{item.dateStr}</Text>
                {type === 'water' && (
                  <Text style={styles.cardTotalText}>
                    合計: {item.totalAmount}ml / {waterGoal}ml
                    {item.totalCaffeine > 0 ? ` (☕ ${item.totalCaffeine}mg)` : ''}
                  </Text>
                )}
                {type === 'time' && (
                  <Text style={styles.cardTotalText}>
                    記録時間: {item.totalHours.toFixed(1)}時間
                  </Text>
                )}
                {type === 'habit' && (
                  <Text style={styles.cardTotalText}>回数: {item.items.length}回</Text>
                )}
                {type === 'routine' && (
                  <Text style={styles.cardTotalText}>完了: {item.items.length}件</Text>
                )}
              </View>

              <View style={styles.historyCardBody}>
                {item.items.map((sub: any, idx: number) => {
                  if (type === 'water') {
                    return (
                      <View key={sub.id || idx} style={styles.listItemRow}>
                        <Ionicons name="water" size={14} color="#00d2ff" style={styles.listIcon} />
                        <Text style={styles.listMainText}>{sub.amount}ml</Text>
                        {sub.caffeine > 0 && (
                          <Text style={styles.listSubText}>☕ {sub.caffeine}mg</Text>
                        )}
                        <Text style={styles.listTimeText}>
                          {format(new Date(sub.timestamp), 'HH:mm')}
                        </Text>
                      </View>
                    );
                  } else if (type === 'time') {
                    return (
                      <View key={sub.id || idx} style={styles.listItemRow}>
                        <Ionicons name="time" size={14} color="#ff9800" style={styles.listIcon} />
                        <Text style={styles.listMainText}>{sub.activity_name}</Text>
                        <Text style={styles.listSubText}>
                          {sub.start_time} - {sub.end_time}
                        </Text>
                        <Text style={styles.listTimeText}>
                          {(sub.duration_minutes / 60).toFixed(1)}h
                        </Text>
                      </View>
                    );
                  } else if (type === 'habit') {
                    return (
                      <View key={sub.id || idx} style={styles.listItemRow}>
                        <View style={[styles.habitColorDot, { backgroundColor: sub.color }]} />
                        <Text style={styles.listMainText}>{sub.name}</Text>
                        <Text style={styles.listTimeText}>
                          {format(new Date(sub.timestamp), 'HH:mm')}
                        </Text>
                      </View>
                    );
                  } else if (type === 'routine') {
                    return (
                      <View key={sub.id || idx} style={styles.listItemRow}>
                        <Ionicons
                          name="checkmark-done-circle"
                          size={14}
                          color="#4caf50"
                          style={styles.listIcon}
                        />
                        <Text style={styles.listMainText}>{sub.title}</Text>
                        <Text style={styles.listTimeText}>
                          {format(new Date(sub.timestamp), 'HH:mm')}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {t('ui.history.empty_state') || 'まだ記録がありません。'}
            </Text>
          </View>
        }
      />
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Theme.spacing.md, paddingBottom: 100 },
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
    gap: 8,
  },
  scaleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  scaleButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scaleButtonActive: {
    backgroundColor: 'rgba(79,172,254,0.15)',
  },
  scaleButtonText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  scaleButtonTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    maxWidth: 160,
  },
  dropdownBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.sm,
  },
  chartWrapper: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: Theme.spacing.lg,
  },
  chartScrollContent: {
    paddingLeft: 15,
    paddingRight: 20,
  },
  barChartStyle: {
    marginLeft: -10,
    paddingRight: 16,
    paddingTop: 12,
  },
  emptyChart: {
    height: 180,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  listSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  historyCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  historyDateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardTotalText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
  },
  historyCardBody: {
    gap: 8,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  listIcon: {
    marginRight: 8,
  },
  habitColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  listMainText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  listSubText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginRight: 12,
  },
  listTimeText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  filterOptionActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  filterOptionText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  filterOptionTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
});
