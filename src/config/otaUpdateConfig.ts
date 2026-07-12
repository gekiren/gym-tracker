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
  version: '1.1.60', // OTA識別用のバージョン文字列
  title: {
    ja: '習慣管理メニューの機能改善（非表示対応）',
    en: 'Habit Management Enhanced (Show/Hide)',
  },
  notes: {
    ja: [
      '習慣の管理メニューに「表示・非表示」の切り替え機能を追加しました。',
      '使用しない習慣項目を一時的に非表示（アーカイブ）にし、過去の統計データを維持したままメイン画面をスッキリ整理できます。',
    ],
    en: [
      'Added a "Show/Hide" toggle feature to the habit management menu.',
      'You can now hide unused habit items to keep your main dashboard clean, while preserving past statistical logs.',
    ]
  }
};
