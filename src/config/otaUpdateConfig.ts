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
  version: '1.0.54', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '巨大コンポーネントを再利用可能なサブコンポーネントへ分割し、アプリの描画パフォーマンスとコードの可読性を大幅に向上させました。'
    ],
    en: [
      'Split large monolithic components into reusable subcomponents to significantly improve rendering performance and code readability.'
    ]
  }
};
