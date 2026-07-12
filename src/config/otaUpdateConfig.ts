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
  version: '1.1.61', // OTA識別用のバージョン文字列
  title: {
    ja: '24時間管理の機能改善（タグ並び替え機能の追加）',
    en: '24-hour Lifelog Enhanced (Tag Sorting)',
  },
  notes: {
    ja: [
      '24時間管理（時間管理）のタグ編集画面において、タグの並び替え機能を追加しました。',
      'タグの右側にある矢印ボタン（▲/▼）を使って、表示順序を自由に整理できます。',
    ],
    en: [
      'Added a tag sorting feature to the 24-hour lifelog (Time Management) tag editor.',
      'You can now reorder your tags using the arrow buttons (▲/▼) on the edit screen.',
    ]
  }
};
