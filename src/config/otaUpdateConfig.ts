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
  version: '2.3.74',
  title: {
    ja: '🧩 24時間管理：短いピースの✕ボタン操作性＆同時進行時のピース名表示改善',
    en: '🧩 24h Management: Short Piece Delete Button & Overlap Label Improvements',
  },
  notes: {
    ja: [
      '10分などの短いピースでも✕（削除）ボタンが枠のリサイズ判定に吸われず、優先してタップできるように改善しました。',
      '同時進行でピースが横並びになった際、時間が重なっても✕ボタンとピース名が消えずに優先表示されるように調整しました。',
    ],
    en: [
      'Prioritized the delete (✕) button hit area on short timeline pieces (such as 10-minute blocks) so it no longer conflicts with the bottom resize handle.',
      'Updated overlapping side-by-side timeline pieces to hide time text and prioritize displaying the piece name and delete button.',
    ],
  },
};
