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
  version: '1.1.56', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティン実行中の戻る確認ダイアログの追加',
    en: 'Confirmation Dialog when exiting Active Routine',
  },
  notes: {
    ja: [
      'ルーティン実行中に戻るボタン（←）やデバイスの戻るボタンを押した際、誤タップによる中断を防ぐ確認ダイアログを追加しました。',
      '「中断せず戻る」を選択すると実行状態が維持され、再度開いたときにタイマーが途中から再開されます。',
      '「中断して戻る」を選択すると実行状態を破棄して戻ります。',
    ],
    en: [
      'Added a confirmation dialog when pressing the back button during routine execution to prevent accidental exits.',
      'Choosing "Leave without stopping" will keep the execution state, resuming the timer when reopened.',
      'Choosing "Discard and exit" will discard the routine progress.',
    ]
  }
};
