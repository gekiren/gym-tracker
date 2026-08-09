import { create } from 'zustand';
import {
  WaterLog,
  TimeLog,
  HabitItem,
  HabitLog,
  getWaterLogs,
  addWaterLog,
  deleteWaterLog,
  getWaterGoal,
  setWaterGoal,
  getCaffeineLimit,
  setCaffeineLimit,
  getTimeLogs,
  addTimeLog,
  deleteTimeLog,
  updateTimeLog,
  getHabitItems,
  addHabitItem,
  deleteHabitItem,
  updateHabitItem,
  getHabitLogs,
  addHabitLog,
  deleteHabitLog,
  deleteLastHabitLog,
  getSettingValue,
} from '../db/database';

export interface HabitSummaryItem {
  id: number;
  name: string;
  color: string;
  count: number;
}

export interface WaterSummary {
  amount: number;
  goal: number;
  progress: number;
  percentage: number;
  caffeine: number;
  caffeineLimit: number;
}

export interface TimeSummaryItem {
  name: string;
  hours: number;
  minutes: number;
}

export interface DaySummary {
  habits: HabitSummaryItem[];
  water: WaterSummary;
  zikan: TimeSummaryItem[];
  totalZikanMinutes: number;
  routinesCount: number;
  routinesCompletedToday: number;
  completedRoutineNames?: string[];
  dateStr: string;
}

interface LifelogState {
  currentDate: string;
  waterLogs: WaterLog[];
  waterGoal: number;
  caffeineLimit: number;
  waterPresets: Array<{ amount: number; caffeine: number }>;
  timeLogs: TimeLog[];
  habitItems: HabitItem[];
  habitLogs: HabitLog[];
  routineData: any[];
  daySummary: DaySummary | null;
  isLoading: boolean;

  // Actions
  setCurrentDate: (date: string) => Promise<void>;
  
  // Water actions
  loadWaterData: (date: string) => Promise<void>;
  addWater: (amount: number, date: string, caffeine?: number) => Promise<void>;
  deleteWater: (id: number, date: string) => Promise<void>;
  updateWaterGoal: (goal: number) => Promise<void>;
  updateCaffeineLimit: (limit: number) => Promise<void>;

  // Time actions
  loadTimeData: (date: string) => Promise<void>;
  addTime: (
    activityName: string,
    startTime: string,
    endTime: string,
    date: string,
    durationMinutes: number
  ) => Promise<void>;
  deleteTime: (id: number, date: string) => Promise<void>;
  updateTime: (
    id: number,
    activityName: string,
    startTime: string,
    endTime: string,
    date: string,
    durationMinutes: number
  ) => Promise<void>;

  // Habit actions
  loadHabits: (date: string) => Promise<void>;
  loadHabitItems: () => Promise<void>;
  addHabitItem: (name: string, color: string) => Promise<void>;
  updateHabitItem: (id: number, name: string, color: string) => Promise<void>;
  deleteHabitItem: (id: number) => Promise<void>;
  addHabitLog: (habitItemId: number, date: string) => Promise<void>;
  deleteHabitLog: (id: number, date: string) => Promise<void>;
  deleteLastHabitLog: (habitItemId: number, date: string) => Promise<void>;

  // Routine actions
  loadRoutineData: () => Promise<void>;

  // Active Routine State for tracking execution
  activeRoutineState: {
    isExecuting: boolean;
    currentRoutine: any;
    currentTaskIndex: number;
    taskStartTime: number;
    taskLogs: any[];
  } | null;
  setActiveRoutineState: (state: any) => void;
  clearActiveRoutineState: () => void;

  // Helper to trigger summary recalculation
  refreshSummary: (date: string) => void;

  // Reset all state for database reset
  resetAll: () => void;
}

