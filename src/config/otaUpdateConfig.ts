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
  version: '1.1.55', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティン開始前詳細と進捗表示の追加',
    en: 'Routine Detail and Progress Display',
  },
  notes: {
    ja: [
      'ルーティン開始前に、タスク一覧と合計想定時間を表示する詳細エリアを追加しました。',
      'ルーティン開始後に、次のタスク、現在の進捗（現在のタスク/全体）、残りのタスク数と想定合計時間を表示するようにしました。',
    ],
    en: [
      'Added a detail area to show the task list and estimated total time before starting a routine.',
      'Added display for the next task, current progress (current/total), remaining tasks, and remaining estimated time after starting a routine.',
    ]
  }
};
