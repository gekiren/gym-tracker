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
  version: '2.2.6',
  title: {
    ja: '🍱 9月13日食事記録（1800kcal）の網羅的復元パッチ',
    en: '🍱 Full Forensic Meal Recovery Patch (Sep 13)',
  },
  notes: {
    ja: [
      '9月13日の全食事記録（朝食・昼食・夕食・間食等）を全バックアップから網羅的に救出・復元しました。',
      '栄養管理およびカレンダー同期を最新化しました。',
    ],
    en: [
      'Forensically scanned all backups and restored all meal records for September 13th.',
      'Updated nutrition dashboard and calendar synchronization.',
    ],
  },
};
