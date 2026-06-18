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
  version: '1.0.79', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ID生成ロジックをネイティブ依存のない安全なピュアJavaScript実装へ変更しました。'
    ],
    en: [
      'Updated unique ID generator to a Pure-JS implementation to ensure compatibility.'
    ]
  }
};
