/**
 * Sentry Configuration
 * 
 * 実機のクラッシュレポート送信先となる Sentry の接続情報を定義します。
 * 本番稼働時には、ご自身の Sentry プロジェクトの DSN に置き換えてください。
 */
export const SENTRY_CONFIG = {
  // Sentry管理画面から取得した DSN キーを入力します
  dsn: 'https://placeholder@o0.ingest.sentry.io/placeholder',

  // デバッグログを有効にするか（開発時は true、本番時は false にすることを推奨）
  debug: __DEV__,

  // Sentryが紐づく組織名とプロジェクト名
  organization: 'gekirennomads-organization',
  project: 'gym-tracker',
};
