export interface OTAUpdateConfig {
  version: string;
  title: {
    ja: string;
    en: string;
  };
  notes: {
    ja: string[];
    en: string[];
  };
}

export const CURRENT_OTA_CONFIG: OTAUpdateConfig = {
  version: '1.8.89',
  title: {
    ja: '🥗 食事記録時の食事区分自動判定機能の追加',
    en: '🥗 Auto-Selected Meal Types Based on Current Time',
  },
  notes: {
    ja: [
      '食事の追加・記録時に、現在時刻に基づいて朝食・昼食・間食・夕食が自動的に初期選択されるようになりました。',
    ],
    en: [
      'Meal types (Breakfast, Lunch, Snack, Dinner) are now automatically pre-selected based on the current time when logging meals.',
    ],
  },
};
