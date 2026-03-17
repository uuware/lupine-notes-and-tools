import { GranularStorageProvider } from './cloud-storage.interface';
import { NotificationMessage, NotificationColor } from 'lupine.components';

const getConfig = () => ({
  token: localStorage.getItem('gdrive_sync_token'),
  refreshToken: localStorage.getItem('gdrive_sync_refresh_token'),
  clientId: localStorage.getItem('gdrive_sync_client_id'),
  clientSecret: localStorage.getItem('gdrive_sync_client_secret'),
  folderId: localStorage.getItem('gdrive_sync_folder_id'),
});

// Mutex queue to prevent overlapping directory creations
let requestQueue = Promise.resolve<any>(null);

// In-memory cache to avoid repeated file ID lookups
// Shape: { "notes/list.json": "1a2B3c..." }
const idCache: Record<string, string> = {};

let cachedAccessToken = '';

const getValidToken = async (): Promise<string | null> => {
  const { token, refreshToken, clientId, clientSecret } = getConfig();

  if (cachedAccessToken) return cachedAccessToken;
  if (token && !refreshToken) return token; // Legacy short-lived token mode

  if (!refreshToken || !clientId || !clientSecret) {
    if (token) return token; // Fallback to provided token if missing refresh components
    return null;
  }

  // Attempt to exchange refresh token for a new access token
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      cachedAccessToken = data.access_token;
      localStorage.setItem('gdrive_sync_token', cachedAccessToken);
      return cachedAccessToken;
    } else {
      console.error('Failed to refresh GDrive token', await res.text());
      return token; // fallback to old token and hope it still works
    }
  } catch (e) {
    console.error('Network error refreshing token', e);
    return token;
  }
};

const gdriveRequest = async (
  url: string,
  method = 'GET',
  bodyObj?: any,
  isMultipart = false
): Promise<{ status: number; data: any }> => {
  let activeToken = await getValidToken();
  if (!activeToken) return { status: 401, data: null };

  const headers: any = {
    Authorization: `Bearer ${activeToken}`,
  };

  const reqInit: RequestInit = { method };

  if (bodyObj && !isMultipart) {
    headers['Content-Type'] = 'application/json';
    reqInit.body = JSON.stringify(bodyObj);
  } else if (isMultipart) {
    // For simplicity, we just use a basic multipart manually
    const boundary = 'foo_bar_baz_boundary';
    headers['Content-Type'] = `multipart/related; boundary=${boundary}`;

    let multipartBody = `--${boundary}\r\n`;
    multipartBody += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
    multipartBody += JSON.stringify(bodyObj.metadata) + '\r\n';
    multipartBody += `--${boundary}\r\n`;
    multipartBody += 'Content-Type: application/json\r\n\r\n'; // Actually text/json data
    multipartBody += JSON.stringify(bodyObj.content, null, 2) + '\r\n';
    multipartBody += `--${boundary}--`;

    reqInit.body = multipartBody;
  }

  reqInit.headers = headers;

  try {
    let res = await fetch(url, reqInit);

    // If unauthorized, token might have expired. Force refresh and retry once.
    if (res.status === 401 && getConfig().refreshToken) {
      cachedAccessToken = ''; // Clear memory cache
      activeToken = await getValidToken();
      if (activeToken) {
        reqInit.headers = { ...headers, Authorization: `Bearer ${activeToken}` };
        res = await fetch(url, reqInit);
      }
    }

    if (!res.ok) {
      console.error(`GDrive API Error:`, res.status, await res.text());
      return { status: res.status, data: null };
    }
    // Delete returns 204 No Content
    if (res.status === 204) {
      return { status: 204, data: true };
    }
    const json = await res.json();
    return { status: res.status, data: json };
  } catch (e) {
    console.error(`GDrive Network Error:`, e);
    return { status: 0, data: null };
  }
};

/**
 * Searches for a file or folder by name within a parent folder ID.
 */
const findFileId = async (name: string, parentId: string): Promise<string | null> => {
  const q = `name='${name}' and '${parentId}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const res = await gdriveRequest(url);
  if (res.data && res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  return null;
};

/**
 * Creates a folder inside a parent folder and returns its ID.
 */
const createFolder = async (name: string, parentId: string): Promise<string | null> => {
  const url = `https://www.googleapis.com/drive/v3/files`;
  const res = await gdriveRequest(url, 'POST', {
    name,
    parents: [parentId],
    mimeType: 'application/vnd.google-apps.folder',
  });
  return res.data?.id || null;
};

/**
 * Resolves a full virtual path (e.g. "notes/123.json") to a GDrive File ID.
 * Automatically creates subfolders (like "notes") if they don't exist.
 */
