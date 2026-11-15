import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getSettings, saveSetting } from '../db/database';
import { useGoogleDriveSyncStore } from '../store/googleDriveSyncStore';
import {
  authorizeGoogleDrive,
  downloadTextFileById,
  ensureDriveFolder,
  findFileInFolder,
  getDriveAccessToken,
  upsertTextFileInFolder,
} from './googleDrive/driveApiClient';
import {
  buildAgentGuideMarkdown,
  buildDriveExportBundle,
  buildInitialProposalTemplate,
} from './googleDrive/drivePayloadBuilder';
import {
  applyAiAgentProposalToApp,
  isNewPendingProposal,
  loadAppliedHistory,
  loadSavedAdvices,
  parseProposalsJson,
  summarizeProposal,
} from './googleDrive/driveProposalApplier';
import {
  registerDriveSyncHandlers,
  withDriveTriggerSuppressed,
} from './googleDrive/driveSyncTrigger';
import {
  AiAgentProposalsPayload,
  DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS,
  GoogleDriveSyncSettings,
  PendingDriveProposal,
  RestorePauseState,
} from './googleDrive/types';

export const DRIVE_SYNC_SETTINGS_KEY = 'google_drive_sync_settings';
export const DRIVE_FILES = {
  SUMMARY_MD: 'trainer_context_summary.md',
  RECORDS_JSON: 'app_records_export.json',
  PROPOSALS_JSON: 'ai_agent_proposals.json',
  GUIDE_MD: 'AI_AGENT_GUIDE.md',
} as const;

