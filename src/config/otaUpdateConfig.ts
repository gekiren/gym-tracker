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
  version: '1.0.48', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウトおよび種目の Swipe 削除動作における React Hooks 規則違反を修正し、リスト操作時のクラッシュリスクを解消しました。',
      'ワークアウト保存の完了処理に二重タップ防止ガードを導入し、連打による重複保存や画面フリーズを防止しました。'
    ],
    en: [
      'Fixed React Hooks rule violations in list swipe actions (crash prevention).',
      'Implemented a double-tap guard during workout saving to prevent duplicate entries and screen freezes.'
    ]
  }
};
