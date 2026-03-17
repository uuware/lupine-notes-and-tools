import { NotificationColor, NotificationMessage } from 'lupine.components';
import { GranularStorageProvider } from './cloud-storage.interface';
import { LocalStorageProvider } from './local-provider';
import { GitHubStorageProvider } from './github-provider';
import { DropboxStorageProvider } from './dropbox-provider';
import { GoogleDriveStorageProvider } from './google-provider';
import { OneDriveStorageProvider } from './onedrive-provider';

// Simplified local structure for fast rendering (App Stats + List Arrays)
export interface GlobalDataCache {
  stats: any;
  notesList: any[];
  diariesList: any[];
  financesList: any[];
  toolsList: any[];
}

class GranularStorageManagerCls {
  private activeProvider: GranularStorageProvider = LocalStorageProvider;
  private cache: GlobalDataCache | null = null;
  private syncTimers: Record<string, any> = {};
  private initPromise: Promise<void> | null = null;

  public readonly providers: Record<string, GranularStorageProvider> = {
    local: LocalStorageProvider,
    github: GitHubStorageProvider,
    dropbox: DropboxStorageProvider,
    gdrive: GoogleDriveStorageProvider,
    onedrive: OneDriveStorageProvider,
  };

  /**
   * Initializes basic App Stats and the `list.json` for all 4 categories.
   * Does NOT fetch huge content bodies (like note contents).
   */
  async initialize(force: boolean = false): Promise<void> {
    if (force) {
      this.initPromise = null;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const savedProviderId = localStorage.getItem('active_storage_provider') || 'local';
      const provider = this.providers[savedProviderId] || LocalStorageProvider;
      
      if (provider.isConfigured()) {
        this.activeProvider = provider;
      } else {
        console.warn(`Provider ${savedProviderId} is not configured. Falling back to local.`);
        this.activeProvider = LocalStorageProvider;
      }

      try {
        NotificationMessage.sendMessage(`Syncing Lists from ${this.activeProvider.name}...`, NotificationColor.Success);
        
        const stats = await this.activeProvider.readStats() || {};
        const notesList = await this.activeProvider.listCategory('notes') || [];
        const diariesList = await this.activeProvider.listCategory('diaries') || [];
        const financesList = await this.activeProvider.listCategory('finances') || [];
        const toolsList = await this.activeProvider.listCategory('tools') || [];

        this.cache = {
          stats,
          notesList,
          diariesList,
          financesList,
          toolsList
        };
      } catch (e) {
        console.error('Failed to load initial data from provider', e);
        NotificationMessage.sendMessage(`Failed to load data from ${this.activeProvider.name}`, NotificationColor.Error);
        this.cache = this.createEmptyCache();
      }
    })();

    return this.initPromise;
  }

  async waitForInit(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    return this.initialize();
  }

  async switchProvider(providerId: string): Promise<boolean> {
    const provider = this.providers[providerId];
    if (!provider || !provider.isConfigured()) {
      NotificationMessage.sendMessage('Requested provider is invalid or not configured.', NotificationColor.Error);
      return false;
    }
    
    localStorage.setItem('active_storage_provider', providerId);
    this.activeProvider = provider;
    this.initPromise = null; // Clear promise to force re-fetch
    await this.initialize();
    return true;
  }
  
  getActiveProvider(): GranularStorageProvider {
    return this.activeProvider;
  }

  // --- Synchronous Getters for fast List Rendering ---

  getStats() {
    return this.cache?.stats || {};
  }
  
  getCategoryList(category: keyof Omit<GlobalDataCache, 'stats'>): any[] {
    return this.cache?.[category] || [];
  }

  // --- Asynchronous Reading & Writing for Granular Items ---
  // Any Component accessing detailed content (e.g. NoteEditor) MUST now await this method

  async readItem(category: string, id: string): Promise<any | null> {
      try {
          return await this.activeProvider.readItem(category, id);
      } catch (e) {
          console.error(`Failed to lazy-fetch item [${category}: ${id}]`, e);
          return null;
      }
  }

  /**
   * Updates an item's specific data file chunks.
   * Modifies the list cache in RAM automatically and triggers debounced API uploads
   * for BOTH the updated item itself and the master `list.json`.
   */
  async saveItem(category: string, listCacheKey: keyof Omit<GlobalDataCache, 'stats'>, item: any, listMetadata: any, immediate: boolean = false) {
    if (!this.cache) this.cache = this.createEmptyCache();
    
    // Update local list RAM cache
    const list = this.cache[listCacheKey];
    const existingIndex = list.findIndex(e => e.id === item.id);
    if (existingIndex >= 0) {
        list[existingIndex] = listMetadata; // Update list preview/metadata
    } else {
        list.push(listMetadata); // New item added to list
    }
    
    // Auto-sync category list
    const p1 = this.triggerSync(`${category}_list`, async () => {
        await this.activeProvider.writeCategoryList(category, list);
    }, immediate);

    // Auto-sync item content directly
    const p2 = this.triggerSync(`${category}_item_${item.id}`, async () => {
        const success = await this.activeProvider.writeItem(category, item.id, item);
        if (!success) {
            NotificationMessage.sendMessage(`Failed to save ${item.title || item.id} to cloud.`, NotificationColor.Error);
        }
    }, immediate);
    
    await Promise.all([p1, p2]);
  }

  /**
   * Triggers a specific background sync using an isolated timer key.
   * This ensures rapidly updating an item and a list separately do not stomp on each other's timers.
   */
  private triggerSync(timerKey: string, uploadFn: () => Promise<void>, immediate: boolean = false): Promise<void> {
    if (this.syncTimers[timerKey]) {
      clearTimeout(this.syncTimers[timerKey]);
      delete this.syncTimers[timerKey];
    }
    
    if (immediate) {
      return uploadFn().catch(err => console.error('Immediate Sync Failed', err));
    } else {
      this.syncTimers[timerKey] = setTimeout(async () => {
        try {
          await uploadFn();
        } catch (err) {
          console.error('Granular Background Sync Failed', err);
        }
      }, 2000); // 2 second debounce per unique action
      return Promise.resolve();
    }
  }

  private createEmptyCache(): GlobalDataCache {
    return {
      stats: {},
      notesList: [],
      diariesList: [],
      financesList: [],
      toolsList: []
    };
  }
}

export const StorageManager = new GranularStorageManagerCls();