const RESTORE_PAUSE_FILE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}google_drive_restore_pause.json`
  : null;

const MIN_AUTO_CHECK_INTERVAL_MS = 30 * 1000;

let uploadDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let hasPendingUploadChanges = false;
let isUploadingNow = false;
let isDownloadingNow = false;
let isAuthorizingDriveNow = false;
let lastAutoCheckTimestamp = 0;

/**
 * バックアップ復元直前（Updates.reloadAsync() の前）に呼び出し、
 * DB外のローカルファイルへ「Drive自動アップロード一時停止フラグ」を保存する。
 */
export async function markBackupRestoredForDriveSync(sourceName?: string): Promise<void> {
  if (!RESTORE_PAUSE_FILE_URI) return;
  try {
    const payload: RestorePauseState = {
      paused: true,
      restoredAt: new Date().toISOString(),
      sourceName,
    };
    await FileSystem.writeAsStringAsync(RESTORE_PAUSE_FILE_URI, JSON.stringify(payload));
    useGoogleDriveSyncStore.getState().setRestorePause(payload);
  } catch (err) {
    console.warn('[GoogleDriveSync] Failed to write restore pause flag:', err);
  }
}

export async function loadRestorePauseState(): Promise<RestorePauseState | null> {
  if (!RESTORE_PAUSE_FILE_URI) return null;
  try {
    const info = await FileSystem.getInfoAsync(RESTORE_PAUSE_FILE_URI);
    if (!info.exists) {
      useGoogleDriveSyncStore.getState().setRestorePause(null);
      return null;
    }
    const raw = await FileSystem.readAsStringAsync(RESTORE_PAUSE_FILE_URI);
    const parsed = JSON.parse(raw) as RestorePauseState;
    if (parsed?.paused) {
      useGoogleDriveSyncStore.getState().setRestorePause(parsed);
      return parsed;
    }
    useGoogleDriveSyncStore.getState().setRestorePause(null);
    return null;
  } catch (err) {
    console.warn('[GoogleDriveSync] Failed to read restore pause flag:', err);
    return null;
  }
}

async function clearRestorePauseFlagFile(): Promise<void> {
  if (!RESTORE_PAUSE_FILE_URI) return;
  try {
    const info = await FileSystem.getInfoAsync(RESTORE_PAUSE_FILE_URI);
    if (info.exists) {
      await FileSystem.deleteAsync(RESTORE_PAUSE_FILE_URI, { idempotent: true });
    }
  } catch (err) {
    console.warn('[GoogleDriveSync] Failed to clear restore pause flag:', err);
  } finally {
    useGoogleDriveSyncStore.getState().setRestorePause(null);
  }
}

export async function loadDriveSyncSettings(): Promise<GoogleDriveSyncSettings> {
  try {
    const all = await getSettings();
    const raw = all[DRIVE_SYNC_SETTINGS_KEY];
    const parsed = raw ? JSON.parse(raw) : {};
    const merged: GoogleDriveSyncSettings = {
      ...DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS,
      ...parsed,
    };
    useGoogleDriveSyncStore.getState().setSettings(merged);
    return merged;
  } catch {
    useGoogleDriveSyncStore.getState().setSettings(DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS);
    return DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS;
  }
}

export async function saveDriveSyncSettings(
  partial: Partial<GoogleDriveSyncSettings>
): Promise<GoogleDriveSyncSettings> {
  const current = await loadDriveSyncSettings();
  const next: GoogleDriveSyncSettings = {
    ...current,
    ...partial,
  };
  await withDriveTriggerSuppressed(async () => {
    await saveSetting(DRIVE_SYNC_SETTINGS_KEY, JSON.stringify(next));
  });
  useGoogleDriveSyncStore.getState().setSettings(next);
  return next;
}

/**
 * ストアと設定を初期化し、起動時の復元保護状態・履歴をロードする
 */
export async function initGoogleDriveSync(): Promise<{
  settings: GoogleDriveSyncSettings;
  restorePause: RestorePauseState | null;
}> {
  const [settings, restorePause, advices, appliedHistory] = await Promise.all([
    loadDriveSyncSettings(),
    loadRestorePauseState(),
    loadSavedAdvices(),
    loadAppliedHistory(),
  ]);

  const store = useGoogleDriveSyncStore.getState();
  store.setAdvices(advices);
  store.setAppliedHistory(appliedHistory);

  if (settings.enabled && settings.autoDownload) {
    // 復元直後であっても読み込みチェック自体は安全（Driveの更新をローカルへ提案として取得するだけ）
    checkDriveForProposals({ interactive: false, reason: 'launch' }).catch((err) => {
      console.warn('[GoogleDriveSync] Proposal check on launch failed:', err);
    });
  }

  return { settings, restorePause };
}

/**
 * Google Sign-In + Drive スコープ接続を対話的に行い、初回フォルダ・ガイドを作成する
 */
export async function connectGoogleDriveAccount(): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  isAuthorizingDriveNow = true;
  try {
    const auth = await authorizeGoogleDrive();
    if (!auth.success) {
      await saveDriveSyncSettings({ lastError: auth.error });
      return auth;
    }

    const current = await loadDriveSyncSettings();
    const folderId = await ensureDriveFolder(
      current.folderName || 'TreNote_AI_Sync',
      current.folderId,
      true
    );

    await saveDriveSyncSettings({
      enabled: true,
      connectedEmail: auth.email,
      folderId,
      lastError: undefined,
    });

    // 初回連携時にガイドとテンプレートを準備（復元一時停止中でなければ即アップロードも実施）
    const pause = await loadRestorePauseState();
    if (!pause?.paused) {
      await uploadAppRecordsToDrive({ interactive: true, reason: 'initial_connect' });
    } else {
      await ensureGuideAndTemplateInFolder(folderId, true);
    }

    return { success: true, email: auth.email };
  } catch (error: any) {
    const msg = error?.message || 'Googleドライブの初期設定に失敗しました';
    await saveDriveSyncSettings({ lastError: msg });
    return { success: false, error: msg };
  } finally {
    isAuthorizingDriveNow = false;
  }
}

async function ensureGuideAndTemplateInFolder(
  folderId: string,
  interactive: boolean
): Promise<void> {
  const existingGuide = await findFileInFolder(folderId, DRIVE_FILES.GUIDE_MD, interactive);
  if (!existingGuide) {
    await upsertTextFileInFolder({
      folderId,
      fileName: DRIVE_FILES.GUIDE_MD,
      content: buildAgentGuideMarkdown(),
      mimeType: 'text/markdown',
      interactive,
    });
  }

  const existingProposals = await findFileInFolder(
    folderId,
    DRIVE_FILES.PROPOSALS_JSON,
    interactive
  );
  if (!existingProposals) {
    await upsertTextFileInFolder({
      folderId,
      fileName: DRIVE_FILES.PROPOSALS_JSON,
      content: JSON.stringify(buildInitialProposalTemplate(), null, 2),
      mimeType: 'application/json',
      interactive,
    });
  }
}

/**
 * アプリ記録（JSON / Markdownサマリー）を Google Drive へアップロードする
 */
export async function uploadAppRecordsToDrive(options?: {
  interactive?: boolean;
  bypassRestorePause?: boolean;
  reason?: string;
}): Promise<{ success: boolean; error?: string; skippedReason?: string }> {
  const interactive = !!options?.interactive;
  const store = useGoogleDriveSyncStore.getState();

  if (isUploadingNow) {
    return { success: false, skippedReason: 'already_uploading' };
  }

  const settings = await loadDriveSyncSettings();
  if (!settings.enabled && !interactive) {
    return { success: false, skippedReason: 'disabled' };
  }
  if (!interactive && (isAuthorizingDriveNow || !settings.connectedEmail)) {
    return {
      success: false,
      skippedReason: isAuthorizingDriveNow ? 'auth_in_progress' : 'not_connected',
    };
  }

  if (!options?.bypassRestorePause) {
    const pauseState = await loadRestorePauseState();
    if (pauseState?.paused) {
      return {
        success: false,
        skippedReason: 'restore_paused',
        error: 'バックアップ復元後の保護モード中のため自動アップロードを停止しています',
      };
    }
  }

  const tokenCheck = await getDriveAccessToken({ interactive });
  if (!tokenCheck.accessToken) {
    if (interactive) {
      await saveDriveSyncSettings({ lastError: tokenCheck.error });
    }
    return { success: false, error: tokenCheck.error };
  }

  isUploadingNow = true;
  store.setActivity('uploading');
  store.setLastStatusMessage('Googleドライブへ記録をアップロード中...');

  try {
    const folderId = await ensureDriveFolder(
      settings.folderName || 'TreNote_AI_Sync',
      settings.folderId,
      interactive
    );

    await ensureGuideAndTemplateInFolder(folderId, interactive);

    const bundle = await buildDriveExportBundle();

    await upsertTextFileInFolder({
      folderId,
      fileName: DRIVE_FILES.RECORDS_JSON,
      content: bundle.jsonContent,
      mimeType: 'application/json',
      interactive,
    });

    if (settings.includeMarkdownSummary) {
      await upsertTextFileInFolder({
        folderId,
        fileName: DRIVE_FILES.SUMMARY_MD,
        content: bundle.markdownSummary,
        mimeType: 'text/markdown',
        interactive,
      });
    }

    hasPendingUploadChanges = false;
    const nowIso = new Date().toISOString();
    await saveDriveSyncSettings({
      folderId,
      connectedEmail: tokenCheck.email || settings.connectedEmail,
      lastUploadAt: nowIso,
      lastError: undefined,
    });

    store.setLastStatusMessage('Googleドライブへの記録アップロードが完了しました');
    return { success: true };
  } catch (error: any) {
    const msg = error?.message || 'アップロードに失敗しました';
    await saveDriveSyncSettings({ lastError: msg });
    store.setLastStatusMessage(`アップロードエラー: ${msg}`);
    return { success: false, error: msg };
  } finally {
    isUploadingNow = false;
    useGoogleDriveSyncStore.getState().setActivity('idle');
  }
}

/**
 * バックアップ復元後の保護モードを解除して再開する
 */
export async function resolveRestorePause(
  action: 'upload_now' | 'resume_without_upload'
): Promise<{ success: boolean; error?: string }> {
  await clearRestorePauseFlagFile();
  if (action === 'upload_now') {
    return await uploadAppRecordsToDrive({
      interactive: true,
      bypassRestorePause: true,
      reason: 'restore_override_upload',
    });
  }
  useGoogleDriveSyncStore
    .getState()
    .setLastStatusMessage('保護モードを解除し、今後の変更から自動アップロードを再開します');
  return { success: true };
}

/**
 * AI提案 (ai_agent_proposals.json) を Google Drive からチェックし、設定に応じて自動反映または確認待ちにする
 */
export async function checkDriveForProposals(options?: {
  interactive?: boolean;
  force?: boolean;
  reason?: string;
}): Promise<{
  status: 'applied' | 'pending_confirm' | 'no_update' | 'skipped' | 'error';
  summary?: string;
  error?: string;
}> {
  const interactive = !!options?.interactive;
  const force = !!options?.force;
  const store = useGoogleDriveSyncStore.getState();

  if (isDownloadingNow) {
    return { status: 'skipped' };
  }

  const nowMs = Date.now();
  if (!force && nowMs - lastAutoCheckTimestamp < MIN_AUTO_CHECK_INTERVAL_MS) {
    return { status: 'skipped' };
  }

  const settings = await loadDriveSyncSettings();
  if (!settings.enabled && !interactive) {
    return { status: 'skipped' };
  }
  if (!interactive && (isAuthorizingDriveNow || !settings.connectedEmail)) {
    return { status: 'skipped' };
  }
  if (!force && !settings.autoDownload) {
    return { status: 'skipped' };
  }

  const tokenCheck = await getDriveAccessToken({ interactive });
  if (!tokenCheck.accessToken) {
    if (interactive) {
      await saveDriveSyncSettings({ lastError: tokenCheck.error });
    }
    return { status: 'error', error: tokenCheck.error };
  }

  isDownloadingNow = true;
  lastAutoCheckTimestamp = nowMs;
  store.setActivity('downloading');

  try {
    const folderId = await ensureDriveFolder(
      settings.folderName || 'TreNote_AI_Sync',
      settings.folderId,
      interactive
    );

    const fileMeta = await findFileInFolder(folderId, DRIVE_FILES.PROPOSALS_JSON, interactive);
    const nowIso = new Date().toISOString();

    if (!fileMeta) {
      await ensureGuideAndTemplateInFolder(folderId, interactive);
      await saveDriveSyncSettings({ folderId, lastDownloadAt: nowIso, lastError: undefined });
      return { status: 'no_update' };
    }

    const rawText = await downloadTextFileById(fileMeta.id, interactive);
    const payload = parseProposalsJson(rawText);

    await saveDriveSyncSettings({
      folderId,
      connectedEmail: tokenCheck.email || settings.connectedEmail,
      lastDownloadAt: nowIso,
      lastError: undefined,
    });

    if (!payload || !isNewPendingProposal(payload, settings)) {
      return { status: 'no_update' };
    }

    const { counts, previewSummary } = summarizeProposal(payload);
    const pending: PendingDriveProposal = {
      fileId: fileMeta.id,
      fileName: fileMeta.name,
      detectedAt: nowIso,
      payload,
      counts,
      previewSummary,
    };

    if (settings.applyMode === 'auto') {
      const res = await applyPendingProposalObject(pending, interactive);
      return { status: 'applied', summary: res.summary };
    } else {
      store.setPendingProposal(pending);
      store.setLastStatusMessage(`新しいAI提案を検出: ${previewSummary}`);
      return { status: 'pending_confirm', summary: previewSummary };
    }
  } catch (error: any) {
    const msg = error?.message || '提案ファイルの読み込みに失敗しました';
    await saveDriveSyncSettings({ lastError: msg });
    if (interactive) {
      store.setLastStatusMessage(`読み込みエラー: ${msg}`);
    }
    return { status: 'error', error: msg };
  } finally {
    isDownloadingNow = false;
    useGoogleDriveSyncStore.getState().setActivity('idle');
  }
}

async function updateProposalStatusOnDrive(
  pending: PendingDriveProposal,
  newStatus: 'applied' | 'ignored',
  interactive: boolean
): Promise<void> {
  if (!pending.fileId) return;
  try {
    const settings = await loadDriveSyncSettings();
    const folderId =
      settings.folderId ||
      (await ensureDriveFolder(settings.folderName || 'TreNote_AI_Sync', undefined, interactive));

    const updatedPayload: AiAgentProposalsPayload = {
      ...pending.payload,
      status: newStatus,
      appliedAt: new Date().toISOString(),
    };

    await upsertTextFileInFolder({
      folderId,
      fileName: pending.fileName || DRIVE_FILES.PROPOSALS_JSON,
      content: JSON.stringify(updatedPayload, null, 2),
      mimeType: 'application/json',
      existingFileId: pending.fileId,
      interactive,
    });
  } catch (err) {
    // 外部作成した別オーナーファイル等に書き込み権限がない場合はローカル適用記録のみで十分
    console.warn('[GoogleDriveSync] Could not update proposal status back to Drive:', err);
  }
}

async function applyPendingProposalObject(
  pending: PendingDriveProposal,
  interactive: boolean
): Promise<{ summary: string }> {
  const store = useGoogleDriveSyncStore.getState();
  store.setActivity('applying');

  try {
    const result = await applyAiAgentProposalToApp(pending.payload);

    store.setAdvices(result.advices);
    store.setAppliedHistory(result.appliedHistory);
    store.setPendingProposal(null);
    store.bumpAppliedRevision();

    const updatedSettings = await saveDriveSyncSettings({
      lastAppliedProposalId: pending.payload.proposalId,
      lastAppliedUpdatedAt: pending.payload.updatedAt,
      lastError: undefined,
    });

    await updateProposalStatusOnDrive(pending, 'applied', interactive);

    // 反映後、保護停止中でなければ最新状態を1回アップロードしてAI側へも反映結果を伝える
    const pause = await loadRestorePauseState();
    if (updatedSettings.enabled && updatedSettings.autoUpload && !pause?.paused) {
      scheduleDebouncedDriveUpload('post_proposal_apply', 1500);
    }

    store.setLastStatusMessage(`AI提案を反映しました: ${result.summary}`);
    return { summary: result.summary };
  } finally {
    useGoogleDriveSyncStore.getState().setActivity('idle');
  }
}

/**
 * 確認待ちの AI 提案をユーザー承認後に反映する
 */
export async function approvePendingProposal(): Promise<{
  success: boolean;
  summary?: string;
  error?: string;
}> {
  const pending = useGoogleDriveSyncStore.getState().pendingProposal;
  if (!pending) {
    return { success: false, error: '反映待ちのAI提案がありません' };
  }

  try {
    const res = await applyPendingProposalObject(pending, true);
    return { success: true, summary: res.summary };
  } catch (error: any) {
    return { success: false, error: error?.message || 'AI提案の反映に失敗しました' };
  }
}

/**
 * 確認待ちの AI 提案を見送る
 */
export async function dismissPendingProposal(
  markIgnoredOnDrive: boolean = true
): Promise<void> {
  const store = useGoogleDriveSyncStore.getState();
  const pending = store.pendingProposal;
  if (!pending) return;

  store.setPendingProposal(null);
  await saveDriveSyncSettings({
    lastAppliedProposalId: pending.payload.proposalId,
    lastAppliedUpdatedAt: pending.payload.updatedAt,
  });

  if (markIgnoredOnDrive && pending.fileId) {
    await updateProposalStatusOnDrive(pending, 'ignored', false);
  }
  store.setLastStatusMessage('今回のAI提案をスキップしました');
}

/**
 * フォールバック用：端末内またはGoogleドライブドキュメントピッカーから直接 JSON ファイルを読み込む
 */
export async function importProposalsFromLocalFile(): Promise<{
  status: 'applied' | 'pending_confirm' | 'cancelled' | 'error';
  summary?: string;
  error?: string;
}> {
  try {
    const pick = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });

    if (pick.canceled || !pick.assets || pick.assets.length === 0) {
      return { status: 'cancelled' };
    }

    const asset = pick.assets[0];
    const text = await FileSystem.readAsStringAsync(asset.uri);
    const payload = parseProposalsJson(text);
    if (!payload) {
      return { status: 'error', error: 'JSONの内容が空です' };
    }

    const { counts, previewSummary } = summarizeProposal(payload);
    const pending: PendingDriveProposal = {
      fileName: asset.name || 'local_proposal.json',
      detectedAt: new Date().toISOString(),
      payload,
      counts,
      previewSummary,
    };

    const settings = await loadDriveSyncSettings();
    if (settings.applyMode === 'auto') {
      const res = await applyPendingProposalObject(pending, true);
      return { status: 'applied', summary: res.summary };
    } else {
      useGoogleDriveSyncStore.getState().setPendingProposal(pending);
      return { status: 'pending_confirm', summary: previewSummary };
    }
  } catch (error: any) {
    return { status: 'error', error: error?.message || 'JSONファイルの読み込みに失敗しました' };
  }
}

export function scheduleDebouncedDriveUpload(
  reason: string,
  delayMs: number = 10000
): void {
  const settings = useGoogleDriveSyncStore.getState().settings;
  const pause = useGoogleDriveSyncStore.getState().restorePause;
  if (
    !settings.enabled ||
    !settings.autoUpload ||
    !settings.connectedEmail ||
    pause?.paused
  ) {
    return;
  }

  hasPendingUploadChanges = true;
  if (uploadDebounceTimer) {
    clearTimeout(uploadDebounceTimer);
  }
  uploadDebounceTimer = setTimeout(() => {
    uploadDebounceTimer = null;
    if (!hasPendingUploadChanges) return;
    uploadAppRecordsToDrive({ interactive: false, reason }).catch((err) => {
      console.warn('[GoogleDriveSync] Debounced upload failed:', err);
    });
  }, delayMs);
}

export async function flushPendingDriveUploadImpl(reason: string = 'background'): Promise<void> {
  const settings = useGoogleDriveSyncStore.getState().settings;
  const pause = useGoogleDriveSyncStore.getState().restorePause;
  if (
    !settings.enabled ||
    !settings.autoUpload ||
    !settings.connectedEmail ||
    pause?.paused
  ) {
    return;
  }
  if (!hasPendingUploadChanges) {
    return;
  }
  if (uploadDebounceTimer) {
    clearTimeout(uploadDebounceTimer);
    uploadDebounceTimer = null;
  }
  await uploadAppRecordsToDrive({ interactive: false, reason });
}

// 循環参照なしでトリガーから呼び出せるよう登録する
registerDriveSyncHandlers({
  triggerDebounced: scheduleDebouncedDriveUpload,
  flushPending: flushPendingDriveUploadImpl,
});

export {
  loadAppliedHistory,
  loadSavedAdvices,
} from './googleDrive/driveProposalApplier';
export { flushPendingDriveUpload } from './googleDrive/driveSyncTrigger';
