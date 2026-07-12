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
  version: '1.1.57', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティン戻る確認ダイアログの改善',
    en: 'Improved Confirmation Dialog when Exiting Routine',
  },
  notes: {
    ja: [
      'ルーティン実行中の戻る確認ダイアログにおける文言を、モードに合わせて「ルーティンの中断」などのルーティン仕様に最適化しました。',
      '「中断せず戻る」を選択すると実行状態が維持され、再度開いたときにタイマーが途中から再開されます。',
      '「中断して戻る」を選択すると実行状態を破棄して戻ります。',
    ],
    en: [
      'Optimized the confirmation dialog text when exiting active routines to match the routine mode.',
      'Choosing "Leave without stopping" will keep the execution state, resuming the timer when reopened.',
      'Choosing "Discard and exit" will discard the routine progress.',
    ]
  }
};
