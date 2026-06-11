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
  version: '1.0.28', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'すべての重量入力欄で、一部端末や欧州地域等のカンマ（,）キーでの小数入力をサポート',
      '入力中に小数点（ピリオド/カンマ）が勝手に消えてしまう問題、および3桁入力時の入力不整合バグを修正'
    ],
    en: [
      'Supported comma (,) decimal inputs on europe/custom keyboards in all weight fields',
      'Fixed issues where decimals or digits were stripped during active text typing'
    ]
  }
};
