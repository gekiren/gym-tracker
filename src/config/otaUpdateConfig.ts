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
  version: '1.0.25', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウト履歴およびエクスポート用Markdownへのスタンス（Stance）情報記録・反映の追加（スタンス専用列の分離配置）',
      'ワークアウト履歴詳細画面へのスタンス表示の追加',
      '既存のスタンス（バリエーション）データの自動移行（マイグレーション）処理の実装',
      'CSVインポート機能、ルーティン機能との互換性向上'
    ],
    en: [
      'Added support for stance information in workout history and Markdown exports (separated Stance column)',
      'Added stance display to the workout history details screen',
      'Implemented automatic migration of existing stance (variation) data',
      'Enhanced compatibility with CSV import and Routine features'
    ]
  }
};
