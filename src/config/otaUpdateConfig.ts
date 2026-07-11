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
  version: '1.1.43', // OTA識別用のバージョン文字列
  title: {
    ja: 'カレンダー日付選択機能の全ライフログ画面への統合',
    en: 'Unified Calendar Date Picker for All Lifelog Screens',
  },
  notes: {
    ja: [
      '水分補給、24時間管理、習慣カウンター、ルーティン管理の各画面の上部に共通のカレンダー日付ヘッダーを追加しました。',
      'タップでカレンダーを開き、任意の日付へ簡単に移動できます。',
    ],
    en: [
      'Added a unified calendar date switcher to Water, 24h Activity, Habit Counter, and Routine screens.',
      'Tap the date header to quickly jump to any date using the calendar modal.',
    ]
  }
};
