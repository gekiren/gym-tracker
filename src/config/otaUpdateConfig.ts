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
  version: '1.8.71',
  title: {
    ja: '食事時間選択ピッカーの操作性改善',
    en: 'Improved Meal Time Wheel Interaction',
  },
  notes: {
    ja: [
      '食事時間のドラムロール式タイムピッカーにおいて、上下スワイプの操作性を改善し、軽快に時間・分を調整できるようにしました。',
    ],
    en: [
      'Enhanced the swipe responsiveness and tactile feedback of the meal time picker.',
    ],
  },
};
