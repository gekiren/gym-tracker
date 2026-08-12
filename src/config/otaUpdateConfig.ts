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
  version: '1.8.3',
  title: {
    ja: '入力欄デザインの再スリム化',
    en: 'UI Polish for Workout Input',
  },
  notes: {
    ja: [
      '✨ 筋トレ記録の入力欄の高さをさらにスリム（28px）に調整し、画面の視認性を向上させました。',
    ],
    en: [
      '✨ Further refined the height of workout set input boxes (28px) for a sleeker look.',
    ],
  },
};

