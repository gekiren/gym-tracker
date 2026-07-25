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
  version: '1.1.71', // OTA識別用のバージョン文字列
  title: {
    ja: 'Obsidian Vault ファイル同期バグの修正',
    en: 'Fixed Obsidian Vault File Match & Export Issue',
  },
  notes: {
    ja: [
      'Obsidian への自動連携機能において、Vault 内の既存ノート名の完全一致検索ロジックを修正し、水分補給量・時間管理・習慣が正しいノートファイルへ確実に書き込まれるよう不具合を完全解消しました。',
    ],
    en: [
      'Fixed an exact filename matching issue in Obsidian Vault export, ensuring hydration, time logs, and habits are accurately updated in the correct daily and workout notes.',
    ]
  }
};



