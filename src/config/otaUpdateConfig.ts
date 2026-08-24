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
  version: '1.8.104',
  title: {
    ja: '🥗 栄養管理のクイックお気に入り追加機能の改善',
    en: '🥗 Improved Quick Favorite Meal Logging',
  },
  notes: {
    ja: [
      'クイックお気に入りから記録する際、追加した現在時刻（朝食・昼食・間食・夕食）に合わせて適切な食事区分で正しく記録されるように修正しました。',
    ],
    en: [
      'Fixed an issue where meals added from quick favorites were not assigned to the current meal category (breakfast/lunch/snack/dinner) based on the time of addition.',
    ],
  },
};
