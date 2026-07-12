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
  version: '1.1.59', // OTA識別用のバージョン文字列
  title: {
    ja: '習慣カウンター管理機能の追加',
    en: 'Habit Counter Management Added',
  },
  notes: {
    ja: [
      '習慣カウンター画面に「⚙️管理」ボタンを追加し、習慣項目の一覧管理ができるようになりました。',
      '管理画面では、項目の並べ替え（▲▼ボタン）、名前のインライン編集、カラーの変更、および項目の削除が可能です。',
    ],
    en: [
      'Added a "⚙️ Manage" button to the Habit Counter screen for comprehensive habit item management.',
      'In the management screen, you can reorder items (using ▲▼), edit names inline, change colors, and delete items.',
    ]
  }
};
