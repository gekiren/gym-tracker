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
  version: '2.3.31',
  title: {
    ja: '✨ セット行の入力幅スリム化とタイム列の整列改善',
    en: '✨ Slimmer Reps/RPE Inputs & Aligned Timer Column',
  },
  notes: {
    ja: [
      '回数・RPEの入力枠を2桁表示に合わせたスリムな横幅に調整し、情報表示エリアを広げました。',
      '休憩時間（☕）を上段のスタンスと同じ行へ移動し、下段のセットタイム（⏱️）と左端を揃えたタイム列として見やすく整列しました。',
    ],
    en: [
      'Slimmed down the Reps and RPE input widths to fit 2-digit numbers cleanly, giving more room to set details.',
      'Moved rest time (☕) onto the same row as stance and left-aligned it with set work time (⏱️) in a clean column.',
    ],
  },
};
