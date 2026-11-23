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
  version: '2.3.71',
  title: {
    ja: '📅 24時間管理：デフォルトスケジュールの名称変更に対応',
    en: '📅 24h Management: Rename Default Schedules',
  },
  notes: {
    ja: [
      '登録済みのデフォルトスケジュールの名称を後から変更できるようになりました（デフォルトスケジュール設定一覧および専用タイムライン編集画面から変更可能です）。',
    ],
    en: [
      'Added the ability to rename saved default schedules from both the default schedule list and the dedicated timeline editor.',
    ],
  },
};
