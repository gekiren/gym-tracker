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
  version: '1.0.46', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'プライバシーポリシーを更新し、AdMob広告の配信に関する記載を追加しました。',
      'Sentry の接続情報（DSN）を環境変数から読み込むように変更し、セキュリティを向上させました。'
    ],
    en: [
      'Updated the privacy policy to include AdMob advertisement delivery details.',
      'Configured Sentry DSN to load from environment variables for enhanced security.'
    ]
  }
};
