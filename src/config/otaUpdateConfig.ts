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
  version: '1.1.44', // OTA識別用のバージョン文字列
  title: {
    ja: '日付選択カレンダーの記録日マーク機能',
    en: 'Calendar Date Picker Activity Highlight',
  },
  notes: {
    ja: [
      '日付選択カレンダーにおいて、データが記録されている日を薄い青色でハイライト表示する機能を追加しました。',
      'ダッシュボード、水分補給、24時間管理、習慣カウンター、ルーティン管理の各カレンダーで動作します。',
    ],
    en: [
      'Added visual highlights (blue markers) in the calendar date selector for days with recorded logs.',
      'Works in Dashboard, Water, 24h Activity, Habit Counter, and Routine screens.',
    ]
  }
};