// Helper function to calculate summary from state
export const calculateSummary = (
  dateStr: string,
  waterLogs: WaterLog[],
  waterGoal: number,
  caffeineLimit: number,
  timeLogs: TimeLog[],
  habitItems: HabitItem[],
  habitLogs: HabitLog[],
  routineData: any[] = []
): DaySummary => {
  // 1. Water summary
  const todayWaterAmount = waterLogs.reduce((sum, log) => sum + log.amount, 0);
  const todayCaffeineAmount = waterLogs.reduce((sum, log) => sum + (log.caffeine || 0), 0);
  const waterProgress = waterGoal > 0 ? todayWaterAmount / waterGoal : 0;
  const water: WaterSummary = {
    amount: todayWaterAmount,
    goal: waterGoal,
    progress: Math.min(1, waterProgress),
    percentage: Math.round(waterProgress * 100),
    caffeine: todayCaffeineAmount,
    caffeineLimit: caffeineLimit,
  };

  // 2. Time summary
  const activityDuration: Record<string, number> = {};
  timeLogs.forEach((log) => {
    activityDuration[log.activity_name] =
      (activityDuration[log.activity_name] || 0) + log.duration_minutes;
  });

  const zikan: TimeSummaryItem[] = Object.entries(activityDuration)
    .map(([name, mins]) => ({
      name,
      hours: parseFloat((mins / 60).toFixed(1)),
      minutes: Math.round(mins),
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const totalZikanMinutes = zikan.reduce((sum, item) => sum + item.minutes, 0);

  // 3. Habits summary
  const habitCounts: Record<number, number> = {};
  habitLogs.forEach((log) => {
    habitCounts[log.habit_item_id] = (habitCounts[log.habit_item_id] || 0) + 1;
  });

  const habits: HabitSummaryItem[] = habitItems.map((item) => ({
    id: item.id,
    name: item.name,
    color: item.color,
    count: habitCounts[item.id] || 0,
  }));

  // 4. Routines summary
  let routinesCompletedToday = 0;
  const completedRoutineNames: string[] = [];
  const formatDateFromTimestamp = (ts: number): string => {
    const date = new Date(ts);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  if (Array.isArray(routineData)) {
    routineData.forEach((r) => {
      if (r.hidden) return; // Skip hidden routines
      if (r.history && Array.isArray(r.history)) {
        const completedToday = r.history.some(
          (h: any) => formatDateFromTimestamp(h.timestamp) === dateStr
        );
        if (completedToday) {
          routinesCompletedToday++;
          if (r.name) {
            completedRoutineNames.push(r.name);
          }
        }
      }
    });
  }

  return {
    habits,
    water,
    zikan,
    totalZikanMinutes,
    routinesCount: Array.isArray(routineData) ? routineData.filter((r: any) => !r.hidden).length : 0,
    routinesCompletedToday,
    completedRoutineNames,
    dateStr,
  };
};

export const useLifelogStore = create<LifelogState>((set, get) => ({
  currentDate: '',
  waterLogs: [],
  waterGoal: 2000,
  caffeineLimit: 400,
  waterPresets: [
    { amount: 150, caffeine: 0 },
    { amount: 250, caffeine: 0 },
    { amount: 500, caffeine: 0 },
    { amount: 150, caffeine: 80 },
    { amount: 350, caffeine: 40 },
    { amount: 250, caffeine: 100 }
  ],
  timeLogs: [],
  habitItems: [],
  habitLogs: [],
  routineData: [],
  daySummary: null,
  isLoading: false,
  activeRoutineState: null,

  setCurrentDate: async (date: string) => {
    set({ currentDate: date, isLoading: true });
    try {
      const [waterLogs, waterGoal, caffeineLimit, timeLogs, habitItems, habitLogs, routineVal, waterSettingsVal] = await Promise.all([
        getWaterLogs(date),
        getWaterGoal(),
        getCaffeineLimit(),
        getTimeLogs(date),
        getHabitItems(),
        getHabitLogs(date),
        getSettingValue('routine_tracker_data'),
        getSettingValue('hydration_settings_v1'),
      ]);

      const routineData = routineVal ? JSON.parse(routineVal) : [];

      // Parse water presets
      let waterPresets = [
        { amount: 150, caffeine: 0 },
        { amount: 250, caffeine: 0 },
        { amount: 500, caffeine: 0 },
        { amount: 150, caffeine: 80 },
        { amount: 350, caffeine: 40 },
        { amount: 250, caffeine: 100 }
      ];
      if (waterSettingsVal) {
        try {
          const parsed = JSON.parse(waterSettingsVal);
          let parsedPresets = parsed.presets || [];
          if (parsedPresets.length > 0 && typeof parsedPresets[0] === 'number') {
            parsedPresets = parsedPresets.map((val: number) => ({ amount: val, caffeine: 0 }));
          }
          while (parsedPresets.length < 6) {
            const idx = parsedPresets.length;
            parsedPresets.push(waterPresets[idx] || { amount: 200, caffeine: 0 });
          }
          waterPresets = parsedPresets.slice(0, 6);
        } catch (e) {
          console.warn('Failed to parse hydration settings in setCurrentDate:', e);
        }
      }

      const daySummary = calculateSummary(
        date,
        waterLogs,
        waterGoal,
        caffeineLimit,
        timeLogs,
        habitItems,
        habitLogs,
        routineData
      );

      set({
        waterLogs,
        waterGoal,
        caffeineLimit,
        waterPresets,
        timeLogs,
        habitItems,
        habitLogs,
        routineData,
        daySummary,
      });
    } catch (e) {
      console.warn('Failed to load lifelog data for date:', date, e);
    } finally {
      set({ isLoading: false });
    }
  },

  loadWaterData: async (date: string) => {
    try {
      const [waterLogs, waterGoal, caffeineLimit, waterSettingsVal] = await Promise.all([
        getWaterLogs(date),
        getWaterGoal(),
        getCaffeineLimit(),
        getSettingValue('hydration_settings_v1'),
      ]);

      let waterPresets = get().waterPresets;
      if (waterSettingsVal) {
        try {
          const parsed = JSON.parse(waterSettingsVal);
          let parsedPresets = parsed.presets || [];
          if (parsedPresets.length > 0 && typeof parsedPresets[0] === 'number') {
            parsedPresets = parsedPresets.map((val: number) => ({ amount: val, caffeine: 0 }));
          }
          while (parsedPresets.length < 6) {
            const idx = parsedPresets.length;
            parsedPresets.push({ amount: 200, caffeine: 0 });
          }
          waterPresets = parsedPresets.slice(0, 6);
        } catch (e) {
          console.warn('Failed to parse hydration settings in loadWaterData:', e);
        }
      }

      set({ waterLogs, waterGoal, caffeineLimit, waterPresets });
      if (get().currentDate === date) {
        get().refreshSummary(date);
      }
    } catch (e) {
      console.warn('Failed to load water data:', e);
    }
  },

  addWater: async (amount: number, date: string, caffeine?: number) => {
    try {
      await addWaterLog(amount, Date.now(), date, caffeine);
      await get().loadWaterData(date);
    } catch (e) {
      console.warn('Failed to add water log:', e);
    }
  },

  deleteWater: async (id: number, date: string) => {
    try {
      await deleteWaterLog(id);
      await get().loadWaterData(date);
    } catch (e) {
      console.warn('Failed to delete water log:', e);
    }
  },

  updateWaterGoal: async (goal: number) => {
    try {
      await setWaterGoal(goal);
      set({ waterGoal: goal });
      if (get().currentDate) {
        get().refreshSummary(get().currentDate);
      }
    } catch (e) {
      console.warn('Failed to update water goal:', e);
    }
  },

  updateCaffeineLimit: async (limit: number) => {
    try {
      await setCaffeineLimit(limit);
      set({ caffeineLimit: limit });
      if (get().currentDate) {
        get().refreshSummary(get().currentDate);
      }
    } catch (e) {
      console.warn('Failed to update caffeine limit:', e);
    }
  },

  loadTimeData: async (date: string) => {
    try {
      const timeLogs = await getTimeLogs(date);
      set({ timeLogs });
      if (get().currentDate === date) {
        get().refreshSummary(date);
      }
    } catch (e) {
      console.warn('Failed to load time logs:', e);
    }
  },

  addTime: async (
    activityName: string,
    startTime: string,
    endTime: string,
    date: string,
    durationMinutes: number
  ) => {
    try {
      await addTimeLog(activityName, startTime, endTime, date, durationMinutes);
      await get().loadTimeData(date);
    } catch (e) {
      console.warn('Failed to add time log:', e);
    }
  },

  deleteTime: async (id: number, date: string) => {
    try {
      await deleteTimeLog(id);
      await get().loadTimeData(date);
    } catch (e) {
      console.warn('Failed to delete time log:', e);
    }
  },

  updateTime: async (
    id: number,
    activityName: string,
    startTime: string,
    endTime: string,
    date: string,
    durationMinutes: number
  ) => {
    try {
      await updateTimeLog(id, activityName, startTime, endTime, date, durationMinutes);
      await get().loadTimeData(date);
    } catch (e) {
      console.warn('Failed to update time log:', e);
    }
  },

  loadHabits: async (date: string) => {
    try {
      const [habitItems, habitLogs] = await Promise.all([
        getHabitItems(),
        getHabitLogs(date),
      ]);
      set({ habitItems, habitLogs });
      if (get().currentDate === date) {
        get().refreshSummary(date);
      }
    } catch (e) {
      console.warn('Failed to load habits:', e);
    }
  },

  loadHabitItems: async () => {
    try {
      const habitItems = await getHabitItems();
      set({ habitItems });
      if (get().currentDate) {
        get().refreshSummary(get().currentDate);
      }
    } catch (e) {
      console.warn('Failed to load habit items:', e);
    }
  },

  addHabitItem: async (name: string, color: string) => {
    try {
      await addHabitItem(name, color);
      await get().loadHabitItems();
    } catch (e) {
      console.warn('Failed to add habit item:', e);
    }
  },

  updateHabitItem: async (id: number, name: string, color: string) => {
    try {
      await updateHabitItem(id, name, color);
      await get().loadHabitItems();
    } catch (e) {
      console.warn('Failed to update habit item:', e);
    }
  },

  deleteHabitItem: async (id: number) => {
    try {
      await deleteHabitItem(id);
      await get().loadHabitItems();
    } catch (e) {
      console.warn('Failed to delete habit item:', e);
    }
  },

  addHabitLog: async (habitItemId: number, date: string) => {
    try {
      await addHabitLog(habitItemId, Date.now(), date);
      await get().loadHabits(date);
    } catch (e) {
      console.warn('Failed to add habit log:', e);
    }
  },

  deleteHabitLog: async (id: number, date: string) => {
    try {
      await deleteHabitLog(id);
      await get().loadHabits(date);
    } catch (e) {
      console.warn('Failed to delete habit log:', e);
    }
  },

  deleteLastHabitLog: async (habitItemId: number, date: string) => {
    try {
      await deleteLastHabitLog(habitItemId, date);
      await get().loadHabits(date);
    } catch (e) {
      console.warn('Failed to delete last habit log:', e);
    }
  },

  loadRoutineData: async () => {
    try {
      const value = await getSettingValue('routine_tracker_data');
      const routineData = value ? JSON.parse(value) : [];
      set({ routineData });
      if (get().currentDate) {
        get().refreshSummary(get().currentDate);
      }
    } catch (e) {
      console.warn('Failed to load routine data:', e);
    }
  },

  refreshSummary: (date: string) => {
    const { waterLogs, waterGoal, caffeineLimit, timeLogs, habitItems, habitLogs, routineData } = get();
    const daySummary = calculateSummary(
      date,
      waterLogs,
      waterGoal,
      caffeineLimit,
      timeLogs,
      habitItems,
      habitLogs,
      routineData
    );
    set({ daySummary });
  },

  setActiveRoutineState: (state: any) => {
    set({ activeRoutineState: state });
  },
  clearActiveRoutineState: () => {
    set({ activeRoutineState: null });
  },

  resetAll: () => {
    set({
      waterLogs: [],
      waterGoal: 2000,
      caffeineLimit: 400,
      waterPresets: [],
      timeLogs: [],
      habitItems: [],
      habitLogs: [],
      routineData: [],
      daySummary: null,
      activeRoutineState: null,
    });
  },
}));
