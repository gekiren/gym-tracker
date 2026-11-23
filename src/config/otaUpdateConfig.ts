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
  version: '2.3.66',
  title: {
    ja: '🔄 AI連携ガイドの自動更新',
    en: '🔄 Automatic AI agent guide refresh',
  },
  notes: {
    ja: [
      'Googleドライブ上の AI_AGENT_GUIDE.md が古い場合、次回のアップロード時に最新版（体組成の書き込み仕様を含む）へ自動で更新されるようになりました。',
      'ai_agent_proposals.json は、未処理の提案を保護するため上書きしません。',
    ],
    en: [
      'AI_AGENT_GUIDE.md on Google Drive is now refreshed automatically on the next upload when outdated (including the body composition write schema).',
      'ai_agent_proposals.json is never overwritten, to protect pending proposals.',
    ],
  },
};
