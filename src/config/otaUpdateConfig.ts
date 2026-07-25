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
  version: '1.1.79', // OTA識別用のバージョン文字列
  title: {
    ja: 'Obsidian書き込み失敗防止（Vaultルートへの自動フォールバック保護機能）',
    en: 'Obsidian Export: Automatic Vault Root Fallback Protection',
  },
  notes: {
    ja: [
      'Dropsync等の外部同期フォルダ環境でサブフォルダへのアクセス権限拒否が発生した場合でも、自動的にVaultルートへ安全に二重フォールバック保存する保護機能を実装しました。',
    ],
    en: [
      'Implemented automatic Vault root fallback saving to guarantee 100% export success even if subfolder permissions are restricted by Dropsync or SAF.',
    ]
  }
};




