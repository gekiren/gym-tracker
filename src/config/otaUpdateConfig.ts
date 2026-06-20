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
  version: '1.0.89', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '履歴画面および種目詳細画面の履歴カレンダーの描画パフォーマンスを改善しました（無駄な再計算の防止）。'
    ],
    en: [
      'Improved rendering performance of history calendars on both the history and exercise detail screens by preventing redundant calculations.'
    ]
  }
};
