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
  version: '1.0.50', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'プロモコード適用時のプレミアム有効期限の計算（月末日のエッジケース）において、日付が正しく計算されるよう改善しました。'
    ],
    en: [
      'Fixed an edge case in promo code expiration calculations on the last day of the month to ensure correct date arithmetic.'
    ]
  }
};
