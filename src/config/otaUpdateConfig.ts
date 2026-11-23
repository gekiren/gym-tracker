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
  version: '2.3.63',
  title: {
    ja: '⚖️ GoogleドライブAI連携からの体組成書き込みに対応',
    en: '⚖️ Added AI Body Composition Writing via Google Drive Sync',
  },
  notes: {
    ja: [
      'Googleドライブ AI双方向同期（ai_agent_proposals.json）を通じて、AIエージェントから体重・体脂肪率・筋肉量・身体サイズ等の体組成記録を書き込めるようになりました。',
      '体重・体脂肪率の更新時にLBM（除脂肪体重）が未指定の場合は自動計算し、AI連携ガイド（AI_AGENT_GUIDE.md）にも体組成の書き込み仕様を追加しました。',
    ],
    en: [
      'External AI agents can now write body composition logs (weight, body fat, muscle mass, LBM, and body measurements) through Google Drive two-way sync (ai_agent_proposals.json).',
      'Automatically recalculates LBM when omitted alongside weight/body fat updates, and updated AI_AGENT_GUIDE.md with the bodyComposition schema.',
    ],
  },
};
