import { create } from 'zustand';
import {
  MealLog,
  MealFavorite,
  NutritionGoals,
  AutophagyConfig,
  getMealLogsByDate,
  getAllMealLogs,
  addMealLog,
  updateMealLog,
  deleteMealLog,
  getFavorites,
  addFavorite,
  updateFavorite,
  updateFavoriteOrders,
  deleteFavorite,
  getNutritionGoals,
  saveNutritionGoals,
  getAutophagyConfig,
  saveAutophagyConfig,
  saveSetting,
} from '../db/database';
import { useSettingsStore } from './settingsStore';

// ─── 型定義 ────────────────────────────────────────────

interface NutritionState {
  mealLogs: MealLog[];
  allHistoryLogs: MealLog[];
  favorites: MealFavorite[];
  selectedDate: string;
  userNutritionGoals: NutritionGoals;
  autophagyConfig: AutophagyConfig;
  isLoading: boolean;

  // Actions
  loadMealLogs: (date: string) => Promise<void>;
  loadAllHistory: () => Promise<void>;
  addMeal: (log: Omit<MealLog, 'id'>) => Promise<void>;
  updateMeal: (id: number, log: Partial<Omit<MealLog, 'id'>>) => Promise<void>;
  removeMealPhoto: (id: number) => Promise<void>;
  deleteMeal: (id: number) => Promise<void>;
  loadFavorites: () => Promise<void>;
  addFavoriteFromLog: (fav: Omit<MealFavorite, 'id'>) => Promise<void>;
  addNewFavorite: (fav: Omit<MealFavorite, 'id'>) => Promise<void>;
  updateFavoriteItem: (id: number, fav: Partial<Omit<MealFavorite, 'id'>>) => Promise<void>;
  updateFavoritesOrder: (orders: { id: number; sort_order: number }[]) => Promise<void>;
  deleteFavoriteById: (id: number) => Promise<void>;
  loadGoals: () => Promise<void>;
  saveGoals: (goals: NutritionGoals) => Promise<void>;
  loadAutophagyConfig: () => Promise<void>;
  updateAutophagyConfig: (config: AutophagyConfig) => Promise<void>;
  setSelectedDate: (date: string) => void;
  resetAll: () => void;
}

// ─── デフォルト値 ───────────────────────────────────────

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 60,
  fat: 55,
  carbs: 250,
  sodium: 7.5,
  fiber: 20,
  gender: 'male',
  age: 30,
  height: 170,
  weight: 65,
  activity_level: 'moderate',
  goal_type: 'maintain',
  ai_url: 'https://chatgpt.com',
};

const DEFAULT_AUTOPHAGY: AutophagyConfig = {
  enabled: true,
  target_hours: 16,
  start_time: undefined,
  notified: false,
  auto_sync_with_last_meal: true,
};

// ─── ストア定義 ─────────────────────────────────────────

