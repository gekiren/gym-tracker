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
  version: '2.3.76',
  title: {
    ja: '📅 24時間管理：デフォルト編集の使い勝手を改善',
    en: '📅 24h Manager: Improved Default Schedule Editing',
  },
  notes: {
    ja: [
      'デフォルトスケジュール編集中に戻る際、「保存して戻る」「保存せずに戻る」を選択できるようにしました。',
      'デフォルトスケジュールの編集画面から適用曜日も変更できるようになりました。',
      'スケジュール名称変更・曜日変更のモーダルをアプリデザインに合わせて刷新しました。',
    ],
    en: [
      'Added a confirmation dialog to choose between saving or discarding changes when exiting the default schedule editor.',
      'Added weekday editing directly inside the default schedule editor.',
      'Redesigned the rename and weekday selection modals to match the app\'s dark theme.',
    ],
  },
};
