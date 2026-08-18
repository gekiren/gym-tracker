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
  version: '1.8.80',
  title: {
    ja: '🧬 体組成＆筋肥大限界モデル機能の追加',
    en: '🧬 Body Composition & Muscular Potential Feature',
  },
  notes: {
    ja: [
      '新機能「体組成＆筋肥大限界」を追加しました。Google Health Connectからの体重・体脂肪率同期に対応。',
      '米海軍式（US Navy Method）による体脂肪率・LBMの自動推定計算を搭載。',
      'ケーシー・バット博士モデルによる骨格筋肥大限界およびポテンシャル診断（到達率%）に対応。',
    ],
    en: [
      'Added Body Composition & Muscular Potential feature with Health Connect sync.',
      'Integrated US Navy Method for body fat & LBM circumference estimation.',
      'Integrated Dr. Casey Butt formula for maximum natural muscular potential tracking.',
    ],
  },
};
