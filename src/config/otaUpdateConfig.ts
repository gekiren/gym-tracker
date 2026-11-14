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
  version: '2.3.43',
  title: {
    ja: '🎨 テーマ動的追従の最終クリーンアップ',
    en: '🎨 Final Dynamic Theme Cleanup',
  },
  notes: {
    ja: [
      'ワークアウト入力（スワイプ数値入力）・シェアカード・プロフィールメニューのテーマ参照を動的テーマへ統一し、全画面のテーマ移行を完了しました。',
    ],
    en: [
      'Completed dynamic theme migration across swipeable workout inputs, share cards, and profile menu items.',
    ],
  },
};