const resolvePathToId = async (fullPath: string, autoCreateParentFolders = true): Promise<string | null> => {
  if (idCache[fullPath]) return idCache[fullPath];

  return new Promise<string | null>((resolve) => {
    requestQueue = requestQueue
      .then(async () => {
        // Double check cache in case it was resolved while waiting in queue
        if (idCache[fullPath]) {
          resolve(idCache[fullPath]);
          return;
        }

        const { folderId: rootFolderId } = getConfig();
        if (!rootFolderId) {
          resolve(null);
          return;
        }

        const parts = fullPath.split('/');
        const fileName = parts.pop()!;
        let currentParentId = rootFolderId;

        // Traverse and optionally create folders
        for (const dirName of parts) {
          let dirId = await findFileId(dirName, currentParentId);
          if (!dirId) {
            if (autoCreateParentFolders) {
              dirId = await createFolder(dirName, currentParentId);
              if (!dirId) {
                resolve(null); // Failed to create
                return;
              }
            } else {
              resolve(null); // parent doesn't exist, so file can't
              return;
            }
          }
          currentParentId = dirId;
        }

        // Finally, find the actual file
        const fileId = await findFileId(fileName, currentParentId);
        if (fileId) {
          idCache[fullPath] = fileId;
        }

        // Even if fileId is null (file doesn't exist yet but folder does),
        // we return null, but we've successfully ensured the parent folders exist.
        // We can expose a helper to get the *parent* folder ID of a path for creation.
        resolve(fileId);
      })
      .catch(() => resolve(null));
  });
};

/**
 * Helper to get the GDrive ID of the parent folder of a given path.
 */
const getParentFolderId = async (fullPath: string): Promise<string | null> => {
  return new Promise<string | null>((resolve) => {
    requestQueue = requestQueue
      .then(async () => {
        const { folderId: rootFolderId } = getConfig();
        if (!rootFolderId) {
          resolve(null);
          return;
        }

        const parts = fullPath.split('/');
        parts.pop(); // Remove filename
        if (parts.length === 0) {
          resolve(rootFolderId);
          return;
        }

        let currentParentId = rootFolderId;
        for (const dirName of parts) {
          let dirId = await findFileId(dirName, currentParentId);
          if (!dirId) {
            dirId = await createFolder(dirName, currentParentId);
            if (!dirId) {
              resolve(null);
              return;
            }
          }
          currentParentId = dirId;
        }
        resolve(currentParentId);
      })
      .catch(() => resolve(null));
  });
};

const gdriveUpload = async (fullPath: string, data: any) => {
  const fileId = await resolvePathToId(fullPath, true);

  if (fileId) {
    // Update existing
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    const res = await gdriveRequest(
      url,
      'PATCH',
      {
        metadata: {}, // no name change needed
        content: data,
      },
      true
    );
    return !!res.data;
  } else {
    // Create new
    const parentId = await getParentFolderId(fullPath);
    if (!parentId) return false;

    const fileName = fullPath.split('/').pop();
    const url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
    const res = await gdriveRequest(
      url,
      'POST',
      {
        metadata: { name: fileName, parents: [parentId] },
        content: data,
      },
      true
    );

    if (res.data?.id) {
      idCache[fullPath] = res.data.id;
      return true;
    }
    return false;
  }
};

const gdriveDownload = async (fullPath: string) => {
  const fileId = await resolvePathToId(fullPath, false);
  if (!fileId) return null;

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await gdriveRequest(url);
  return res.data;
};

export const GoogleDriveStorageProvider: GranularStorageProvider = {
  id: 'gdrive',
  name: 'Google Drive',

  isConfigured: () => {
    const { token, refreshToken, folderId } = getConfig();
    return !!((token || refreshToken) && folderId);
  },

  readStats: async () => {
    return await gdriveDownload('app_stats.json');
  },

  writeStats: async (stats: any) => {
    return await gdriveUpload('app_stats.json', stats);
  },

  listCategory: async (category: string) => {
    return await gdriveDownload(`${category}/list.json`);
  },

  writeCategoryList: async (category: string, listData: any[]) => {
    return await gdriveUpload(`${category}/list.json`, listData);
  },

  readItem: async (category: string, id: string) => {
    return await gdriveDownload(`${category}/${id}.json`);
  },

  writeItem: async (category: string, id: string, data: any) => {
    return await gdriveUpload(`${category}/${id}.json`, data);
  },

  deleteItem: async (category: string, id: string) => {
    const fullPath = `${category}/${id}.json`;
    const fileId = await resolvePathToId(fullPath, false);
    if (!fileId) return true; // Already gone

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    await gdriveRequest(url, 'DELETE');
    delete idCache[fullPath];
    return true;
  },
};
