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
  version: '1.1.41', // OTA識別用のバージョン文字列
  title: {
    ja: '24時間管理画面の表示調整',
    en: 'Time Management Layout Adjustment',
  },
  notes: {
    ja: [
      '24時間管理画面から「Daily Tracker」のタイトルおよび「新しい活動」のテキスト表示を削除しました。',
    ],
    en: [
      'Removed the "Daily Tracker" title and "New Activity" header text from the 24-hour activity management screen.',
    ]
  }
};
