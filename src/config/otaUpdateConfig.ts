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
  version: '1.0.86', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'AIコーチが混雑している際に、分かりやすい日本語で案内を表示するよう改善しました。',
      '接続エラー時の内部処理およびサーバー側の接続安定性を向上させました。'
    ],
    en: [
      'Improved error messaging when the AI Coach is busy.',
      'Enhanced internal error handling and connection stability on the server side.'
    ]
  }
};
