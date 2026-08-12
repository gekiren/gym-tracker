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
  version: '1.8.17',
  title: {
    ja: '起動時判定および表示最適化',
    en: 'Startup Check & Display Optimization',
  },
  notes: {
    ja: [
      '✨ 過去に表示設定を変更済みのユーザー様で初回選択ポップアップが再表示される現象を修正しました。',
      '💧 水分補給の履歴グラフを筋トレ履歴グラフと同様の美しいSVGグラデーションエリアチャート＆サマリーカードデザインに統一しました。',
    ],
    en: [
      '✨ Fixed an issue where the initial style selection popup re-appeared for users who already had custom display settings.',
      '💧 Updated the Water history chart to match the workout history SVG gradient area chart and summary card design.',
    ],
  },
};

