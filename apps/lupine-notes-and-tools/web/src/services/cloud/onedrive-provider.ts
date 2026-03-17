import { GranularStorageProvider } from './cloud-storage.interface';
import { NotificationMessage, NotificationColor } from 'lupine.components';

const getConfig = () => ({
  token: localStorage.getItem('onedrive_sync_token'),
  refreshToken: localStorage.getItem('onedrive_sync_refresh_token'),
  clientId: localStorage.getItem('onedrive_sync_client_id'),
  path: localStorage.getItem('onedrive_sync_path') || 'lupine_data_v2',
});

let cachedAccessToken = '';

const getValidToken = async (): Promise<string | null> => {
  const { token, refreshToken, clientId } = getConfig();

  if (cachedAccessToken) return cachedAccessToken;
  if (token && !refreshToken) return token;

  if (!refreshToken || !clientId) {
    if (token) return token;
    return null;
  }

  try {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      cachedAccessToken = data.access_token;
      return cachedAccessToken;
    } else {
      console.error('Failed to refresh OneDrive token', await res.text());
      return token;
    }
  } catch (e) {
    console.error('Network error refreshing token', e);
    return token;
  }
};

const getBasePath = () => {
  let p = getConfig().path;
  if (p.startsWith('/')) p = p.substring(1);
  if (p.endsWith('/')) p = p.substring(0, p.length - 1);
  return p;
};

const onedriveRequest = async (url: string, method = 'GET', bodyObj?: any, isFileUpload = false): Promise<{ status: number; data: any }> => {
  let activeToken = await getValidToken();
  if (!activeToken) return { status: 401, data: null };

  const headers: any = {
    Authorization: `Bearer ${activeToken}`,
  };

  const reqInit: RequestInit = { method };

  if (bodyObj && !isFileUpload) {
    headers['Content-Type'] = 'application/json';
    reqInit.body = JSON.stringify(bodyObj);
  } else if (isFileUpload) {
    headers['Content-Type'] = 'application/json';
    reqInit.body = JSON.stringify(bodyObj); 
    // ^ OneDrive simple upload accepts the raw bytes or stringified JSON payload
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
      if (res.status === 404 && method === 'GET') {
          return { status: 404, data: null };
      }
      console.error(`OneDrive API Error [${method} ${url}]:`, res.status, await res.text());
      return { status: res.status, data: null };
    }
    
    // Delete returns 204 No Content
    if (res.status === 204) {
      return { status: 204, data: true };
    }
    const json = await res.json();
    return { status: res.status, data: json };
  } catch (e) {
    console.error(`OneDrive Network Error:`, e);
    return { status: 0, data: null };
  }
};

const onedriveUpload = async (subPath: string, data: any) => {
  const fullPath = `${getBasePath()}/${subPath}`;
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURI(fullPath)}:/content`;
  const res = await onedriveRequest(url, 'PUT', data, true);
  return res.status === 200 || res.status === 201;
};

const onedriveDownload = async (subPath: string) => {
  const fullPath = `${getBasePath()}/${subPath}`;
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURI(fullPath)}:/content`;
  const res = await onedriveRequest(url);
  if (res.status === 200) {
    return res.data;
  }
  return null;
};

export const OneDriveStorageProvider: GranularStorageProvider = {
  id: 'onedrive',
  name: 'OneDrive',

  isConfigured: () => {
    const { token, refreshToken, path } = getConfig();
    return !!((token || refreshToken) && path);
  },

  readStats: async () => {
    return await onedriveDownload('app_stats.json');
  },

  writeStats: async (stats: any) => {
    return await onedriveUpload('app_stats.json', stats);
  },

  listCategory: async (category: string) => {
    return await onedriveDownload(`${category}/list.json`);
  },

  writeCategoryList: async (category: string, listData: any[]) => {
    return await onedriveUpload(`${category}/list.json`, listData);
  },

  readItem: async (category: string, id: string) => {
    return await onedriveDownload(`${category}/${id}.json`);
  },

  writeItem: async (category: string, id: string, data: any) => {
    return await onedriveUpload(`${category}/${id}.json`, data);
  },

  deleteItem: async (category: string, id: string) => {
    const fullPath = `${getBasePath()}/${category}/${id}.json`;
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURI(fullPath)}`;
    await onedriveRequest(url, 'DELETE');
    return true;
  },
};
