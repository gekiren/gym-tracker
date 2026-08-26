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
  version: '2.0.21',
  title: {
    ja: '✨ ルーティン作成・編集画面のモダンUIデザイン刷新',
    en: '✨ Modern UI Redesign for Routine Editor',
  },
  notes: {
    ja: [
      'ルーティン作成・編集画面のUIをTreNoteの洗練されたモダンデザインに合わせて大幅刷新しました（カスタム画像ピッカー、iOS風トグルスイッチ、タスク番号付き2段カード、タスク追加ボタンなど）。',
    ],
    en: [
      'Redesigned the routine editor with a modern dark UI including a custom image picker, iOS-style toggle switches, streamlined task cards, and an enhanced Add Task button.',
    ],
  },
};
