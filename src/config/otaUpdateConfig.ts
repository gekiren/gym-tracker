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
  version: '1.1.42', // OTA識別用のバージョン文字列
  title: {
    ja: 'ダッシュボード日付選択カレンダー機能の追加',
    en: 'Dashboard Date Selector Calendar',
  },
  notes: {
    ja: [
      'ダッシュボードの日付表示部分をタップすることで、カレンダーから直接日付を選択できるようになりました。',
    ],
    en: [
      'You can now select dates directly from a calendar by tapping the date header on the Dashboard.',
    ]
  }
};
