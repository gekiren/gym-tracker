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
  version: '2.3.48',
  title: {
    ja: '📂 Googleドライブ フォルダ直接選択機能を追加',
    en: '📂 Google Drive Folder Picker Added',
  },
  notes: {
    ja: [
      '同期フォルダ名を直接入力する代わりに、Googleドライブ（マイドライブ）から既存フォルダの階層移動・選択および新規作成ができるフォルダピッカーを追加しました。',
      '外部AIが新規作成した ai_agent_proposals.json も読み込めるよう Google Drive スコープを拡張しました。',
    ],
    en: [
      'Added an interactive Google Drive folder picker modal so you can browse, select, or create folders directly in My Drive instead of typing folder names manually.',
      'Expanded Google Drive scope support so ai_agent_proposals.json created by external AI agents can also be read and updated.',
    ],
  },
};
