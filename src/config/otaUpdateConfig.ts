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
  version: '2.2.8',
  title: {
    ja: '🛡️ データ自動バックアップ＆堅牢化パッチ',
    en: '🛡️ Auto Backup & Data Resilience Patch',
  },
  notes: {
    ja: [
      'バックグラウンド移行時およびデータ保存時の自動バックアップ機構を実装しました。',
      'アプリ操作の軽快さを維持したまま、突然のアプリ終了や端末トラブルによるデータ消失を二重三重に防ぎます。',
    ],
    en: [
      'Implemented automatic background and post-save backup mechanisms.',
      'Prevents accidental data loss from app termination while keeping operation perfectly smooth.',
    ],
  },
};
