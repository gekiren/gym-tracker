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
  version: '1.8.70',
  title: {
    ja: '食事記録の時間選択UIの改善',
    en: 'Improved Meal Time Picker',
  },
  notes: {
    ja: [
      '食事記録（手動入力、写真記録、チャット記録、編集）において、食事時間を直感的に選択できるドラムロール式タイムピッカーを追加しました。',
    ],
    en: [
      'Added a wheel-based time picker to meal record modals (Manual, Photo, Chat, Edit) for intuitive meal time adjustment.',
    ],
  },
};
