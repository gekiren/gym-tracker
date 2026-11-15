import {
  configureGoogleSignIn,
  getGoogleSigninModule,
} from '../accountSyncService';

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

function escapeDriveQueryValue(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function hasDriveScope(scopes?: string[] | null): boolean {
  if (!Array.isArray(scopes)) return false;
  return scopes.some(
    (s) =>
      s === GOOGLE_DRIVE_SCOPE ||
      s === 'https://www.googleapis.com/auth/drive' ||
      s.endsWith('/auth/drive.file') ||
      s.endsWith('/auth/drive')
  );
}

/**
 * Google Sign-In 経由で Drive 権限を付与する（インタラクティブ）
 */
export async function authorizeGoogleDrive(): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  const pkg = getGoogleSigninModule();
  if (!pkg) {
    return {
      success: false,
      error: 'ネイティブモジュール (@react-native-google-signin) が利用できません',
    };
  }

  try {
    configureGoogleSignIn();
    await pkg.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    let currentUser = pkg.GoogleSignin.getCurrentUser();
    if (!currentUser) {
      const res = await pkg.GoogleSignin.signIn();
      if (res?.type === 'cancelled') {
        return { success: false, error: 'Googleログインがキャンセルされました' };
      }
      currentUser = res?.data ?? pkg.GoogleSignin.getCurrentUser();
    }

    if (!currentUser) {
      return { success: false, error: 'Googleアカウントを取得できませんでした' };
    }

    if (!hasDriveScope(currentUser.scopes)) {
      const scopeRes = await pkg.GoogleSignin.addScopes({
        scopes: [GOOGLE_DRIVE_SCOPE],
      });
      if (scopeRes?.type === 'cancelled') {
        return {
          success: false,
          error: 'Googleドライブのアクセス許可がキャンセルされました',
        };
      }
    }

    // トークンが取得できることまで検証する
    const tokens = await pkg.GoogleSignin.getTokens();
    if (!tokens?.accessToken) {
      return {
        success: false,
        error: 'Googleドライブ用アクセストークンの取得に失敗しました',
      };
    }

    return {
      success: true,
      email: currentUser.user?.email,
    };
  } catch (error: any) {
    const code = error?.code ? `[${error.code}] ` : '';
    return {
      success: false,
      error: `${code}${error?.message || 'Googleドライブ連携に失敗しました'}`,
    };
  }
}

/**
 * 有効な Google OAuth アクセストークンを取得する
 */
export async function getDriveAccessToken(options?: {
  interactive?: boolean;
  forceRefresh?: boolean;
}): Promise<{ accessToken: string | null; email?: string; error?: string }> {
  const pkg = getGoogleSigninModule();
  if (!pkg) {
    return { accessToken: null, error: 'Google Sign-Inモジュールが未対応です' };
  }

  try {
    configureGoogleSignIn();

    let currentUser = pkg.GoogleSignin.getCurrentUser();
    if (!currentUser) {
      try {
        const silent = await pkg.GoogleSignin.signInSilently();
        if (silent?.type === 'success') {
          currentUser = silent.data;
        }
      } catch {
        // silent sign-in failure is handled below
      }
    }

    if (!currentUser && options?.interactive) {
      const auth = await authorizeGoogleDrive();
      if (!auth.success) {
        return { accessToken: null, error: auth.error };
      }
      currentUser = pkg.GoogleSignin.getCurrentUser();
    }

    if (!currentUser) {
      return {
        accessToken: null,
        error: 'Googleアカウントにサインインしていません',
      };
    }

    if (!hasDriveScope(currentUser.scopes)) {
      if (!options?.interactive) {
        return {
          accessToken: null,
          email: currentUser.user?.email,
          error: 'Googleドライブの権限が未付与です（設定画面から連携してください）',
        };
      }
      const scopeRes = await pkg.GoogleSignin.addScopes({
        scopes: [GOOGLE_DRIVE_SCOPE],
      });
      if (scopeRes?.type === 'cancelled') {
        return {
          accessToken: null,
          email: currentUser.user?.email,
          error: 'Googleドライブの権限付与がキャンセルされました',
        };
      }
    }

    let tokens = await pkg.GoogleSignin.getTokens();
    if (options?.forceRefresh && tokens?.accessToken) {
      await pkg.GoogleSignin.clearCachedAccessToken(tokens.accessToken);
      tokens = await pkg.GoogleSignin.getTokens();
    }

    if (!tokens?.accessToken) {
      return {
        accessToken: null,
        email: currentUser.user?.email,
        error: 'アクセストークンを取得できませんでした',
      };
    }

    return {
      accessToken: tokens.accessToken,
      email: currentUser.user?.email,
    };
  } catch (error: any) {
    return {
      accessToken: null,
      error: error?.message || 'トークン取得エラー',
    };
  }
}

