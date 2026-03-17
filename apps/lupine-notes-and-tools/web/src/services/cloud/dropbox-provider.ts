import { GranularStorageProvider } from './cloud-storage.interface';
import { NotificationMessage, NotificationColor } from 'lupine.components';

const getConfig = () => ({
  token: localStorage.getItem('dropbox_sync_token'),
  refreshToken: localStorage.getItem('dropbox_sync_refresh_token'),
  appKey: localStorage.getItem('dropbox_sync_app_key'),
  appSecret: localStorage.getItem('dropbox_sync_app_secret'),
  basePath: localStorage.getItem('dropbox_sync_path') || '/lupine_data_v2',
});

let cachedAccessToken = '';

const getValidToken = async (): Promise<string | null> => {
  const { token, refreshToken, appKey, appSecret } = getConfig();

  if (cachedAccessToken) return cachedAccessToken;
  if (token && !refreshToken) return token;

  if (!refreshToken || !appKey || !appSecret) {
    if (token) return token;
    return null;
  }

  try {
    const res = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: appKey,
        client_secret: appSecret,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      cachedAccessToken = data.access_token;
      return cachedAccessToken;
    } else {
      console.error('Failed to refresh Dropbox token', await res.text());
      return token;
    }
  } catch (e) {
    console.error('Network error refreshing Dropbox token', e);
    return token;
  }
};

// Mutex queue to prevent concurrent conflicts
let requestQueue = Promise.resolve<any>(null);

const dropboxApiRequest = async (endpoint: string, argObj: any, method = 'POST') => {
  return new Promise<any>((resolve) => {
    requestQueue = requestQueue.then(async () => {
      const activeToken = await getValidToken();
      if (!activeToken) {
        resolve({ status: 401, data: null });
        return;
      }

      const url = `https://api.dropboxapi.com/2/${endpoint}`;
      
      const headers = {
        'Authorization': `Bearer ${activeToken}`,
        'Content-Type': 'application/json'
      };

      try {
        const res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(argObj)
        });

        if (!res.ok) {
           if (res.status === 409 && endpoint.includes('delete')) {
             // Deleting non-existent file is ok
             resolve({ status: 200, data: true });
             return;
           }
           const text = await res.text();
           console.error(`Dropbox API Error [${endpoint}]:`, res.status, text);
           resolve({ status: res.status, data: null });
           return;
        }

        const json = await res.json();
        resolve({ status: res.status, data: json });
      } catch (e) {
        console.error(`Dropbox Network Error:`, e);
        resolve({ status: 0, data: null });
      }
    }).catch(() => resolve({ status: 0, data: null }));
  });
};

const dropboxContentRequest = async (type: 'download' | 'upload', path: string, bodyObj?: any) => {
  return new Promise<any>((resolve) => {
    requestQueue = requestQueue.then(async () => {
      const activeToken = await getValidToken();
      if (!activeToken) {
        resolve({ status: 401, data: null });
        return;
      }

      const url = `https://content.dropboxapi.com/2/files/${type}`;
      
      let headers: any = {
        'Authorization': `Bearer ${activeToken}`,
      };

      let reqInit: RequestInit = { method: 'POST' };

      if (type === 'download') {
        headers['Dropbox-API-Arg'] = JSON.stringify({ path });
      } else if (type === 'upload') {
        headers['Dropbox-API-Arg'] = JSON.stringify({ path, mode: 'overwrite', strict_conflict: false });
        headers['Content-Type'] = 'application/octet-stream';
        reqInit.body = new Blob([JSON.stringify(bodyObj, null, 2)], { type: 'application/octet-stream' });
      }
      
      reqInit.headers = headers;

      try {
        const res = await fetch(url, reqInit);

        if (type === 'download' && res.status === 409) {
            // File not found (path/not_found)
            resolve({ status: 404, data: null });
            return;
        }

        if (!res.ok) {
           const text = await res.text();
           console.error(`Dropbox Content Error [${type} ${path}]:`, res.status, text);
           NotificationMessage.sendMessage(`Dropbox Error [${type}]: ${res.statusText}`, NotificationColor.Error);
           resolve({ status: res.status, data: null });
           return;
        }
        
        if (type === 'download') {
           const json = await res.json();
           resolve({ status: res.status, data: json });
        } else {
           resolve({ status: res.status, data: true }); // upload success
        }
      } catch (e) {
        console.error(`Dropbox Network Error:`, e);
        resolve({ status: 0, data: null });
      }
    }).catch(() => resolve({ status: 0, data: null }));
  });
};

export const DropboxStorageProvider: GranularStorageProvider = {
  id: 'dropbox',
  name: 'Dropbox',
  
  isConfigured: () => {
    const { token, refreshToken } = getConfig();
    return !!(token || refreshToken);
  },

  readStats: async () => {
    const fullPath = `${getConfig().basePath}/app_stats.json`;
    const res = await dropboxContentRequest('download', fullPath);
    return res?.data;
  },

  writeStats: async (stats: any) => {
    const fullPath = `${getConfig().basePath}/app_stats.json`;
    const res = await dropboxContentRequest('upload', fullPath, stats);
    return !!res?.data;
  },

  listCategory: async (category: string) => {
    const fullPath = `${getConfig().basePath}/${category}/list.json`;
    const res = await dropboxContentRequest('download', fullPath);
    return res?.data;
  },

  writeCategoryList: async (category: string, listData: any[]) => {
    const fullPath = `${getConfig().basePath}/${category}/list.json`;
    const res = await dropboxContentRequest('upload', fullPath, listData);
    return !!res?.data;
  },

  readItem: async (category: string, id: string) => {
    const fullPath = `${getConfig().basePath}/${category}/${id}.json`;
    const res = await dropboxContentRequest('download', fullPath);
    return res?.data;
  },

  writeItem: async (category: string, id: string, data: any) => {
    const fullPath = `${getConfig().basePath}/${category}/${id}.json`;
    const res = await dropboxContentRequest('upload', fullPath, data);
    return !!res?.data;
  },

  deleteItem: async (category: string, id: string) => {
    const fullPath = `${getConfig().basePath}/${category}/${id}.json`;
    const res = await dropboxApiRequest('files/delete_v2', { path: fullPath });
    return !!res?.data;
  }
};
