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
  version: '2.3.27',
  title: {
    ja: '🔧 Obsidian連携のフォルダ重複（連番生成）バグ修正',
    en: '🔧 Fix Obsidian Folder Duplicate / Numbering Issue',
  },
  notes: {
    ja: [
      'Android SAFのURI仕様および大文字小文字判定の最適化により、一括出力や自動同期時に「TreNote (1)」等の重複連番フォルダが勝手に作成される問題を解消しました。',
      '既存のTreNote/Trenoteフォルダを正確に認識して再利用するように改善しました。',
    ],
    en: [
      'Fixed an issue where duplicate folders like "TreNote (1)" were generated during Obsidian export due to SAF URI parsing and case-sensitivity.',
      'Improved existing folder detection to correctly reuse the TreNote folder.',
    ],
  },
};
