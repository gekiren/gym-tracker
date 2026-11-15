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
  version: '2.3.49',
  title: {
    ja: '📝 指定フォルダへのAI指示MD保存に対応',
    en: '📝 Save AI Guide MD to Selected Folder',
  },
  notes: {
    ja: [
      'Googleドライブの指定フォルダへエージェント連携用指示ファイル（AI_AGENT_GUIDE.md）を直接保存・更新できるようになりました。',
    ],
    en: [
      'Added automatic and manual saving of AI_AGENT_GUIDE.md directly into your selected Google Drive sync folder.',
    ],
  },
};
