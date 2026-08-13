import { create } from 'zustand';
import { saveSetting } from '../db/database';
import { computeIsPremium } from '../utils/subscriptionUtils';

export interface ApplicationSettings {
  defaultRest: number;
  autoRest: boolean;
  timerVibrate: boolean;
  weightUnit: 'kg' | 'lbs';
  needsUnitSelection: boolean;
  needsStyleSelection: boolean;
  customStances: string[];
  bodyWeight: number | null;
  aiTokensBalance: number;
  premiumUntil: string;
  isEarlyAdopter: boolean;
  isPremium: boolean;
  displayFields: {
    showRpe: boolean;
    show1RM: boolean;
    showVolume: boolean;
    showStance: boolean;
  };
  crashConsent: 'agreed' | 'declined' | 'unset';
  keepAwake: boolean;
  alwaysOneSet: boolean;
  preferredAiModel: 'gemini' | 'deepseek';
  aiChatMode: 'quick' | 'thinking';
  enableAiDebugContext: boolean;
  backgroundTheme: 'dark' | 'pureBlack';
}

export interface LoadSettingsPayload {
  defaultRest: number;
  autoRest: boolean;
  timerVibrate: boolean;
  weightUnit: 'kg' | 'lbs';
  needsUnitSelection?: boolean;
  bodyWeight?: number | null;
  needsStyleSelection?: boolean;
  aiTokensBalance?: number;
  crashConsent?: 'agreed' | 'declined' | 'unset';
  premiumUntil?: string;
  isEarlyAdopter?: boolean;
  keepAwake?: boolean;
  alwaysOneSet?: boolean;
  preferredAiModel?: 'gemini' | 'deepseek';
  aiChatMode?: 'quick' | 'thinking';
  enableAiDebugContext?: boolean;
  backgroundTheme?: 'dark' | 'pureBlack';
}

export interface SettingsState {
  settings: ApplicationSettings;
  loadSettings: (payload: LoadSettingsPayload) => void;
  setKeepAwake: (keepAwake: boolean) => void;
  setAlwaysOneSet: (alwaysOneSet: boolean) => void;
  setBackgroundTheme: (theme: 'dark' | 'pureBlack') => void;
  setPreferredAiModel: (model: 'gemini' | 'deepseek') => void;
  setAiChatMode: (mode: 'quick' | 'thinking') => void;
  setEnableAiDebugContext: (enabled: boolean) => void;
  setPremiumUntil: (premiumUntil: string) => void;
  updatePremiumStatus: (premiumUntil: string) => void;
  setIsEarlyAdopter: (isEarly: boolean) => void;
  setBodyWeight: (weight: number | null) => void;
  setAITokensBalance: (balance: number) => void;
  loadCustomStances: (stances: string[]) => void;
  addCustomStance: (stance: string) => void;
  removeCustomStance: (stance: string) => void;
  setDisplayFields: (fields: Partial<{ showRpe: boolean; show1RM: boolean; showVolume: boolean; showStance: boolean }>) => void;
  setCrashConsent: (consent: 'agreed' | 'declined' | 'unset') => void;
  resetSettings: () => void;
}

