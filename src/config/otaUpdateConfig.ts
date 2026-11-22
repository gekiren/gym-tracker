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
  version: '2.3.56',
  title: {
    ja: '✨ 種目詳細画面のレイアウトと表示状態の記憶を改善',
    en: '✨ Improved Exercise Details Layout & State Memory',
  },
  notes: {
    ja: [
      '初期スタンス・個別インターバル・重量増減ステップ設定の折りたたみ時の高さをコンパクトにしました。',
      '自己ベスト（PR）のスタンス別アコーディオンの開閉状態を記憶し、次回も維持されるようにしました。',
      '種目詳細グラフの種類・期間（日/週/月）・スタンスの最後の選択を保持し、次回も同じ表示で開けるようにしました。',
    ],
    en: [
      'Reduced the collapsed height of Default Stance, Individual Rest Timer, and Weight Step settings for a more compact layout.',
      'Personal Record (PR) stance accordions now remember their expanded/collapsed state across visits.',
      'Exercise charts now remember your last selected metric, period (Day/Week/Month), and stance filter.',
    ],
  },
};
