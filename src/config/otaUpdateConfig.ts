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
  version: '1.8.15',
  title: {
    ja: '水分補給画面の全幅デザイン統一',
    en: 'Water Intake Full-Width Layout Update',
  },
  notes: {
    ja: [
      '💧 水分補給画面のレイアウトをダッシュボード画面と統一し、横幅全体を使った角丸なしのフラットなデザインに変更しました。',
    ],
    en: [
      '💧 Updated the Water Intake screen layout to be full-width without rounded cards, matching the Dashboard screen style.',
    ],
  },
};

