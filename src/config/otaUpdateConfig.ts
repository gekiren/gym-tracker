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
  version: '1.8.14',
  title: {
    ja: '水分補給画面のレイアウト・デザイン改善',
    en: 'Water Intake Screen Layout & Design Improvements',
  },
  notes: {
    ja: [
      '💧 水分補給画面にて、カードの重なり不具合を解消し、より見やすく洗練されたデザインへ改善しました。',
    ],
    en: [
      '💧 Fixed layout overlapping issues on the Water Intake screen for a cleaner, refined design.',
    ],
  },
};

