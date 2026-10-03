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
  version: '2.3.0',
  title: {
    ja: '🧩 24時間ピースはめ込みタイムライン導入',
    en: '🧩 24h Piece Puzzle Timeline Introduced',
  },
  notes: {
    ja: [
      '24時間管理に「ピースはめ込みバーチカルタイムラインUI」を導入しました。',
      '大(15分)/中(5分)/小(1分)スナップピースで、パズルのように時間をはめ込んで直感的に予定・実績を記録できます。',
      '本体ドラッグで開始時刻の移動、下端ドラッグで長さの伸縮が可能です。',
      'SNS・動画・ダラダラなどの浪費時間も客観データとしてワンタップで記録できるようになりました。',
    ],
    en: [
      'Introduced Piece Puzzle Vertical Timeline for 24h Life Log.',
      'Snap pieces with Large (15m), Medium (5m), Small (1m) & Drift pieces directly on the timeline.',
      'Drag blocks to move time and drag bottom handles to resize duration.',
      'Track drift time (SNS, videos) objectively with single-tap fills.',
    ],
  },
};
