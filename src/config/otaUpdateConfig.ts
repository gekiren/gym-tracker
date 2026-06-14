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
  version: '1.0.52', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'プロモーションコード機能のクリーンアップ（クライアント側の未使用設定値の整理）を行いました。'
    ],
    en: [
      'Cleaned up the promotion code feature (removed unused configuration values from the client-side).'
    ]
  }
};
