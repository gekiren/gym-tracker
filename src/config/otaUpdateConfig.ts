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
  version: '1.4.5',
  title: {
    ja: 'AIトレーナーのデータ統合 ＆ デバッグ表示機能',
    en: 'AI Coach Data Integration & Debug Preview',
  },
  notes: {
    ja: [
      'ワークアウト中や特定種目からの相談時にも過去のトレーニング履歴を常に合体してAIへ送信するよう改善',
      'ステージング環境にてAIへ実際に送信されたプロンプト（過去履歴・リアルタイム記録）を確認できるデバッグ表示機能を追加',
    ],
    en: [
      'Combined active workout data with past history logs for AI Coach context',
      'Added staging debug preview UI for inspecting compiled AI prompt',
    ],
  },
};
