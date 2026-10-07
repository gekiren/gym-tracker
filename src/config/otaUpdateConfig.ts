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
  version: '2.3.23',
  title: {
    ja: '⏱️ ２４時間管理：デフォルトスケジュールの専用作成・編集機能',
    en: '⏱️ 24h Timeline: Dedicated Default Schedule Editor',
  },
  notes: {
    ja: [
      'デフォルトスケジュール（平日ルーティン・休日等）を、現在の日付の予定に依存せず、専用のタイムラインエディターで直接新規作成・再編集できるように刷新しました。登録済みスケジュールの「予定を編集」からいつでも微調整が可能です。',
    ],
    en: [
      'Revamped default schedule creation to allow building and editing routines directly on a dedicated timeline editor, independent of daily plans. You can also re-edit existing schedules anytime.',
    ],
  },
};

