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
  version: '2.3.46',
  title: {
    ja: '🔧 Googleドライブ連携の認証修正',
    en: '🔧 Google Drive Auth Fix',
  },
  notes: {
    ja: [
      'Googleドライブ連携時のトークン取得エラー（[getTokens] the name must not be empty: null）を修正し、不完全なアカウントキャッシュを自動リカバリするよう改善しました。',
    ],
    en: [
      'Fixed the [getTokens] the name must not be empty: null error during Google Drive connection by automatically recovering incomplete cached Google Sign-In sessions.',
    ],
  },
};
