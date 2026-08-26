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
  Dimensions,
  Alert,
} from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, Rect, G } from 'react-native-svg';
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
  getAllMealLogs,
  getNutritionGoals,
  WaterLog,
  TimeLog,
  HabitLog,
  HabitItem,
  MealLog,
  NutritionGoals,
} from '../../src/db/database';
import { getAllBodyLogs } from '../../src/db/repositories/bodyRepository';
import { BodyCompositionLog } from '../../src/types/bodyComposition';
import { useBodyStore } from '../../src/store/bodyStore';
import { calculateMfRatio, calculateMachoScore } from '../../src/utils/bodyCalculators';

interface LifelogHistoryTabProps {
  type: 'water' | 'time' | 'habit' | 'routine' | 'nutrition' | 'body';
  t: (key: string, options?: any) => string;
}

interface ChartPoint {
  id: string;
  label: string;
  dateStr: string;
  value: number;
  subValue?: number; // e.g. caffeine amount when viewing water
  date: Date;
}

// Linear Path Generator
function createLinearPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

export const LifelogHistoryTab: React.FC<LifelogHistoryTabProps> = ({ type, t }) => {
  const [loading, setLoading] = useState(true);
  const [chartScale, setChartScale] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [chartMetric, setChartMetric] = useState<
    | 'amount'
    | 'caffeine'
    | 'calories'
    | 'protein'
    | 'fat'
    | 'carbs'
    | 'weight'
    | 'body_fat_rate'
    | 'muscle_mass'
    | 'lbm'
    | 'mf_ratio'
    | 'macho_score'
  >('amount');
  const [selectedFilter, setSelectedFilter] = useState<string>('all'); // tag, habitId, or routineId
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [metricModalVisible, setMetricModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Raw Database Data
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [waterGoal, setWaterGoal] = useState<number>(2000);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [habitItems, setHabitItems] = useState<HabitItem[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
  const [bodyLogs, setBodyLogs] = useState<BodyCompositionLog[]>([]);

  const deleteBodyLogAction = useBodyStore((state) => state.deleteBodyLog);

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
        } else if (type === 'nutrition') {
          const [mLogs, nGoals] = await Promise.all([getAllMealLogs(), getNutritionGoals()]);
          if (isMounted) {
            setMealLogs(mLogs);
            setNutritionGoals(nGoals);
          }
        } else if (type === 'body') {
          const bLogs = await getAllBodyLogs(100);
          if (isMounted) {
            setBodyLogs(bLogs);
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

  // Reset filter & selected index when type changes
  useEffect(() => {
    setSelectedFilter('all');
    setSelectedIndex(null);
    if (type === 'nutrition') {
      setChartMetric('calories');
    } else if (type === 'water') {
      setChartMetric('amount');
    } else if (type === 'body') {
      setChartMetric('weight');
    }
  }, [type]);

  // 2. Filtered & Aggregated Data Points for SVG Chart
  const chartPoints = useMemo<ChartPoint[]>(() => {
    const aggregated: { [key: string]: { date: Date; value: number; subValue: number } } = {};

    const addVal = (key: string, date: Date, val: number, subVal: number = 0) => {
      if (!aggregated[key]) {
        aggregated[key] = { date, value: 0, subValue: 0 };
      }
      aggregated[key].value += val;
      aggregated[key].subValue += subVal;
    };

    if (type === 'water') {
      waterLogs.forEach((log) => {
        const val = chartMetric === 'amount' ? log.amount : log.caffeine || 0;
        const subVal = chartMetric === 'amount' ? (log.caffeine || 0) : log.amount;
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
        addVal(key, date, val, subVal);
      });
    } else if (type === 'nutrition') {
      mealLogs.forEach((log) => {
        let val = 0;
        if (chartMetric === 'calories') val = log.calories || 0;
        else if (chartMetric === 'protein') val = log.protein || 0;
        else if (chartMetric === 'fat') val = log.fat || 0;
        else if (chartMetric === 'carbs') val = log.carbs || 0;

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
    } else if (type === 'body') {
      const bodyGroup: { [key: string]: { date: Date; values: number[]; subValues: number[] } } = {};
      const fallbackHeight = bodyLogs.find((b) => b.height && b.height > 0)?.height || null;

      bodyLogs.forEach((log) => {
        let val: number | null = null;
        let subVal: number = 0;
        if (chartMetric === 'weight') {
          val = log.weight;
          subVal = log.body_fat_rate || 0;
        } else if (chartMetric === 'body_fat_rate') {
          val = log.body_fat_rate;
          subVal = log.weight || 0;
        } else if (chartMetric === 'muscle_mass') {
          val = log.muscle_mass;
          subVal = log.weight || 0;
        } else if (chartMetric === 'lbm') {
          val = log.lbm;
          subVal = log.body_fat_rate || 0;
        } else if (chartMetric === 'mf_ratio') {
          if (log.muscle_mass && log.weight && log.body_fat_rate) {
            const mf = calculateMfRatio(log.muscle_mass, log.weight, log.body_fat_rate);
            if (mf) {
              val = mf.mfRatio;
              subVal = log.muscle_mass;
            }
          }
        } else if (chartMetric === 'macho_score') {
          const h = log.height || fallbackHeight;
          if (log.weight && log.body_fat_rate && h) {
            const ms = calculateMachoScore(log.weight, log.body_fat_rate, h);
            if (ms) {
              val = ms.score;
              subVal = ms.fatBonus;
            }
          }
        }

        if (val === null || val === undefined || isNaN(val) || val <= 0) return;

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

        if (!bodyGroup[key]) {
          bodyGroup[key] = { date, values: [], subValues: [] };
        }
        bodyGroup[key].values.push(val);
        if (subVal > 0) bodyGroup[key].subValues.push(subVal);
      });

      Object.entries(bodyGroup).forEach(([k, g]) => {
        const avgVal = g.values.reduce((sum, v) => sum + v, 0) / g.values.length;
        const avgSub = g.subValues.length > 0 ? g.subValues.reduce((sum, v) => sum + v, 0) / g.subValues.length : 0;
        addVal(k, g.date, avgVal, avgSub);
      });
    }

    const sorted = Object.values(aggregated).sort((a, b) => a.date.getTime() - b.date.getTime());
    if (sorted.length === 0) return [];

    const recent = sorted.slice(-40);
    const fmtLabel =
      chartScale === 'day'
        ? 'MM/dd'
        : chartScale === 'week'
        ? 'MM/dd'
        : chartScale === 'month'
        ? 'yyyy/MM'
        : 'yyyy';

    const fmtDateStr = (date: Date) => {
      if (chartScale === 'day') return format(date, 'yyyy/MM/dd (eee)');
      if (chartScale === 'week') return `${format(date, 'yyyy/MM/dd')}週`;
      if (chartScale === 'month') return format(date, 'yyyy年M月');
      return format(date, 'yyyy年');
    };

    return recent.map((item) => ({
      id: item.date.toISOString(),
      label: format(item.date, fmtLabel),
      dateStr: fmtDateStr(item.date),
      value: parseFloat(item.value.toFixed(1)),
      subValue: parseFloat(item.subValue.toFixed(1)),
      date: item.date,
    }));
  }, [type, waterLogs, timeLogs, habitLogs, routines, mealLogs, chartScale, chartMetric, selectedFilter]);

  // Active Selected Point Calculation
  const activeIndex =
    selectedIndex !== null && selectedIndex < chartPoints.length
      ? selectedIndex
      : chartPoints.length > 0
      ? chartPoints.length - 1
      : null;

  const activePoint = activeIndex !== null ? chartPoints[activeIndex] : null;

  // 3. Detailed List Data Grouped by Date (for List display)
  const listItems = useMemo(() => {
    const list: any[] = [];
    const dateMap: { [key: string]: any } = {};

    const getOrCreateGroup = (dateStr: string) => {
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { dateStr, items: [], totalAmount: 0, totalCaffeine: 0, totalHours: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 };
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
    } else if (type === 'nutrition') {
      mealLogs.forEach((log) => {
        const group = getOrCreateGroup(log.date);
        group.totalCalories += log.calories || 0;
        group.totalProtein += log.protein || 0;
        group.totalFat += log.fat || 0;
        group.totalCarbs += log.carbs || 0;
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
    } else if (type === 'body') {
      bodyLogs.forEach((log) => {
        const group = getOrCreateGroup(log.date);
        group.items.push(log);
      });
    }

    // Sort list by date descending
    list.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    return list;
  }, [type, waterLogs, timeLogs, habitLogs, habitItems, routines, mealLogs, bodyLogs, selectedFilter]);

  // Scroll to end of chart when data loads or changes
  useEffect(() => {
    if (chartPoints.length > 0 && chartScrollRef.current) {
      setTimeout(() => {
        chartScrollRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [chartPoints.length, chartScale, chartMetric, selectedFilter]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  // Header Title Text
  const getChartTitleText = () => {
    if (type === 'water') {
      return chartMetric === 'amount'
        ? (t('ui.history.chart_title_water') || '最近の水分摂取量 (ml)')
        : (t('ui.history.chart_title_caffeine') || '最近のカフェイン摂取量 (mg)');
    } else if (type === 'nutrition') {
      if (chartMetric === 'calories') return t('ui.history.chart_title_nutrition_calories') || '最近の摂取カロリー (kcal)';
      if (chartMetric === 'protein') return t('ui.history.chart_title_nutrition_protein') || '最近のタンパク質摂取量 (g)';
      if (chartMetric === 'fat') return t('ui.history.chart_title_nutrition_fat') || '最近の脂質摂取量 (g)';
      if (chartMetric === 'carbs') return t('ui.history.chart_title_nutrition_carbs') || '最近の炭水化物摂取量 (g)';
    } else if (type === 'body') {
      if (chartMetric === 'weight') return t('ui.history.chart_title_body_weight') || '最近の体重推移 (kg)';
      if (chartMetric === 'body_fat_rate') return t('ui.history.chart_title_body_fat') || '最近の体脂肪率推移 (%)';
      if (chartMetric === 'muscle_mass') return t('ui.history.chart_title_body_muscle') || '最近の骨格筋量推移 (kg)';
      if (chartMetric === 'lbm') return t('ui.history.chart_title_body_lbm') || '最近の除脂肪体重(LBM)推移 (kg)';
      if (chartMetric === 'mf_ratio') return t('ui.history.chart_title_body_mf_ratio') || '最近の筋肉・脂肪比 (MF比) 推移';
      if (chartMetric === 'macho_score') return t('ui.history.chart_title_body_macho_score') || '最近のマッチョスコア (MS) 推移 (pt)';
    } else if (type === 'time') {
      return selectedFilter === 'all'
        ? (t('ui.history.chart_title_time') || '最近の活動時間 (時間)')
        : (t('ui.history.chart_title_time_tag', { tag: selectedFilter }) || `最近の${selectedFilter}時間 (時間)`);
    } else if (type === 'habit') {
      return selectedFilter === 'all'
        ? (t('ui.history.chart_title_habit') || '最近の習慣達成回数')
        : (t('ui.history.chart_title_habit_item', { item: selectedFilterName }) || `最近の${selectedFilterName}達成回数`);
    } else {
      return selectedFilter === 'all'
        ? (t('ui.history.chart_title_routine') || '最近のルーティン達成回数')
        : (t('ui.history.chart_title_routine_item', { item: selectedFilterName }) || `最近の${selectedFilterName}達成回数`);
    }
  };

  // Formatted Unit for Summary Card
  const getFormattedSummary = (point: ChartPoint) => {
    if (type === 'water') {
      if (chartMetric === 'amount') {
        return { valStr: Math.round(point.value).toLocaleString(), unitStr: 'ml' };
      } else {
        return { valStr: Math.round(point.value).toLocaleString(), unitStr: 'mg' };
      }
    } else if (type === 'nutrition') {
      if (chartMetric === 'calories') {
        return { valStr: Math.round(point.value).toLocaleString(), unitStr: 'kcal' };
      } else {
        return { valStr: point.value.toFixed(1), unitStr: 'g' };
      }
    } else if (type === 'body') {
      if (chartMetric === 'body_fat_rate') {
        return { valStr: point.value.toFixed(1), unitStr: '%' };
      } else if (chartMetric === 'mf_ratio') {
        return { valStr: point.value.toFixed(2), unitStr: '比' };
      } else if (chartMetric === 'macho_score') {
        return { valStr: point.value.toFixed(1), unitStr: 'pt' };
      } else {
        return { valStr: point.value.toFixed(1), unitStr: 'kg' };
      }
    } else if (type === 'time') {
      return { valStr: point.value.toFixed(1), unitStr: t('ui.history.unit_hours') || '時間' };
    } else {
      return { valStr: Math.round(point.value).toLocaleString(), unitStr: t('ui.history.unit_times') || '回' };
    }
  };

  // SVG Dimension & Coordinate Calculations
  const containerWidth = Dimensions.get('window').width - 32;
  const targetDisplayCount = 7;
  const pointWidth = Math.max(48, Math.floor(containerWidth / targetDisplayCount));
  const svgHeight = 180;
  const paddingTop = 45;
  const paddingBottom = 35;
  const drawHeight = svgHeight - paddingTop - paddingBottom;
  const svgWidth = Math.max(containerWidth, chartPoints.length * pointWidth);

  // Maximum scale logic
  let maxVal = Math.max(0.001, ...chartPoints.map((p) => p.value));
  let goalY: number | null = null;
  let targetGoal: number | null = null;

  // Scale multiplier for day/week/month/year
  const scaleMultiplier = chartScale === 'day' ? 1 : chartScale === 'week' ? 7 : chartScale === 'month' ? 30 : 365;

  if (type === 'water' && chartMetric === 'amount' && waterGoal > 0) {
    targetGoal = waterGoal * scaleMultiplier;
  } else if (type === 'nutrition' && nutritionGoals) {
    if (chartMetric === 'calories' && nutritionGoals.calories > 0) targetGoal = nutritionGoals.calories * scaleMultiplier;
    else if (chartMetric === 'protein' && nutritionGoals.protein > 0) targetGoal = nutritionGoals.protein * scaleMultiplier;
    else if (chartMetric === 'fat' && nutritionGoals.fat > 0) targetGoal = nutritionGoals.fat * scaleMultiplier;
    else if (chartMetric === 'carbs' && nutritionGoals.carbs > 0) targetGoal = nutritionGoals.carbs * scaleMultiplier;
  } else if (type === 'habit') {
    if (selectedFilter !== 'all') {
      const selectedItem = habitItems.find((h) => String(h.id) === selectedFilter);
      const itemTarget = selectedItem ? (selectedItem.target_count || (selectedItem as any).targetCount || 0) : 0;
      if (itemTarget > 0) {
        targetGoal = itemTarget * scaleMultiplier;
      }
    } else {
      const totalTarget = habitItems.reduce((sum, h) => {
        if (h.is_hidden === 1) return sum;
        return sum + (h.target_count || (h as any).targetCount || 0);
      }, 0);
      if (totalTarget > 0) {
        targetGoal = totalTarget * scaleMultiplier;
      }
    }
  }

  const getGoalLabelText = () => {
    if (!targetGoal) return '';
    if (type === 'water') return `目標 ${Math.round(targetGoal)}ml`;
    if (type === 'nutrition') {
      if (chartMetric === 'calories') return `目標 ${Math.round(targetGoal)}kcal`;
      return `目標 ${targetGoal.toFixed(1)}g`;
    }
    if (type === 'habit') return `目標 ${Math.round(targetGoal)}回`;
    return `目標 ${targetGoal}`;
  };

  if (targetGoal !== null && targetGoal > 0) {
    maxVal = Math.max(maxVal, targetGoal * 1.15);
    const goalNorm = targetGoal / maxVal;
    goalY = svgHeight - paddingBottom - goalNorm * drawHeight;
  }

  const coords = chartPoints.map((p, idx) => {
    const x = (idx + 0.5) * pointWidth;
    const valNorm = maxVal > 0 ? p.value / maxVal : 0;
    const y = svgHeight - paddingBottom - valNorm * drawHeight;
    return { x, y, point: p, idx };
  });

  const linearPath = createLinearPath(coords.map((c) => ({ x: c.x, y: c.y })));
  const areaPath =
    coords.length > 0
      ? `${linearPath} L ${coords[coords.length - 1].x} ${svgHeight - paddingBottom} L ${coords[0].x} ${svgHeight - paddingBottom} Z`
      : '';

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
                    setSelectedIndex(null);
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

  const renderMetricModal = () => {
    return (
      <Modal
        visible={metricModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMetricModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMetricModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name={
                    type === 'nutrition'
                      ? 'restaurant-outline'
                      : type === 'body'
                      ? 'scale-outline'
                      : 'water-outline'
                  }
                  size={20}
                  color={Theme.colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.modalTitle}>
                  {t('ui.history.metric_select_title') || '表示する指標を選択'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMetricModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {type === 'nutrition' ? (
              <>
                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'calories' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('calories');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'calories' && styles.optionIconBoxActive]}>
                    <Ionicons name="flame" size={20} color={chartMetric === 'calories' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'calories' && styles.optionTitleActive]}>
                      {t('ui.history.metric_calories') || 'カロリー'} (kcal)
                    </Text>
                    <Text style={styles.optionSub}>日々の摂取カロリーの推移を表示します</Text>
                  </View>
                  {chartMetric === 'calories' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'protein' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('protein');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'protein' && styles.optionIconBoxActive]}>
                    <Ionicons name="fitness" size={20} color={chartMetric === 'protein' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'protein' && styles.optionTitleActive]}>
                      {t('ui.history.metric_protein') || 'タンパク質'} (g)
                    </Text>
                    <Text style={styles.optionSub}>日々のタンパク質摂取量の推移を表示します</Text>
                  </View>
                  {chartMetric === 'protein' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'fat' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('fat');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'fat' && styles.optionIconBoxActive]}>
                    <Ionicons name="pizza" size={20} color={chartMetric === 'fat' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'fat' && styles.optionTitleActive]}>
                      {t('ui.history.metric_fat') || '脂質'} (g)
                    </Text>
                    <Text style={styles.optionSub}>日々の脂質摂取量の推移を表示します</Text>
                  </View>
                  {chartMetric === 'fat' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'carbs' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('carbs');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'carbs' && styles.optionIconBoxActive]}>
                    <Ionicons name="nutrition" size={20} color={chartMetric === 'carbs' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'carbs' && styles.optionTitleActive]}>
                      {t('ui.history.metric_carbs') || '炭水化物'} (g)
                    </Text>
                    <Text style={styles.optionSub}>日々の炭水化物摂取量の推移を表示します</Text>
                  </View>
                  {chartMetric === 'carbs' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>
              </>
            ) : type === 'body' ? (
              <>
                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'weight' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('weight');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'weight' && styles.optionIconBoxActive]}>
                    <Ionicons name="scale-outline" size={20} color={chartMetric === 'weight' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'weight' && styles.optionTitleActive]}>
                      {t('ui.history.metric_weight') || '体重'} (kg)
                    </Text>
                    <Text style={styles.optionSub}>日々の体重の推移を表示します</Text>
                  </View>
                  {chartMetric === 'weight' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'body_fat_rate' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('body_fat_rate');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'body_fat_rate' && styles.optionIconBoxActive]}>
                    <Ionicons name="pie-chart-outline" size={20} color={chartMetric === 'body_fat_rate' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'body_fat_rate' && styles.optionTitleActive]}>
                      {t('ui.history.metric_body_fat') || '体脂肪率'} (%)
                    </Text>
                    <Text style={styles.optionSub}>日々の体脂肪率の推移を表示します</Text>
                  </View>
                  {chartMetric === 'body_fat_rate' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'muscle_mass' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('muscle_mass');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'muscle_mass' && styles.optionIconBoxActive]}>
                    <Ionicons name="barbell-outline" size={20} color={chartMetric === 'muscle_mass' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'muscle_mass' && styles.optionTitleActive]}>
                      {t('ui.history.metric_muscle_mass') || '骨格筋量・筋肉量'} (kg)
                    </Text>
                    <Text style={styles.optionSub}>日々の骨格筋量・筋肉量の推移を表示します</Text>
                  </View>
                  {chartMetric === 'muscle_mass' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'lbm' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('lbm');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'lbm' && styles.optionIconBoxActive]}>
                    <Ionicons name="body-outline" size={20} color={chartMetric === 'lbm' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'lbm' && styles.optionTitleActive]}>
                      {t('ui.history.metric_lbm') || '除脂肪体重 (LBM)'} (kg)
                    </Text>
                    <Text style={styles.optionSub}>日々の除脂肪体重の推移を表示します</Text>
                  </View>
                  {chartMetric === 'lbm' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'mf_ratio' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('mf_ratio');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'mf_ratio' && styles.optionIconBoxActive]}>
                    <Ionicons name="git-compare-outline" size={20} color={chartMetric === 'mf_ratio' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'mf_ratio' && styles.optionTitleActive]}>
                      {t('ui.history.metric_mf_ratio') || '筋肉・脂肪比 (MF比)'}
                    </Text>
                    <Text style={styles.optionSub}>筋肉量 ÷ 体脂肪量による筋肉の密度推移を表示します</Text>
                  </View>
                  {chartMetric === 'mf_ratio' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'macho_score' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('macho_score');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'macho_score' && styles.optionIconBoxActive]}>
                    <Ionicons name="flame-outline" size={20} color={chartMetric === 'macho_score' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'macho_score' && styles.optionTitleActive]}>
                      {t('ui.history.metric_macho_score') || 'マッチョスコア (MS)'} (pt)
                    </Text>
                    <Text style={styles.optionSub}>FFMI ＋ 絞りボーナスによる総合スコア推移を表示します</Text>
                  </View>
                  {chartMetric === 'macho_score' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'amount' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('amount');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'amount' && styles.optionIconBoxActive]}>
                    <Ionicons name="water" size={20} color={chartMetric === 'amount' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'amount' && styles.optionTitleActive]}>
                      {t('ui.history.metric_water') || '水分量 (ml)'}
                    </Text>
                    <Text style={styles.optionSub}>日々の水分摂取量の推移を表示します</Text>
                  </View>
                  {chartMetric === 'amount' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.metricOptionItem, chartMetric === 'caffeine' && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric('caffeine');
                    setSelectedIndex(null);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconBox, chartMetric === 'caffeine' && styles.optionIconBoxActive]}>
                    <Ionicons name="cafe" size={20} color={chartMetric === 'caffeine' ? Theme.colors.primary : Theme.colors.textMuted} />
                  </View>
                  <View style={styles.optionTextContent}>
                    <Text style={[styles.optionTitle, chartMetric === 'caffeine' && styles.optionTitleActive]}>
                      {t('ui.history.metric_caffeine') || 'カフェイン (mg)'}
                    </Text>
                    <Text style={styles.optionSub}>カフェイン摂取量の推移を表示します</Text>
                  </View>
                  {chartMetric === 'caffeine' && <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />}
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={listItems}
        keyExtractor={(item) => item.dateStr}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <View style={styles.chartSectionContainer}>
            {/* Header & Chart Title */}
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartTitle}>{getChartTitleText()}</Text>
            </View>

            {/* Selectors Row (Scale & Metric/Filter) */}
            <View style={styles.selectorsRow}>
              {/* Day, Week, Month, Year Scale selector */}
              <View style={styles.scaleContainer}>
                {(['day', 'week', 'month', 'year'] as const).map((scale) => (
                  <TouchableOpacity
                    key={scale}
                    style={[styles.scaleButton, chartScale === scale && styles.scaleButtonActive]}
                    onPress={() => {
                      setChartScale(scale);
                      setSelectedIndex(null);
                    }}
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

              {/* Type-Specific metric or item filter selector button */}
              {type === 'water' || type === 'nutrition' || type === 'body' ? (
                <TouchableOpacity
                  style={styles.metricSelectBtn}
                  onPress={() => setMetricModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      type === 'nutrition'
                        ? (chartMetric === 'calories' ? 'flame' : chartMetric === 'protein' ? 'fitness' : chartMetric === 'fat' ? 'pizza' : 'nutrition')
                        : type === 'body'
                        ? (chartMetric === 'weight' ? 'scale-outline' : chartMetric === 'body_fat_rate' ? 'pie-chart-outline' : chartMetric === 'muscle_mass' ? 'barbell-outline' : chartMetric === 'lbm' ? 'body-outline' : chartMetric === 'mf_ratio' ? 'git-compare-outline' : 'flame-outline')
                        : (chartMetric === 'amount' ? 'water' : 'cafe')
                    }
                    size={14}
                    color={Theme.colors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.metricSelectBtnText} numberOfLines={1}>
                    {type === 'nutrition'
                      ? (chartMetric === 'calories' ? (t('ui.history.metric_calories') || 'カロリー') : chartMetric === 'protein' ? (t('ui.history.metric_protein') || 'タンパク質') : chartMetric === 'fat' ? (t('ui.history.metric_fat') || '脂質') : (t('ui.history.metric_carbs') || '炭水化物'))
                      : type === 'body'
                      ? (chartMetric === 'weight' ? (t('ui.history.metric_weight') || '体重') : chartMetric === 'body_fat_rate' ? (t('ui.history.metric_body_fat') || '体脂肪率') : chartMetric === 'muscle_mass' ? (t('ui.history.metric_muscle_mass') || '骨格筋量') : chartMetric === 'lbm' ? (t('ui.history.metric_lbm') || '除脂肪体重') : chartMetric === 'mf_ratio' ? (t('ui.history.metric_mf_ratio') || 'MF比') : (t('ui.history.metric_macho_score') || 'MSスコア'))
                      : (chartMetric === 'amount' ? (t('ui.history.metric_water') || '水分量') : (t('ui.history.metric_caffeine') || 'カフェイン'))}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Theme.colors.textMuted} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
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
            </View>

            {/* Active Selected Point Summary Card */}
            {activePoint && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryLeftContent}>
                  <Text style={styles.summaryDate}>{activePoint.dateStr}</Text>
                  <View style={styles.summaryValRow}>
                    {(() => {
                      const { valStr, unitStr } = getFormattedSummary(activePoint);
                      return (
                        <Text style={styles.summaryVal}>
                          {valStr}
                          <Text style={styles.summaryUnit}> {unitStr}</Text>
                        </Text>
                      );
                    })()}

                    {targetGoal !== null && targetGoal > 0 && (
                      <View
                        style={[
                          styles.badge,
                          activePoint.value >= targetGoal && styles.badgeGoalReached,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            activePoint.value >= targetGoal && styles.badgeTextGoalReached,
                          ]}
                        >
                          {activePoint.value >= targetGoal
                            ? `目標達成! (${Math.round((activePoint.value / targetGoal) * 100)}%)`
                            : `目標比 ${Math.round((activePoint.value / targetGoal) * 100)}%`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {type === 'water' && activePoint.subValue !== undefined && activePoint.subValue > 0 && (
                  <View style={styles.summaryRightContent}>
                    <Text style={styles.summarySubLabel}>
                      {chartMetric === 'amount' ? 'カフェイン' : '水分量'}
                    </Text>
                    <Text style={styles.summarySubVal}>
                      {chartMetric === 'amount' ? `☕ ${activePoint.subValue}mg` : `💧 ${activePoint.subValue}ml`}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* SVG Linear Area Line Chart Canvas */}
            {chartPoints.length > 0 ? (
              <View style={styles.chartWrapper}>
                <ScrollView
                  key={`${chartScale}_${chartMetric}_${selectedFilter}`}
                  ref={chartScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onContentSizeChange={() => chartScrollRef.current?.scrollToEnd({ animated: false })}
                  contentContainerStyle={styles.chartScrollContent}
                >
                  <View style={{ width: svgWidth, height: svgHeight, position: 'relative' }}>
                    <Svg width={svgWidth} height={svgHeight} style={StyleSheet.absoluteFill}>
                      <Defs>
                        <LinearGradient id="lifelogAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor={Theme.colors.primary} stopOpacity={0.35} />
                          <Stop offset="100%" stopColor={Theme.colors.primary} stopOpacity={0.0} />
                        </LinearGradient>
                      </Defs>

                      {/* Goal Line Target Baseline */}
                      {goalY !== null && targetGoal !== null && (
                        <>
                          <Line
                            x1={0}
                            y1={goalY}
                            x2={svgWidth}
                            y2={goalY}
                            stroke={type === 'habit' ? '#55efc4' : Theme.colors.primary}
                            strokeOpacity={0.6}
                            strokeDasharray="4,4"
                            strokeWidth={1.5}
                          />
                          <SvgText
                            x={svgWidth - 10}
                            y={goalY - 6}
                            fill={type === 'habit' ? '#55efc4' : Theme.colors.primary}
                            fontSize={10}
                            fontWeight="600"
                            opacity={0.9}
                            textAnchor="end"
                          >
                            {getGoalLabelText()}
                          </SvgText>
                        </>
                      )}

                      {/* 50% Horizontal Grid Line */}
                      <Line
                        x1={0}
                        y1={svgHeight - paddingBottom - drawHeight * 0.5}
                        x2={svgWidth}
                        y2={svgHeight - paddingBottom - drawHeight * 0.5}
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth={1}
                      />

                      {/* Area Gradient Fill */}
                      {areaPath !== '' && <Path d={areaPath} fill="url(#lifelogAreaGrad)" />}

                      {/* Linear Line Path */}
                      {linearPath !== '' && (
                        <Path
                          d={linearPath}
                          fill="none"
                          stroke={Theme.colors.primary}
                          strokeWidth={3}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Data Points & Active Selection Ring */}
                      {coords.map((c) => {
                        const isSelected = c.idx === activeIndex;
                        const isGoalReached =
                          type === 'water' &&
                          chartMetric === 'amount' &&
                          waterGoal > 0 &&
                          c.point.value >= waterGoal;

                        return (
                          <G key={c.point.id}>
                            {/* Vertical Guide Line on Active Selection */}
                            {isSelected && (
                              <Line
                                x1={c.x}
                                y1={paddingTop - 10}
                                x2={c.x}
                                y2={svgHeight - paddingBottom}
                                stroke={Theme.colors.primary}
                                strokeOpacity={0.35}
                                strokeDasharray="3,3"
                                strokeWidth={1.5}
                              />
                            )}

                            {/* Active Halo Outer Ring */}
                            {isSelected && (
                              <Circle
                                cx={c.x}
                                cy={c.y}
                                r={10}
                                fill="none"
                                stroke={Theme.colors.primary}
                                strokeOpacity={0.4}
                                strokeWidth={2}
                              />
                            )}

                            {/* Point Circle */}
                            <Circle
                              cx={c.x}
                              cy={c.y}
                              r={isSelected ? 5.5 : 4}
                              fill={isGoalReached ? '#00d2ff' : isSelected ? Theme.colors.primary : '#121212'}
                              stroke={isSelected ? '#ffffff' : Theme.colors.primary}
                              strokeWidth={isSelected ? 2 : 2.5}
                            />

                            {/* X-Axis Date Label */}
                            <SvgText
                              x={c.x}
                              y={svgHeight - 10}
                              fill={isSelected ? Theme.colors.primary : Theme.colors.textMuted}
                              fontSize={11}
                              fontWeight={isSelected ? '800' : '600'}
                              textAnchor="middle"
                            >
                              {c.point.label}
                            </SvgText>
                          </G>
                        );
                      })}
                    </Svg>

                    {/* Transparent Touch Layer Area for 100% Reliable Tapping */}
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                      <View style={{ flexDirection: 'row', width: svgWidth, height: svgHeight }}>
                        {coords.map((c) => (
                          <TouchableOpacity
                            key={`touch_${c.point.id}`}
                            style={{ width: pointWidth, height: svgHeight }}
                            activeOpacity={0.7}
                            onPress={() => setSelectedIndex(c.idx)}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyText}>{t('ui.history.empty_state') || 'データがありません'}</Text>
              </View>
            )}

            {/* History List Header */}
            <Text style={styles.listSectionTitle}>
              {t('ui.history.section_history') || '過去の履歴'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <View style={styles.historyCard}>
              <View style={styles.historyCardHeader}>
                <Text style={styles.historyDateText}>{item.dateStr}</Text>
                {type === 'water' && (
                  <Text style={styles.cardTotalText}>
                    {t('ui.history.total_label') || '合計'}: {item.totalAmount}ml / {waterGoal}ml
                    {item.totalCaffeine > 0 ? ` (☕ ${item.totalCaffeine}mg)` : ''}
                  </Text>
                )}
                {type === 'nutrition' && (
                  <Text style={styles.cardTotalText}>
                    {t('ui.history.total_label') || '合計'}: {Math.round(item.totalCalories)}kcal (P:{Math.round(item.totalProtein)}g F:{Math.round(item.totalFat)}g C:{Math.round(item.totalCarbs)}g)
                  </Text>
                )}
                {type === 'time' && (
                  <Text style={styles.cardTotalText}>
                    {t('ui.history.logged_time') || '記録時間'}: {item.totalHours.toFixed(1)}{t('ui.history.unit_hours') || '時間'}
                  </Text>
                )}
                {type === 'habit' && (
                  <Text style={styles.cardTotalText}>{t('ui.history.count_label_unit') || '回数'}: {item.items.length}{t('ui.history.unit_times') || '回'}</Text>
                )}
                {type === 'routine' && (
                  <Text style={styles.cardTotalText}>{t('ui.history.completed_label') || '完了'}: {item.items.length}{t('ui.history.unit_items') || '件'}</Text>
                )}
                {type === 'body' && (
                  <Text style={styles.cardTotalText}>
                    {item.items[0]?.weight ? `体重: ${item.items[0].weight}kg` : ''}
                    {item.items[0]?.body_fat_rate ? ` / 脂肪: ${item.items[0].body_fat_rate}%` : ''}
                  </Text>
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
                  } else if (type === 'nutrition') {
                    const mealTypeLabel = sub.meal_type === 'breakfast' ? '朝食' : sub.meal_type === 'lunch' ? '昼食' : sub.meal_type === 'dinner' ? '夕食' : '間食';
                    return (
                      <View key={sub.id || idx} style={styles.listItemRow}>
                        <Ionicons name="restaurant" size={14} color="#4facfe" style={styles.listIcon} />
                        <Text style={styles.listMainText}>{sub.name} <Text style={{ fontSize: 11, color: Theme.colors.textMuted }}>({mealTypeLabel})</Text></Text>
                        <Text style={styles.listSubText}>P:{sub.protein || 0}g F:{sub.fat || 0}g C:{sub.carbs || 0}g</Text>
                        <Text style={styles.listTimeText}>{sub.calories || 0}kcal</Text>
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
                  } else if (type === 'body') {
                    const log = sub as BodyCompositionLog;
                    const fallbackHeight = bodyLogs.find((b) => b.height && b.height > 0)?.height || null;
                    const mfRes =
                      log.muscle_mass && log.weight && log.body_fat_rate
                        ? calculateMfRatio(log.muscle_mass, log.weight, log.body_fat_rate)
                        : null;
                    const msRes =
                      log.weight && log.body_fat_rate && (log.height || fallbackHeight)
                        ? calculateMachoScore(log.weight, log.body_fat_rate, log.height || fallbackHeight!)
                        : null;

                    return (
                      <View key={log.id || idx} style={styles.bodyHistoryItem}>
                        <View style={styles.bodyGrid}>
                          <Text style={styles.bodyStat}>
                            体重: <Text style={styles.bodyVal}>{log.weight !== null && log.weight !== undefined ? `${log.weight} kg` : '--'}</Text>
                          </Text>
                          <Text style={styles.bodyStat}>
                            体脂肪: <Text style={[styles.bodyVal, { color: '#fb923c' }]}>{log.body_fat_rate !== null && log.body_fat_rate !== undefined ? `${log.body_fat_rate} %` : '--'}</Text>
                          </Text>
                          <Text style={styles.bodyStat}>
                            除脂肪: <Text style={[styles.bodyVal, { color: '#38bdf8' }]}>{log.lbm !== null && log.lbm !== undefined ? `${log.lbm} kg` : '--'}</Text>
                          </Text>
                          <Text style={styles.bodyStat}>
                            骨格筋: <Text style={[styles.bodyVal, { color: '#4ade80' }]}>{log.muscle_mass !== null && log.muscle_mass !== undefined ? `${log.muscle_mass} kg` : '--'}</Text>
                          </Text>
                          {mfRes && (
                            <Text style={styles.bodyStat}>
                              MF比: <Text style={[styles.bodyVal, { color: '#2dd4bf' }]}>{mfRes.mfRatio.toFixed(2)}</Text>
                            </Text>
                          )}
                          {msRes && (
                            <Text style={styles.bodyStat}>
                              MS: <Text style={[styles.bodyVal, { color: msRes.is20Achieved ? '#e879f9' : '#f43f5e' }]}>{msRes.score.toFixed(1)} pt</Text>
                            </Text>
                          )}
                        </View>

                        {(log.neck || log.waist || log.wrist || log.ankle) && (
                          <View style={styles.bodyPartsRow}>
                            {log.neck && <Text style={styles.bodyPartText}>首: {log.neck}cm</Text>}
                            {log.waist && <Text style={styles.bodyPartText}>ウエスト: {log.waist}cm</Text>}
                            {log.wrist && <Text style={styles.bodyPartText}>手首: {log.wrist}cm</Text>}
                            {log.ankle && <Text style={styles.bodyPartText}>足首: {log.ankle}cm</Text>}
                          </View>
                        )}

                        {log.memo && <Text style={styles.bodyMemoText}>💬 {log.memo}</Text>}

                        {log.id && (
                          <View style={styles.bodyDeleteRow}>
                            <TouchableOpacity
                              onPress={() => {
                                Alert.alert('記録の削除', 'この体組成ログを削除してもよろしいですか？', [
                                  { text: 'キャンセル', style: 'cancel' },
                                  {
                                    text: '削除',
                                    style: 'destructive',
                                    onPress: async () => {
                                      if (log.id) {
                                        await deleteBodyLogAction(log.id, log.date);
                                        setBodyLogs((prev) => prev.filter((b) => b.id !== log.id));
                                      }
                                    },
                                  },
                                ]);
                              }}
                              style={styles.bodyDeleteBtn}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash-outline" size={14} color="#ef4444" />
                              <Text style={styles.bodyDeleteText}>削除</Text>
                            </TouchableOpacity>
                          </View>
                        )}
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
      {renderMetricModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Theme.spacing.md, paddingBottom: 100 },
  chartSectionContainer: {
    marginBottom: Theme.spacing.md,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
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
    paddingHorizontal: 10,
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
  metricSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    maxWidth: 160,
  },
  metricSelectBtnText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    maxWidth: 100,
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
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeftContent: {
    flex: 1,
    marginRight: 10,
  },
  summaryDate: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryVal: {
    color: Theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  summaryUnit: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRightContent: {
    alignItems: 'flex-end',
  },
  summarySubLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  summarySubVal: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeGoalReached: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
  },
  badgeText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextGoalReached: {
    color: '#00d2ff',
  },
  chartWrapper: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chartScrollContent: {
    paddingLeft: 10,
    paddingRight: 10,
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
    marginTop: Theme.spacing.xs,
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
    maxWidth: 340,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
  filterOptionText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  filterOptionTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  metricOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricOptionItemActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    borderColor: Theme.colors.primary,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIconBoxActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
  },
  optionTextContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  optionTitleActive: {
    color: Theme.colors.primary,
  },
  optionSub: {
    color: Theme.colors.textMuted,
    fontSize: 11,
  },
  // Body History Card Styles
  bodyHistoryItem: {
    paddingTop: 2,
  },
  bodyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  bodyStat: {
    width: '48%',
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  bodyVal: {
    color: Theme.colors.text,
    fontWeight: 'bold',
  },
  bodyPartsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  bodyPartText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  bodyMemoText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bodyDeleteRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.03)',
    paddingTop: 6,
  },
  bodyDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  bodyDeleteText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
