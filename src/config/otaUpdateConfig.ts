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
  version: '1.0.23', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '開発者メニューにおけるアップデート確認の安定性を向上させました。',
      '内部ビルド時のチャンネル認識および署名プロセスの最適化を行いました。'
    ],
    en: [
      'Improved the stability of update checks in the developer menu.',
      'Optimized channel recognition and signing processes for internal builds.'
    ]
  }
};
