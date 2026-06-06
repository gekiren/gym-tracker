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
  version: '1.0.8-ota9', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウト記録画面の「重量」「回数」「RPE」ヘッダーの表示位置を、入力欄の中央と完全に揃えて視認性を改善しました。',
      '完了チェックボックス列のヘッダーに「記録」ラベルを追加しました。',
      'ベーシックプランにおいて、完了画面表示1秒後に全画面広告を表示する機能を追加しました。広告を最後まで視聴した場合は次の1〜2回のワークアウト完了時に広告が非表示になる特典を獲得できます。',
      '広告読み込みエラー検知デバッグ機能の追加とAdMobネイティブ設定の最適化を行いました。',
      'アーリーアダプター向けバナー非表示の適用、デベロッパー向け広告テスト機能の追加を行いました。',
      'ワークアウト完了時の広告ロードタイミングの競合（レースコンディション）の修正を行いました。',
      '広告開始前への特典予告画面（1.5秒間）の追加を行いました。',
      '広告スキップ時の非表示枠獲得確率の調整（0回: 70%, 1回: 20%, 2回: 10%）を行いました。'
    ],
    en: [
      'Aligned the layout of table headers (Weight, Reps, RPE) to match the input fields in the active workout screen.',
      'Added a "Log" label above the set complete checkboxes in the active workout screen.',
      'Implemented an ad-free reward system: watching ads to completion on the basic plan grants 1-2 ad-free workouts.',
      'Added ad load error detection diagnostics and optimized AdMob native configuration setup.',
      'Applied banner ad visibility restrictions for Early Adopters and added ad testing utilities in the developer menu.',
      'Fixed a race condition during ad loading on the workout completion screen.',
      'Added a 1.5-second ad watch reward preview overlay before the ad starts.',
      'Adjusted the ad skip raffle probabilities (0 skips: 70%, 1 skip: 20%, 2 skips: 10%).'
    ]
  }
};
