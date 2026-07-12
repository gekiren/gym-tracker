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
  version: '1.1.58', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティンの並び替え機能の追加',
    en: 'Routine Sorting Feature Added',
  },
  notes: {
    ja: [
      'ルーティン管理の管理メニュー内に「▲」および「▼」ボタンを追加し、ルーティンの表示順序を入れ替えることができるようになりました。',
      '並び替えた順序は即座に反映され、ホーム画面でのルーティン選択リストにも適用されます。',
    ],
    en: [
      'Added "▲" and "▼" buttons in the Routine Management screen to sort the display order of routines.',
      'The sorted order is instantly saved and applied to the routine selection list on the home screen.',
    ]
  }
};
