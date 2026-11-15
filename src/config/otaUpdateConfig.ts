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
  version: '2.3.47',
  title: {
    ja: '🔧 Googleドライブ認証の同時実行エラー修正',
    en: '🔧 Fix Google Drive Auth Concurrency',
  },
  notes: {
    ja: [
      'Googleドライブ連携中にバックグラウンド同期のトークン取得が衝突する問題（ASYNC_OP_IN_PROGRESS）を修正しました。',
    ],
    en: [
      'Fixed an ASYNC_OP_IN_PROGRESS collision caused by background Drive sync running concurrently during Google Sign-In authorization.',
    ],
  },
};
