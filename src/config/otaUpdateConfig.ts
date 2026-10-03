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
  version: '2.3.12',
  title: {
    ja: '🧩 24時間管理：ピース選択パレットのメニュー化',
    en: '🧩 24h Timeline: Compact Piece Menu',
  },
  notes: {
    ja: [
      'ピース選択パレットの常時表示を廃止し、スリムな選択バーとメニューシートから選ぶスマートなUIに刷新しました。',
      '画面の縦スペースが大幅に広がり、24時間タイムラインの視認性と操作性が格段に向上しました。',
      '選択中ピースの「✕ 解除」や、未選択時の空き時間タップによる新規記録ボトムシートもスムーズに利用できます。',
    ],
    en: [
      'Replaced the always-visible piece palette with a sleek selector bar and popup menu sheet.',
      'Maximized vertical screen space for a significantly cleaner, wider 24-hour timeline view.',
      'Easily clear selected pieces or tap empty slots to open manual recording sheets seamlessly.',
    ],
  },
};
