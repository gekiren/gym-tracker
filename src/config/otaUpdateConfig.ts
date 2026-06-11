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
  version: '1.0.35', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '「すべてのルーティン」画面にて、ルーティン追加「＋」ボタンの配置を画面右下のフローティングボタンからヘッダーの並び替えボタンの横に変更しました。'
    ],
    en: [
      'Moved the add routine button in the "All Routines" screen from the bottom FAB to the header next to the reorder button.'
    ]
  }
};
