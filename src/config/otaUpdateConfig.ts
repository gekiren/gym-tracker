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
  version: '1.0.8-ota2', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ベーシックプラン（非課金）向けに広告表示機能（Google AdMob）のベース実装を追加しました。',
      'オフライン時や広告読み込み失敗時に、自動的にプレミアム特典紹介のプロモバナーへ切り替わるフォールバック機能を実装しました。',
      '広告読み込み失敗時、またはオフラインから復帰した際に広告を自動再読み込みする処理（30秒間隔の再試行）を追加しました。',
      'プレミアム会員状態の自動判定とデータベース・状態管理の同期処理を最適化しました。'
    ],
    en: [
      'Added base integration for Google AdMob banner ads targeting Basic plan users.',
      'Implemented automatic fallback to a local premium promotional banner if ads fail to load or when offline.',
      'Added automatic ad reload logic (30-second retry loop) when ads fail to load or after restoring connection.',
      'Enhanced automatic verification and synchronization of Premium membership status.'
    ]
  }
};
