import { GranularStorageProvider } from './cloud-storage.interface';
import { NotificationMessage, NotificationColor } from 'lupine.components';

/**
 * Helper cache to store file SHAs. 
 * Expected shape: { "notes/list.json": "xxxabc123", "notes/81923.json": "yyyabc123" }
 */
const shaCache: Record<string, string> = {};

const getConfig = () => ({
  token: localStorage.getItem('github_sync_token'),
  owner: localStorage.getItem('github_sync_owner'),
  repo: localStorage.getItem('github_sync_repo'),
  basePath: localStorage.getItem('github_sync_path') || 'lupine_data_v2',
});

// Mutex queue to prevent 409 concurrent commit conflicts on GitHub API
let requestQueue = Promise.resolve<any>(null);

const githubRequest = async (pathSuffix: string, method: 'GET' | 'PUT' | 'DELETE', bodyObj?: any) => {
  return new Promise<any>((resolve) => {
    requestQueue = requestQueue.then(async () => {
      const { token, owner, repo, basePath } = getConfig();
      if (!token || !owner || !repo) {
        resolve(null);
        return;
      }

      const fullPath = `${basePath}/${pathSuffix}`;
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };

      try {
        const reqInit: RequestInit = { method, headers };
        
        if (bodyObj) {
          if (shaCache[fullPath]) {
            bodyObj.sha = shaCache[fullPath];
          }
          reqInit.body = JSON.stringify(bodyObj);
        }

        const res = await fetch(url, reqInit);
        if (res.status === 404) {
          resolve({ status: 404, data: null });
          return;
        }
        
        if ((res.status === 409 || res.status === 422) && method === 'PUT') {
          // File likely exists but we are missing the SHA because of lazy-fetching
          const getReq = await fetch(url, { method: 'GET', headers });
          if (getReq.ok) {
            const getJson = await getReq.json();
            shaCache[fullPath] = getJson.sha;
            
            if (bodyObj) {
              bodyObj.sha = getJson.sha;
              const retryReqInit: RequestInit = { method, headers, body: JSON.stringify(bodyObj) };
              const retryRes = await fetch(url, retryReqInit);
              
              if (retryRes.ok) {
                const retryJson = await retryRes.json();
                shaCache[fullPath] = retryJson.content?.sha;
                resolve({ status: retryRes.status, data: true });
                return;
              }
            }
          }
        }

        if (!res.ok) {
            NotificationMessage.sendMessage(`GitHub API Error [${method} ${fullPath}]: ${res.status} ${res.statusText}`, NotificationColor.Error);
            resolve({ status: res.status, data: null });
            return;
        }

        const json = await res.json();
        
        // Save the SHA for future PUTs
        if (method === 'GET') {
          shaCache[fullPath] = json.sha;
          const decodedContent = decodeURIComponent(escape(atob(json.content)));
          resolve({ status: res.status, data: JSON.parse(decodedContent) });
        } else {
          // For PUTs, the new SHA is in json.content.sha
          shaCache[fullPath] = json.content?.sha;
          resolve({ status: res.status, data: true });
        }
      } catch (e) {
        console.error(`GitHub Network Error:`, e);
        resolve({ status: 0, data: null });
      }
    }).catch((e) => {
      console.error('Queue Error', e);
      resolve({ status: 0, data: null });
    });
  });
};
// (deleted content)

export const GitHubStorageProvider: GranularStorageProvider = {
  id: 'github',
  name: 'GitHub Repository',
  
  isConfigured: () => {
    const { token, owner, repo } = getConfig();
    return !!(token && owner && repo);
  },

  readStats: async () => {
    const res = await githubRequest('app_stats.json', 'GET');
    return res?.data;
  },

  writeStats: async (stats: any) => {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(stats, null, 2))));
    const res = await githubRequest('app_stats.json', 'PUT', {
      message: 'Update app metadata details',
      content: encoded
    });
    return !!res?.data;
  },

  listCategory: async (category: string) => {
    const res = await githubRequest(`${category}/list.json`, 'GET');
    return res?.data;
  },

  writeCategoryList: async (category: string, listData: any[]) => {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(listData, null, 2))));
    const res = await githubRequest(`${category}/list.json`, 'PUT', {
      message: `Update ${category} list`,
      content: encoded
    });
    return !!res?.data;
  },

  readItem: async (category: string, id: string) => {
    const res = await githubRequest(`${category}/${id}.json`, 'GET');
    return res?.data;
  },

  writeItem: async (category: string, id: string, data: any) => {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const res = await githubRequest(`${category}/${id}.json`, 'PUT', {
      message: `Update ${category} item ${id}`,
      content: encoded
    });
    return !!res?.data;
  },

  deleteItem: async (category: string, id: string) => {
    const fullPath = `${getConfig().basePath}/${category}/${id}.json`;
    
    // Pass delete down the same requestQueue so it doesn't conflict
    return new Promise<boolean>((resolve) => {
        requestQueue = requestQueue.then(async () => {
            let currentSha = shaCache[fullPath];
            const { owner, repo, token } = getConfig();
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`;
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
            };

            // If we don't know the SHA natively, we must fetch it first
            if (!currentSha) {
                const getReq = await fetch(url, { method: 'GET', headers });
                if (getReq.ok) {
                    currentSha = (await getReq.json()).sha;
                    shaCache[fullPath] = currentSha;
                } else {
                    resolve(false); // Can't delete what doesn't exist remotely
                    return;
                }
            }

            const reqInit = {
                method: 'DELETE',
                headers,
                body: JSON.stringify({
                    message: `Delete ${category} item ${id}`,
                    sha: currentSha
                })
            };
            
            try {
                const res = await fetch(url, reqInit);
                if (res.ok) {
                    delete shaCache[fullPath];
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch(e) {
                resolve(false);
            }
        }).catch(() => resolve(false));
    });
  }
};
