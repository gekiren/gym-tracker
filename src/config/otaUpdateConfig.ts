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
  version: '2.2.20',
  title: {
    ja: '⏱️ 種目別の個別休憩時間設定に対応',
    en: '⏱️ Exercise-Specific Rest Timers',
  },
  notes: {
    ja: [
      '種目詳細画面から、種目ごとに個別の休憩時間を設定できるようになりました。',
      '「筋トレ・タイマー・環境設定」に「種目別の個別休憩時間」スイッチを追加しました。有効にすると種目ごとの設定時間が優先適用されます。',
    ],
    en: [
      'You can now configure custom rest intervals for each exercise on the Exercise Details screen.',
      'Added an "Exercise-Specific Rest Timers" toggle in Workout Settings. When enabled, custom exercise rest times take priority.',
    ],
  },
};
