import Constants from 'expo-constants';

/**
 * Sentry Configuration
 * 
 * 実機のクラッシュレポート送信先となる Sentry の接続情報を定義します。
 * 本番稼働時には、ご自身の Sentry プロジェクトの DSN に置き換えてください。
 */
export const SENTRY_CONFIG = {
  // Constants から環境変数経由の Sentry Dsn を動的取得
  dsn: Constants.expoConfig?.extra?.sentryDsn ?? '',

  // デバッグログを有効にするか（開発時は true、本番時は false にすることを推奨）
  debug: __DEV__,

  // Sentryが紐づく組織名とプロジェクト名
  organization: 'toshidiyilgmailcom',
  project: 'gym-tracker',
};
