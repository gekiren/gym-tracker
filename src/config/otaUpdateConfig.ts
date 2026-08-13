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
  version: '1.8.54',
  title: {
    ja: 'メモ入力時の自動最下部スクロール対応',
    en: 'Auto Scroll-to-Bottom on Memo Input Focus',
  },
  notes: {
    ja: [
      '手動入力・編集・写真解析モーダルのメモ入力欄選択時に画面が自動で一番下までスムーズにスクロールする機能を追加しました。',
      'キーボード表示時にもメモ入力と保存アクションが途切れることなく快適に行えるようになりました。',
    ],
    en: [
      'Added automatic smooth scrolling to the bottom when focusing memo input fields.',
      'Ensured seamless typing and saving experience above the software keyboard.',
    ],
  },
};
