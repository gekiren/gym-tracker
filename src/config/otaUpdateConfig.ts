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
  version: '1.1.46', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティンタスクの自動遷移機能の追加',
    en: 'Routine Auto-Advance Task Feature Added',
  },
  notes: {
    ja: [
      'ルーティン内のタスク時間経過後に、自動で次のタスクへ遷移する機能を追加しました。',
      '本機能はルーティンの作成・編集画面で個別に有効・無効を設定できます（デフォルトはOFF）。',
    ],
    en: [
      'Added auto-advance feature when a task timer runs out in a routine.',
      'This can be enabled or disabled per routine in the creation/edit screen (default is OFF).',
    ]
  }
};
