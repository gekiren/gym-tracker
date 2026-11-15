type TriggerFn = (reason: string, delayMs?: number) => void;
type FlushFn = (reason?: string) => Promise<void>;

let triggerHandler: TriggerFn | null = null;
let flushHandler: FlushFn | null = null;
let suppressionDepth = 0;

/**
 * googleDriveSyncService 側から実行ハンドラを登録する（循環参照防止のため分離）
 */
export function registerDriveSyncHandlers(handlers: {
  triggerDebounced: TriggerFn;
  flushPending: FlushFn;
}) {
  triggerHandler = handlers.triggerDebounced;
  flushHandler = handlers.flushPending;
}

/**
 * バッチ適用中（AI提案のDB反映時など）の自動アップロード再トリガーを一時抑止する
 */
export async function withDriveTriggerSuppressed<T>(fn: () => Promise<T>): Promise<T> {
  suppressionDepth += 1;
  try {
    return await fn();
  } finally {
    suppressionDepth = Math.max(0, suppressionDepth - 1);
  }
}

export function isDriveTriggerSuppressed(): boolean {
  return suppressionDepth > 0;
}

/**
 * データ変更時に呼び出すデバウンス付き Google Drive アップロードトリガー
 */
export function triggerDebouncedDriveUpload(reason: string, delayMs: number = 10000): void {
  if (suppressionDepth > 0) return;
  triggerHandler?.(reason, delayMs);
}

/**
 * バックグラウンド移行時など、保留中の変更を即時アップロードする
 */
export async function flushPendingDriveUpload(reason: string = 'background'): Promise<void> {
  if (!flushHandler) return;
  await flushHandler(reason);
}
