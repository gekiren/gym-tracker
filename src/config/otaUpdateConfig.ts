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
  version: '1.8.2',
  title: {
    ja: '入力欄デザインの微調整',
    en: 'UI Polish for Workout Input',
  },
  notes: {
    ja: [
      '✨ 筋トレ記録の入力欄の高さをスリムに調整し、画面の視認性を向上させました。',
    ],
    en: [
      '✨ Refined the height of workout set input boxes for a sleeker look and better visibility.',
    ],
  },
};

