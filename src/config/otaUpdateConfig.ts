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
  version: '2.0.17',
  title: {
    ja: '📊 習慣カウンターの推移グラフで目標値を表示',
    en: '📊 Display Target Values in Habit Counter Trend Chart',
  },
  notes: {
    ja: [
      '推移グラフに目標ライン（破線）と目標バッジを表示し、各日の達成状況（✓マーク・達成カラー）がひと目でわかるようになりました。',
    ],
    en: [
      'Added a dashed target line and target badge to the trend chart, allowing instant visualization of daily goal achievements.',
    ],
  },
};