async function fetchDriveWithRetry(
  url: string,
  init: RequestInit,
  interactive = false
): Promise<Response> {
  const tokenRes = await getDriveAccessToken({ interactive });
  if (!tokenRes.accessToken) {
    throw new Error(tokenRes.error || 'Google Drive未認証です');
  }

  const doFetch = (token: string) => {
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  let res = await doFetch(tokenRes.accessToken);
  if (res.status === 401) {
    const refreshed = await getDriveAccessToken({
      interactive,
      forceRefresh: true,
    });
    if (refreshed.accessToken) {
      res = await doFetch(refreshed.accessToken);
    }
  }
  return res;
}

async function parseDriveError(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    const json = JSON.parse(text);
    const msg = json?.error?.message || text;
    return `HTTP ${res.status}: ${msg}`;
  } catch {
    return `HTTP ${res.status}: ${fallback}`;
  }
}

/**
 * 同期用フォルダを検索し、無ければ作成して ID を返す
 */
export async function ensureDriveFolder(
  folderName: string,
  knownFolderId?: string,
  interactive = false
): Promise<string> {
  const safeName = (folderName || 'TreNote_AI_Sync').trim();

  if (knownFolderId) {
    const checkUrl = `${DRIVE_FILES_API}/${encodeURIComponent(
      knownFolderId
    )}?fields=id,name,trashed,mimeType`;
    const checkRes = await fetchDriveWithRetry(checkUrl, { method: 'GET' }, interactive);
    if (checkRes.ok) {
      const meta = await checkRes.json();
      if (
        meta?.id &&
        !meta.trashed &&
        meta.mimeType === 'application/vnd.google-apps.folder' &&
        meta.name === safeName
      ) {
        return meta.id;
      }
    }
  }

  const q = `name = '${escapeDriveQueryValue(
    safeName
  )}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `${DRIVE_FILES_API}?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=5`;

  const searchRes = await fetchDriveWithRetry(searchUrl, { method: 'GET' }, interactive);
  if (!searchRes.ok) {
    throw new Error(await parseDriveError(searchRes, 'フォルダ検索に失敗しました'));
  }
  const searchJson = await searchRes.json();
  if (Array.isArray(searchJson?.files) && searchJson.files.length > 0) {
    return searchJson.files[0].id;
  }

  const createRes = await fetchDriveWithRetry(
    `${DRIVE_FILES_API}?fields=id,name`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: safeName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    },
    interactive
  );
  if (!createRes.ok) {
    throw new Error(await parseDriveError(createRes, 'フォルダ作成に失敗しました'));
  }
  const created = await createRes.json();
  if (!created?.id) {
    throw new Error('フォルダIDを取得できませんでした');
  }
  return created.id;
}

/**
 * フォルダ内の特定ファイル（最新1件）を検索する
 */
export async function findFileInFolder(
  folderId: string,
  fileName: string,
  interactive = false
): Promise<DriveFileMetadata | null> {
  const q = `'${escapeDriveQueryValue(folderId)}' in parents and name = '${escapeDriveQueryValue(
    fileName
  )}' and trashed = false`;
  const url = `${DRIVE_FILES_API}?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,mimeType,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=5`;

  const res = await fetchDriveWithRetry(url, { method: 'GET' }, interactive);
  if (!res.ok) {
    throw new Error(await parseDriveError(res, `ファイル検索に失敗しました (${fileName})`));
  }
  const data = await res.json();
  if (Array.isArray(data?.files) && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Google Drive 上の UTF-8 テキストファイルを作成または上書き更新する
 */
export async function upsertTextFileInFolder(params: {
  folderId: string;
  fileName: string;
  content: string;
  mimeType: string;
  existingFileId?: string;
  interactive?: boolean;
}): Promise<DriveFileMetadata> {
  const { folderId, fileName, content, mimeType, existingFileId, interactive = false } = params;

  let targetFileId = existingFileId;
  if (!targetFileId) {
    const existing = await findFileInFolder(folderId, fileName, interactive);
    targetFileId = existing?.id;
  }

  const boundary = `treno_drive_boundary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const metadata = targetFileId
    ? { name: fileName, mimeType }
    : { name: fileName, mimeType, parents: [folderId] };

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const url = targetFileId
    ? `${DRIVE_UPLOAD_API}/${encodeURIComponent(
        targetFileId
      )}?uploadType=multipart&fields=id,name,mimeType,modifiedTime`
    : `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,modifiedTime`;

  const res = await fetchDriveWithRetry(
    url,
    {
      method: targetFileId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
    interactive
  );

  if (!res.ok) {
    throw new Error(await parseDriveError(res, `アップロード失敗 (${fileName})`));
  }

  return (await res.json()) as DriveFileMetadata;
}

/**
 * Google Drive ファイルの中身をテキストとして読み取る
 */
export async function downloadTextFileById(
  fileId: string,
  interactive = false
): Promise<string> {
  const url = `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?alt=media`;
  const res = await fetchDriveWithRetry(url, { method: 'GET' }, interactive);
  if (!res.ok) {
    throw new Error(await parseDriveError(res, 'ファイルダウンロードに失敗しました'));
  }
  return await res.text();
}
