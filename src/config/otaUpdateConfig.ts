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
  version: '1.8.24',
  title: {
    ja: 'PFCバランス設定への体重ベース自動決定モード追加',
    en: 'New Weight-Based PFC Auto-Calculation Mode',
  },
  notes: {
    ja: [
      '🥗 PFCバランス設定に「目標カロリー＋P(g)＋体重比F(g)➔C(g)自動算出」モード（初期値: 体重×0.7g）を追加しました。',
      '📊 P, F, C のリアルタイム計算カードにg数・配分カロリー(kcal)・比率(%)を同時表示するように改善しました。',
    ],
    en: [
      '🥗 Added a new calculation mode based on Target Calories, P(g), and Fat(g/kg ratio based on body weight).',
      '📊 Enhanced the real-time PFC card to display grams, calories (kcal), and percentage (%) simultaneously.',
    ],
  },
};

