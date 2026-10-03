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
  version: '2.3.7',
  title: {
    ja: '📅 24時間管理：デフォルトスケジュール機能の追加',
    en: '📅 24h Timeline: Default Schedule System Added',
  },
  notes: {
    ja: [
      '曜日指定および全日共通の「デフォルトスケジュール」を登録・自動展開できる機能を追加しました。',
      '予定が未登録の日付に、曜日指定スケジュールを最優先（未指定の曜日は共通デフォルト）で自動スケジュールします。',
      'タイムラインヘッダーからいつでもワンタップで再適用・登録・編集・管理が可能です。',
    ],
    en: [
      'Added Default Schedule feature supporting day-specific and daily common routines.',
      'Automatically schedules empty days with priority on day-specific routines and daily fallback.',
      'Quickly apply, create, edit, or manage schedules directly from the timeline header.',
    ],
  },
};
