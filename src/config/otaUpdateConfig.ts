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
  version: '1.4.4',
  title: {
    ja: 'AIトレーナーの種目データ・ベンチプレス認識改善',
    en: 'AI Coach Exercise Recognition Fix',
  },
  notes: {
    ja: [
      'ベンチプレス等の種目について「データがない」と回答される不具合を根本修正',
      'AIトレーナーへ種目名（日本語・英語）および入力中のセット数値を確実に伝達するよう改善',
    ],
    en: [
      'Fixed bug where AI Coach responded "no data available" for exercises like bench press',
      'Improved exercise name translation and active set value parsing for AI Coach',
    ],
  },
};
