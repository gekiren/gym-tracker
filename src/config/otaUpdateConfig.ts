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
  version: '2.0.25',
  title: {
    ja: '🛠️ Obsidian連携のデイリーノート競合・重複バグの修正',
    en: '🛠️ Fixed Obsidian Sync Duplication Bug',
  },
  notes: {
    ja: [
      'Health ConnectデータのObsidian連携時の保存先を「Daily」から「Health」フォルダへ分離し、ファイル名を専用のものに変更しました。',
      'これにより、PC等で手動作成するデイリーノート本体と競合し、(1)などの重複ファイルが自動生成されてしまう問題を完全に解消しました。',
    ],
    en: [
      'Separated the Obsidian sync destination for Health Connect data from the Daily folder to the Health folder with a dedicated filename.',
      'This resolves the sync conflict issue where daily notes were duplicated with "(1)" across multiple devices.',
    ],
  },
};
