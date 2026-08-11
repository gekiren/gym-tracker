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
  version: '1.7.3',
  title: {
    ja: '履歴画面レイアウトの最適化（見出し位置の調整）',
    en: 'History Screen Layout Optimization',
  },
  notes: {
    ja: [
      '✨ レイアウト最適化: 「過去のワークアウト記録とMarkdown出力」のテキスト見出しを、グラフカードとワークアウト一覧の間に移動し、画面構成をより分かりやすく調整しました。',
    ],
    en: [
      '✨ Layout Polish: Moved section header between the history chart and workout items for a cleaner flow.',
    ],
  },
};
