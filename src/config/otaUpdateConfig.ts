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
  version: '1.8.58',
  title: {
    ja: '食事写真解析およびAIチャットへの手動倍率入力機能の追加',
    en: 'Added custom multiplier input for photo analysis and AI meal chat',
  },
  notes: {
    ja: [
      '食事の写真解析後画面に「自分で倍率入力」ボタンを追加し、任意の倍率（例: 0.8倍、1.3倍）を直接数値入力できるように改善しました。',
      '栄養AIチャット解析後にも倍率調整機能（プリセットボタン＆手動入力ボタン）を追加し、倍率変更に応じた栄養価の再計算・保存に対応しました。',
    ],
    en: [
      'Added a "Custom Input" button after photo meal analysis to allow direct numeric multiplier entry (e.g. 0.8x, 1.3x).',
      'Added portion multiplier controls (presets & custom entry) to AI meal chat with auto-recalculation and updated log saving.',
    ],
  },
};
