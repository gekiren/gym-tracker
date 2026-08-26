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
  version: '2.0.19',
  title: {
    ja: '🎯 習慣履歴グラフで目標破線ライン＆達成度を表示',
    en: '🎯 Display Target Dashed Line in Habit History Chart',
  },
  notes: {
    ja: [
      '習慣カウンターの履歴画面（折れ線グラフ）に目標破線ラインと目標達成度バッジが表示されるようになりました。',
    ],
    en: [
      'Added a dashed target line and goal achievement badges to the habit counter history line chart.',
    ],
  },
};