export const useNutritionStore = create<NutritionState>((set, get) => ({
  mealLogs: [],
  allHistoryLogs: [],
  favorites: [],
  selectedDate: '',
  userNutritionGoals: DEFAULT_GOALS,
  autophagyConfig: DEFAULT_AUTOPHAGY,
  isLoading: false,

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
  },

  loadMealLogs: async (date: string) => {
    try {
      set({ isLoading: true });
      const logs = await getMealLogsByDate(date);
      set({ mealLogs: logs, selectedDate: date });
    } catch (e) {
      console.warn('useNutritionStore: loadMealLogs failed', e);
    } finally {
      set({ isLoading: false });
    }
  },

  loadAllHistory: async () => {
    try {
      const logs = await getAllMealLogs();
      set({ allHistoryLogs: logs });
    } catch (e) {
      console.warn('useNutritionStore: loadAllHistory failed', e);
    }
  },

  addMeal: async (log: Omit<MealLog, 'id'>) => {
    try {
      await addMealLog(log);
      // リロードは現在の selectedDate のログのみ
      const date = get().selectedDate;
      if (date) {
        const logs = await getMealLogsByDate(date);
        set({ mealLogs: logs });
      }
    } catch (e) {
      console.warn('useNutritionStore: addMeal failed', e);
    }
  },

  updateMeal: async (id: number, log: Partial<Omit<MealLog, 'id'>>) => {
    try {
      await updateMealLog(id, log);
      const date = get().selectedDate;
      if (date) {
        const logs = await getMealLogsByDate(date);
        set({ mealLogs: logs });
      }
      const allLogs = await getAllMealLogs();
      set({ allHistoryLogs: allLogs });
    } catch (e) {
      console.warn('useNutritionStore: updateMeal failed', e);
    }
  },

  removeMealPhoto: async (id: number) => {
    try {
      await updateMealLog(id, { photo_url: null });
      const date = get().selectedDate;
      if (date) {
        const logs = await getMealLogsByDate(date);
        set({ mealLogs: logs });
      }
      const allLogs = await getAllMealLogs();
      set({ allHistoryLogs: allLogs });
    } catch (e) {
      console.warn('useNutritionStore: removeMealPhoto failed', e);
    }
  },

  deleteMeal: async (id: number) => {
    try {
      await deleteMealLog(id);
      const date = get().selectedDate;
      if (date) {
        const logs = await getMealLogsByDate(date);
        set({ mealLogs: logs });
      }
    } catch (e) {
      console.warn('useNutritionStore: deleteMeal failed', e);
    }
  },

  loadFavorites: async () => {
    try {
      const favs = await getFavorites();
      set({ favorites: favs });
    } catch (e) {
      console.warn('useNutritionStore: loadFavorites failed', e);
    }
  },

  addFavoriteFromLog: async (fav: Omit<MealFavorite, 'id'>) => {
    try {
      const currentFavs = get().favorites;
      const nextSortOrder = currentFavs.length > 0
        ? Math.max(...currentFavs.map(f => f.sort_order ?? 0)) + 1
        : 0;
      await addFavorite({ ...fav, sort_order: nextSortOrder });
      const favs = await getFavorites();
      set({ favorites: favs });
    } catch (e) {
      console.warn('useNutritionStore: addFavoriteFromLog failed', e);
    }
  },

  addNewFavorite: async (fav: Omit<MealFavorite, 'id'>) => {
    try {
      const currentFavs = get().favorites;
      const nextSortOrder = currentFavs.length > 0
        ? Math.max(...currentFavs.map(f => f.sort_order ?? 0)) + 1
        : 0;
      await addFavorite({ ...fav, sort_order: fav.sort_order ?? nextSortOrder });
      const favs = await getFavorites();
      set({ favorites: favs });
    } catch (e) {
      console.warn('useNutritionStore: addNewFavorite failed', e);
    }
  },

  updateFavoriteItem: async (id: number, fav: Partial<Omit<MealFavorite, 'id'>>) => {
    try {
      await updateFavorite(id, fav);
      const favs = await getFavorites();
      set({ favorites: favs });
    } catch (e) {
      console.warn('useNutritionStore: updateFavoriteItem failed', e);
    }
  },

  updateFavoritesOrder: async (orders: { id: number; sort_order: number }[]) => {
    try {
      // ローカル状態を先行して更新
      const currentFavs = [...get().favorites];
      const orderMap = new Map(orders.map(o => [o.id, o.sort_order]));
      currentFavs.sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? a.sort_order ?? 0;
        const orderB = orderMap.get(b.id) ?? b.sort_order ?? 0;
        return orderA - orderB;
      });
      set({ favorites: currentFavs });

      await updateFavoriteOrders(orders);
      const favs = await getFavorites();
      set({ favorites: favs });
    } catch (e) {
      console.warn('useNutritionStore: updateFavoritesOrder failed', e);
    }
  },

  deleteFavoriteById: async (id: number) => {
    try {
      await deleteFavorite(id);
      const favs = await getFavorites();
      set({ favorites: favs });
    } catch (e) {
      console.warn('useNutritionStore: deleteFavoriteById failed', e);
    }
  },

  loadGoals: async () => {
    try {
      const goals = await getNutritionGoals();
      set({ userNutritionGoals: goals });

      const goalsWeight = goals.weight ?? 65;
      const currentSettingBw = useSettingsStore.getState().settings.bodyWeight;
      if (currentSettingBw !== null && currentSettingBw !== goalsWeight && currentSettingBw > 0) {
        const updatedGoals = { ...goals, weight: currentSettingBw };
        await saveNutritionGoals(updatedGoals);
        set({ userNutritionGoals: updatedGoals });
      } else if ((currentSettingBw === null || currentSettingBw === 0) && goalsWeight > 0) {
        useSettingsStore.getState().setBodyWeight(goalsWeight);
        await saveSetting('body_weight', goalsWeight.toString());
      }
    } catch (e) {
      console.warn('useNutritionStore: loadGoals failed', e);
    }
  },

  saveGoals: async (goals: NutritionGoals) => {
    try {
      await saveNutritionGoals(goals);
      set({ userNutritionGoals: goals });

      // 同時に settingsStore の bodyWeight も同期
      if (typeof goals.weight === 'number' && !isNaN(goals.weight)) {
        const currentSettingBw = useSettingsStore.getState().settings.bodyWeight;
        if (currentSettingBw !== goals.weight) {
          useSettingsStore.getState().setBodyWeight(goals.weight);
          await saveSetting('body_weight', goals.weight.toString());
        }
      }
    } catch (e) {
      console.warn('useNutritionStore: saveGoals failed', e);
    }
  },

  loadAutophagyConfig: async () => {
    try {
      const config = await getAutophagyConfig();
      set({ autophagyConfig: config });
    } catch (e) {
      console.warn('useNutritionStore: loadAutophagyConfig failed', e);
    }
  },

  updateAutophagyConfig: async (config: AutophagyConfig) => {
    try {
      await saveAutophagyConfig(config);
      set({ autophagyConfig: config });
    } catch (e) {
      console.warn('useNutritionStore: updateAutophagyConfig failed', e);
    }
  },

  resetAll: () => {
    set({
      mealLogs: [],
      allHistoryLogs: [],
      favorites: [],
      selectedDate: '',
      userNutritionGoals: DEFAULT_GOALS,
      autophagyConfig: DEFAULT_AUTOPHAGY,
      isLoading: false,
    });
  },
}));
