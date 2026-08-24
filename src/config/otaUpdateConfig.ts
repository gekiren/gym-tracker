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
  version: '1.8.105',
  title: {
    ja: '💬 AIコーチ（テキスト）画面への一本化',
    en: '💬 AI Coach Chat Streamlining',
  },
  notes: {
    ja: [
      'トレーナータブをAIコーチ（テキスト）専用画面に一本化し、開いてすぐにチャット相談ができるように改善しました。',
    ],
    en: [
      'Streamlined the Coach tab into a dedicated AI text chat interface for instant consultations.',
    ],
  },
};
