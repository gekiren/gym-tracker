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
  version: '1.0.8-ota3', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '新機能：ワークアウト完了時に成果を祝う「Congratulation（完了）画面」を実装しました。',
      '継続日数・週数の自動算出および自己ベスト(1RM)・総重量ボリューム更新時の動的実績カード表示を追加しました。',
      'トレーニング完了時に華やかな紙吹雪でお祝いする演出効果（Confetti）を追加しました。',
      '完了画面下部をスクロールすることで、今回の詳細履歴をシームレスに確認できる履歴ビューを統合しました。'
    ],
    en: [
      'New Feature: Implemented a Congratulation (workout completion) screen to celebrate your progress.',
      'Added automatic tracking for training streaks (days/weeks) and dynamic cards highlighting 1RM or Volume achievements.',
      'Added a smooth and vibrant confetti animation celebrating your workout completion.',
      'Integrated a detailed, read-only workout history list at the bottom of the screen.'
    ]
  }
};
