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
  version: '2.3.62',
  title: {
    ja: '💧 水分補給の日付ズレ・記録消失の不具合を修正',
    en: '💧 Fixed Hydration Date Shift & Sync Reset Issues',
  },
  notes: {
    ja: [
      '早朝（0:00〜8:59）に記録した水分補給が前日扱いになってしまう日付取得の不具合を修正しました。',
      'アプリを立ち上げたまま日付をまたいだ際、自動で当日の日付へ切り替わるように改善しました。',
      'ウィジェットからの起動や連続タップ時に本日の水分記録が消えてしまう同期不具合を修正し、1件ずつの安全な保存方式へ刷新しました。',
    ],
    en: [
      'Fixed a UTC date bug where early-morning hydration logs (00:00–08:59 local time) were saved under the previous day.',
      'Automatically advances the active date to today when resuming the app after midnight.',
      'Replaced full-table hydration rewrites with safe incremental add/delete syncing to prevent today\'s logs from being overwritten or lost.',
    ],
  },
};
