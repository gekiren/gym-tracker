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
  version: '1.1.17', // OTA識別用のバージョン文字列
  title: {
    ja: '水分補給画面の日付選択・同期機能',
    en: 'Date Selection and Sync on Water Intake Screen',
  },
  notes: {
    ja: [
      'ダッシュボードの日付変更が水分補給画面にも自動で反映されるようになりました。',
      '水分補給画面の上部で日付（前日・翌日・今日に戻る）を変更できるようになり、ダッシュボードにもその日付が同期されます。',
    ],
    en: [
      'Date changes on the dashboard now automatically sync with the water intake screen.',
      'Added a date selector header on the water intake screen to switch dates, which also syncs back to the dashboard.',
    ]
  }
};
