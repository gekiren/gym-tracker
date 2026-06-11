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
  version: '1.0.29', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'RM計算機の入力欄タップ時に、桁数変化によって文字が勝手に全選択され、3桁以上の重量が入力できなくなるバグを修正',
      '一部端末や欧州地域等のカンマ（,）キーでの小数入力をサポート'
    ],
    en: [
      'Fixed a bug in RM calculator where inputting digits caused automatic text selection, preventing 3-digit inputs',
      'Supported comma (,) decimal inputs on europe/custom keyboards in all weight fields'
    ]
  }
};
