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
  version: '1.0.30', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウト画面の重量（kg/lbs）入力欄で確定キー（次へ）を押した際、自動的に同セットの「回数（Reps）」へフォーカスが移動する機能を追加',
      '回数（Reps）入力欄で確定キー（完了）を押した際、キーボードを自動で閉じる挙動を追加'
    ],
    en: [
      'Added keyboard focus auto-transition from Weight to Reps input on the workout screen',
      'Added auto-dismiss keyboard on completing Reps input'
    ]
  }
};
