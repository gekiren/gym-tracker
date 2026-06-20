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
  version: '1.0.88', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '巨大な画面コンポーネントを分割し、コードの保守性と読み込み速度を改善しました。'
    ],
    en: [
      'Refactored large monolithic screen components into modular subcomponents for better maintainability and performance.'
    ]
  }
};
