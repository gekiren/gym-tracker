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
  version: '2.2.7',
  title: {
    ja: '🛡️ OTA更新直前バックアップ＆データ保護パッチ',
    en: '🛡️ Pre-OTA Mandatory Backup & Safety Patch',
  },
  notes: {
    ja: [
      'アプリアップデート（OTA）適用直前に、全データを最新状態で強制バックアップする安全保護機構を新設しました。',
      'アップデート再起動に伴うデータ消失やロールバックを恒久的に防止します。',
    ],
    en: [
      'Introduced mandatory instant backup mechanism immediately before applying OTA updates.',
      'Permanently prevents data loss and accidental rollback during update reloads.',
    ],
  },
};
