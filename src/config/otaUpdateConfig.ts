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
  version: '1.0.96', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'プレミアムプラン紹介ページの多言語表示（日本語・英語）および現地通貨価格の動的取得に対応しました。'
    ],
    en: [
      'Added support for multilingual display (Japanese/English) and dynamic fetching of local prices on the Premium Plan introduction page.'
    ]
  }
};
