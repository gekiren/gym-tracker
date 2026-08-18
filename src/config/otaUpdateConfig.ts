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
  version: '1.8.76',
  title: {
    ja: '食事管理画面のレイアウト改善',
    en: 'Nutrition Screen Layout Improvement',
  },
  notes: {
    ja: [
      '最下部のオートファジーカードが見切れないよう、画面下のスクロール余白を改善しました。',
    ],
    en: [
      'Adjusted bottom scroll padding on the nutrition screen so the autophagy card is fully visible.',
    ],
  },
};