export const initialSettings: ApplicationSettings = {
  defaultRest: 90,
  autoRest: true,
  timerVibrate: true,
  weightUnit: 'kg',
  needsUnitSelection: false,
  needsStyleSelection: false,
  customStances: [],
  bodyWeight: null,
  aiTokensBalance: 20,
  premiumUntil: '',
  isEarlyAdopter: false,
  isPremium: false,
  displayFields: {
    showRpe: true,
    show1RM: true,
    showVolume: true,
    showStance: true,
  },
  crashConsent: 'unset',
  keepAwake: true,
  alwaysOneSet: false,
  preferredAiModel: 'gemini',
  aiChatMode: 'quick',
  enableAiDebugContext: true,
  backgroundTheme: 'dark',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: initialSettings,

  loadSettings: (payload: LoadSettingsPayload) => set((state) => {
    const {
      defaultRest,
      autoRest,
      timerVibrate,
      weightUnit,
      needsUnitSelection,
      bodyWeight,
      needsStyleSelection,
      aiTokensBalance,
      crashConsent,
      premiumUntil,
      isEarlyAdopter,
      keepAwake,
      alwaysOneSet,
      preferredAiModel,
      aiChatMode,
      enableAiDebugContext,
      backgroundTheme
    } = payload;
    const finalNeedsUnitSelection = needsUnitSelection !== undefined ? needsUnitSelection : state.settings.needsUnitSelection;
    const finalBodyWeight = bodyWeight !== undefined ? bodyWeight : state.settings.bodyWeight;
    const finalNeedsStyleSelection = needsStyleSelection !== undefined ? needsStyleSelection : state.settings.needsStyleSelection;
    const finalAiTokensBalance = aiTokensBalance !== undefined ? aiTokensBalance : state.settings.aiTokensBalance;
    const finalCrashConsent = crashConsent !== undefined ? crashConsent : state.settings.crashConsent;
    const finalPremiumUntil = premiumUntil !== undefined ? premiumUntil : state.settings.premiumUntil;
    const finalIsEarlyAdopter = isEarlyAdopter !== undefined ? isEarlyAdopter : state.settings.isEarlyAdopter;
    const finalKeepAwake = keepAwake !== undefined ? keepAwake : state.settings.keepAwake;
    const finalAlwaysOneSet = alwaysOneSet !== undefined ? alwaysOneSet : state.settings.alwaysOneSet;
    const finalPreferredAiModel = preferredAiModel !== undefined ? preferredAiModel : state.settings.preferredAiModel;
    const finalAiChatMode = aiChatMode !== undefined ? aiChatMode : state.settings.aiChatMode;
    const finalEnableAiDebugContext = enableAiDebugContext !== undefined ? enableAiDebugContext : state.settings.enableAiDebugContext;
    const finalBackgroundTheme = backgroundTheme !== undefined ? backgroundTheme : state.settings.backgroundTheme;

    const isPremium = computeIsPremium(finalPremiumUntil, finalIsEarlyAdopter);
    return {
      settings: {
        ...state.settings,
        defaultRest,
        autoRest,
        timerVibrate,
        weightUnit,
        needsUnitSelection: finalNeedsUnitSelection,
        bodyWeight: finalBodyWeight,
        needsStyleSelection: finalNeedsStyleSelection,
        aiTokensBalance: finalAiTokensBalance,
        crashConsent: finalCrashConsent,
        premiumUntil: finalPremiumUntil,
        isEarlyAdopter: finalIsEarlyAdopter,
        isPremium,
        keepAwake: finalKeepAwake,
        alwaysOneSet: finalAlwaysOneSet,
        preferredAiModel: finalPreferredAiModel,
        aiChatMode: finalAiChatMode,
        backgroundTheme: finalBackgroundTheme
      }
    };
  }),

  setBackgroundTheme: (theme: 'dark' | 'pureBlack') => {
    saveSetting('background_theme', theme).catch(e => console.warn('Failed to save background_theme setting', e));
    set((state) => ({
      settings: { ...state.settings, backgroundTheme: theme }
    }));
  },

  setPreferredAiModel: (model: 'gemini' | 'deepseek') => {
    saveSetting('preferred_ai_model', model).catch(e => console.warn('Failed to save preferred_ai_model setting', e));
    set((state) => ({
      settings: { ...state.settings, preferredAiModel: model }
    }));
  },

  setAiChatMode: (mode: 'quick' | 'thinking') => {
    saveSetting('ai_chat_mode', mode).catch(e => console.warn('Failed to save ai_chat_mode setting', e));
    set((state) => ({
      settings: { ...state.settings, aiChatMode: mode }
    }));
  },

  setEnableAiDebugContext: (enabled: boolean) => {
    saveSetting('enable_ai_debug_context', enabled ? 'true' : 'false').catch(e => console.warn('Failed to save enable_ai_debug_context setting', e));
    set((state) => ({
      settings: { ...state.settings, enableAiDebugContext: enabled }
    }));
  },

  setPremiumUntil: (premiumUntil) => set((state) => {
    const isPremium = computeIsPremium(premiumUntil, state.settings.isEarlyAdopter);
    return {
      settings: { ...state.settings, premiumUntil, isPremium }
    };
  }),

  updatePremiumStatus: (premiumUntil) => set((state) => {
    const isPremium = computeIsPremium(premiumUntil, state.settings.isEarlyAdopter);
    return {
      settings: { ...state.settings, premiumUntil, aiTokensBalance: 20, isPremium }
    };
  }),

  setIsEarlyAdopter: (isEarlyAdopter) => set((state) => {
    const isPremium = computeIsPremium(state.settings.premiumUntil, isEarlyAdopter);
    return {
      settings: { ...state.settings, isEarlyAdopter, isPremium }
    };
  }),

  setBodyWeight: (weight: number | null) => set((state) => ({
    settings: { ...state.settings, bodyWeight: weight }
  })),

  setAITokensBalance: (balance: number) => set((state) => ({
    settings: { ...state.settings, aiTokensBalance: balance }
  })),

  loadCustomStances: (stances: string[]) => set((state) => ({
    settings: { ...state.settings, customStances: stances }
  })),

  addCustomStance: (stance: string) => set((state) => ({
    settings: { ...state.settings, customStances: Array.from(new Set([...state.settings.customStances, stance])) }
  })),

  removeCustomStance: (stance: string) => set((state) => ({
    settings: { ...state.settings, customStances: state.settings.customStances.filter(s => s !== stance) }
  })),

  setDisplayFields: (fields) => set((state) => ({
    settings: {
      ...state.settings,
      displayFields: { ...state.settings.displayFields, ...fields }
    }
  })),

  setCrashConsent: (crashConsent) => set((state) => ({
    settings: { ...state.settings, crashConsent }
  })),

  setKeepAwake: (keepAwake) => set((state) => ({
    settings: { ...state.settings, keepAwake }
  })),

  setAlwaysOneSet: (alwaysOneSet) => set((state) => ({
    settings: { ...state.settings, alwaysOneSet }
  })),

  resetSettings: () => set({
    settings: {
      ...initialSettings,
      needsUnitSelection: true,
      needsStyleSelection: true,
    }
  }),
}));
