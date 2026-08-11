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
  version: '1.7.4',
  title: {
    ja: '履歴画面のレイアウト・操作性向上',
    en: 'History Screen Layout & Usability Polish',
  },
  notes: {
    ja: [
      '✨ タブ配置最適化: 「ワークアウト」と「種目」タブを50%:50%で中央均等配置し、操作性を高めました。',
      '✨ カレンダーボタン統合: グラフ単日要約パネルの右側にカレンダーボタンを配置し、記録の確認とカレンダーアクセスをスムーズにしました。',
    ],
    en: [
      '✨ Tab Layout Polish: Centered "Workouts" and "Exercises" tabs evenly across the header.',
      '✨ Integrated Calendar Button: Placed the calendar button directly inside the daily summary card for smooth access.',
    ],
  },
};
