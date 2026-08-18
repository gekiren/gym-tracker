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
  version: '1.8.85',
  title: {
    ja: '📊 体組成の推移グラフ表示・キーボード操作性および限界ゲージの改善',
    en: '📊 Body Composition Charts, Improved Input & Potential Gauge',
  },
  notes: {
    ja: [
      '体組成履歴に折れ線グラフを追加し、体重・体脂肪率・骨格筋量・除脂肪体重の推移を日/週/月/年で可視化できるようにしました。',
      '体組成の入力モーダルおよび画面でキーボード表示時に入力欄が隠れないようスクロール余白を改善しました。',
      '骨格筋の限界到達率ゲージの基準スケールを調整し、目標ラインと現在の進捗をより直感的に確認できるようにしました。',
    ],
    en: [
      'Added line charts to Body History, visualizing Weight, Body Fat %, Skeletal Muscle Mass, and LBM over Day/Week/Month/Year scales.',
      'Improved scroll margins in body measurement input to prevent fields from being obscured by the keyboard.',
      'Refined the skeletal muscle potential gauge scale for more intuitive progress and goal tracking.',
    ],
  },
};
