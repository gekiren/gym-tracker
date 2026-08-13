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
  version: '1.8.49',
  title: {
    ja: '習慣カウンターの並び順保存不具合を修正',
    en: 'Fixed Habit Counter Reordering Persistence Bug',
  },
  notes: {
    ja: [
      '習慣管理モーダルで並び替え後にモーダルを閉じると順序が元に戻る不具合を修正しました。',
      '並び替え後の順序が SQLite データベースへ即座かつ永久に保存されるよう改善しました。',
    ],
    en: [
      'Fixed an issue where reordered habits reverted to their original position after closing the management modal.',
      'Ensured reordered item sequence is immediately and permanently persisted to SQLite storage.',
    ],
  },
};
